import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { secretsManager } from "./secretsManager";

// Force reload secrets to ensure Google OAuth credentials are available
secretsManager.initializeWithDefaults();

// Check for Google OAuth credentials from both secrets and environment
const googleClientId = secretsManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = secretsManager.getSecret('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;

const hasGoogleAuth = googleClientId && googleClientSecret;

if (hasGoogleAuth) {
  console.log('✅ Google OAuth credentials found - Google authentication enabled');
  console.log('   Client ID:', googleClientId ? 'configured' : 'missing');
  console.log('   Client Secret:', googleClientSecret ? 'configured' : 'missing');
} else {
  console.log('ℹ️ Google OAuth credentials not found - Google authentication will be disabled');
  console.log('   Client ID from env:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('   Client Secret from env:', !!process.env.GOOGLE_CLIENT_SECRET);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Get DATABASE_URL from environment or secrets manager
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    databaseUrl = secretsManager.getSecret('DATABASE_URL');
  }

  if (databaseUrl) {
    try {
      const pgStore = connectPg(session);
      const sessionStore = new pgStore({
        conString: databaseUrl,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions",
      });
      return session({
        secret: secretsManager.getSecret('SESSION_SECRET') || process.env.SESSION_SECRET || 'fallback-secret-key',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: false, // Force non-secure cookies for development
          maxAge: sessionTtl,
          sameSite: 'lax',
        },
      });
    } catch (error) {
      console.log('⚠️  PostgreSQL session store failed, falling back to memory store');
    }
  }

  // Fallback to memory store when database is not available
  return session({
    secret: secretsManager.getSecret('SESSION_SECRET') || process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Force non-secure cookies for development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up Passport serialization for all authentication types
  passport.serializeUser((user: any, done) => {
    // Handle both regular users and guest users
    if (user && user.id) {
      done(null, user.id);
    } else {
      console.error('User serialization failed - no ID:', user);
      done(new Error('User object must have an id property'), null);
    }
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      // Try to get user from database first (works for both guest and regular users)
      const user = await storage.getUser(id);
      if (user) {
        return done(null, user);
      }

      // If guest user not found in database (legacy sessions), create and save them
      if (id.startsWith('guest_')) {
        console.log('Creating missing guest user in database:', id);
        try {
          const guestUserData = {
            id,
            email: null,
            firstName: "Guest",
            lastName: "User",
            profileImageUrl: null,
            isGuest: true,
            authProvider: 'guest' as const,
            isEmailVerified: false,
            passwordHash: null
          };
          
          const guestUser = await storage.createUser(guestUserData);
          return done(null, guestUser);
        } catch (createError) {
          console.error('Failed to create guest user:', createError);
          // Return a session-only guest user as fallback
          const fallbackGuestUser = {
            id,
            email: null,
            firstName: "Guest",
            lastName: "User",
            profileImageUrl: null,
            isGuest: true
          };
          return done(null, fallbackGuestUser);
        }
      }

      // User not found
      done(null, null);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error, null);
    }
  });

  // Only configure Google OAuth strategy if credentials are available
  if (hasGoogleAuth) {
    // Auto-detect current Replit URL from environment
    let replitAppUrl = secretsManager.getSecret('REPLIT_APP_URL');
    
    if (!replitAppUrl) {
      // Try to detect from REPLIT_DOMAINS environment variable
      const replitDomains = process.env.REPLIT_DOMAINS;
      if (replitDomains) {
        // REPLIT_DOMAINS can contain multiple domains, use the first one
        const domain = replitDomains.split(',')[0].trim();
        replitAppUrl = `https://${domain}`;
        console.log('🔧 Auto-detected Replit URL:', replitAppUrl);
        // Save the detected URL for future use
        secretsManager.setSecret('REPLIT_APP_URL', replitAppUrl);
      } else {
        // Fallback URL (this should rarely be used)
        replitAppUrl = 'https://627846c6-9a01-430d-ad44-d2681f586ed6-00-3fa36lqk65xc4.pike.replit.dev';
        console.log('⚠️ Using fallback Replit URL:', replitAppUrl);
      }
    }
    
    passport.use(new GoogleStrategy({
      clientID: googleClientId!,
      clientSecret: googleClientSecret!,
      callbackURL: `${replitAppUrl}/auth/google/callback`
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'), null);
      }

      // Check if user already exists with this email
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // User exists - update their profile with Google data and change auth provider
        user = await storage.updateUser(user.id, {
          firstName: profile.name?.givenName || user.firstName,
          lastName: profile.name?.familyName || user.lastName,
          profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
          authProvider: 'google'
        });
        console.log('✅ Existing user logged in via Google:', user.email);
      } else {
        // Create new user with proper UUID
        const userData = {
          email: email,
          firstName: profile.name?.givenName || 'User',
          lastName: profile.name?.familyName || '',
          profileImageUrl: profile.photos?.[0]?.value || null,
          isGuest: false,
          authProvider: 'google' as const,
          isEmailVerified: true, // Google emails are pre-verified
          passwordHash: null
        };

        user = await storage.createUser(userData);
        console.log('✅ New user created via Google:', user.email);
      }
      
      return done(null, { 
        ...user,
        accessToken,
        refreshToken 
      });
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error, null);
    }
  }));

    // Google OAuth routes (only if Google Auth is enabled)
    app.get("/api/login", 
      passport.authenticate("google", { 
        scope: ["profile", "email"] 
      })
    );

    app.get("/auth/google/callback",
      passport.authenticate("google", { 
        failureRedirect: "/?error=auth_failed" 
      }),
      (req, res) => {
        // Successful authentication, redirect to home
        res.redirect("/");
      }
    );
  } else {
    // Fallback routes when Google Auth is disabled
    app.get("/api/login", (req, res) => {
      res.status(503).json({ 
        message: "Google authentication is not configured",
        error: "GOOGLE_AUTH_DISABLED"
      });
    });
  }

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect("/");
    });
  });

  // Guest login endpoint
  app.post("/api/login/guest", async (req, res) => {
    try {
      // Create a guest user and save to database
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const guestUserData = {
        id: guestId,
        email: `${guestId}@guest.local`, // Use unique email to avoid constraint violation
        firstName: "Guest",
        lastName: "User",
        profileImageUrl: null,
        isGuest: true,
        authProvider: 'guest' as const,
        isEmailVerified: false,
        passwordHash: null
      };

      // Save guest user to database
      const guestUser = await storage.createUser(guestUserData);
      console.log('Guest user created in database:', guestUser.id);

      req.login(guestUser, (err) => {
        if (err) {
          console.error('Guest login error:', err);
          return res.status(500).json({ message: "Guest login failed" });
        }
        console.log('Guest login successful, session established for:', guestUser.id);
        res.json({ success: true, user: guestUser });
      });
    } catch (error) {
      console.error('Guest user creation error:', error);
      res.status(500).json({ message: "Guest login failed" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  console.log('isAuthenticated check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: (req.user as any)?.id,
    sessionID: req.sessionID
  });
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};