import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import { EmailService } from './emailService';
import { db } from './db';
import { pendingRegistrations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { EmailSignup, EmailLogin, User } from '@shared/schema';

export class EmailAuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Register new user with email
  static async registerUser(signupData: EmailSignup): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Check if user already exists (verified user)
      const existingUser = await storage.getUserByEmail(signupData.email);
      if (existingUser && existingUser.isEmailVerified) {
        return { success: false, message: 'An account with this email already exists' };
      }
      
      // If there's an unverified account, allow re-registration by deleting it
      if (existingUser && !existingUser.isEmailVerified) {
        // Delete the unverified user and any pending verification codes
        await storage.updateUser(existingUser.id, { email: `deleted_${existingUser.id}@temp.com` });
        console.log('Removed unverified account for re-registration:', signupData.email);
      }

      // Hash the password
      const passwordHash = await this.hashPassword(signupData.password);

      // Generate verification code
      const verificationCode = EmailService.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store pending registration (NOT creating user account yet)
      await storage.savePendingRegistration({
        email: signupData.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        passwordHash,
        verificationCode,
        expiresAt,
      });

      // Send verification email
      const emailSent = await EmailService.sendVerificationEmail(signupData.email, verificationCode);
      
      if (!emailSent) {
        return { success: false, message: 'Failed to send verification email. Please try again.' };
      }

      return { 
        success: true, 
        message: 'Please check your email for the verification code to complete registration.',
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  // Verify email with code
  static async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Find valid pending registration
      const pendingRegistration = await storage.getPendingRegistration(email, code);
      if (!pendingRegistration) {
        return { success: false, message: 'Invalid or expired verification code' };
      }

      // Create the actual user account now that email is verified
      const user = await storage.createUser({
        id: randomUUID(),
        email: pendingRegistration.email,
        firstName: pendingRegistration.firstName,
        lastName: pendingRegistration.lastName,
        passwordHash: pendingRegistration.passwordHash,
        authProvider: 'email',
        isEmailVerified: true, // Already verified
        isGuest: false,
      });

      // Clean up pending registration
      await storage.deletePendingRegistration(email);

      // Send welcome email
      await EmailService.sendWelcomeEmail(email, user.firstName || 'User');

      return { 
        success: true, 
        message: 'Email verified successfully! Welcome to Passport Photo Maker.',
        user 
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'Verification failed. Please try again.' };
    }
  }

  // Resend verification code
  static async resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if there's a verified user with this email
      const user = await storage.getUserByEmail(email);
      if (user && user.isEmailVerified) {
        return { success: false, message: 'This email is already verified' };
      }

      // Check if there's a pending registration
      const existingPending = await storage.getPendingRegistration(email, ''); // Just to check if email exists in pending
      if (!existingPending) {
        // If no pending registration found, try with a dummy code to get any matching record
        const [pendingReg] = await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email));
        if (!pendingReg) {
          return { success: false, message: 'No registration found for this email. Please sign up first.' };
        }
      }

      // Generate new verification code and update the pending registration
      const verificationCode = EmailService.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Get the existing pending registration to preserve other data
      const [existingReg] = await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email));
      if (existingReg) {
        await storage.savePendingRegistration({
          email: existingReg.email,
          firstName: existingReg.firstName,
          lastName: existingReg.lastName,
          passwordHash: existingReg.passwordHash,
          verificationCode,
          expiresAt,
        });
      }

      // Send verification email
      const emailSent = await EmailService.sendVerificationEmail(email, verificationCode);
      
      if (!emailSent) {
        return { success: false, message: 'Failed to send verification email. Please try again.' };
      }

      return { 
        success: true, 
        message: 'New verification code sent! Please check your email.' 
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, message: 'Failed to resend verification code. Please try again.' };
    }
  }

  // Login user
  static async loginUser(loginData: EmailLogin): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      console.log('Looking up user by email:', loginData.email);
      
      // Find user by email
      const user = await storage.getUserByEmail(loginData.email);
      console.log('User found:', !!user, user ? `ID: ${user.id}, Provider: ${user.authProvider}, Verified: ${user.isEmailVerified}` : 'none');
      
      if (!user) {
        return { success: false, message: 'No account found with this email. Please sign up first.' };
      }
      
      if (user.authProvider !== 'email') {
        return { success: false, message: 'This email is registered with a different sign-in method.' };
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return { success: false, message: 'Please verify your email before logging in. Check your inbox for the verification code.' };
      }

      // Verify password
      if (!user.passwordHash) {
        console.log('User has no password hash');
        return { success: false, message: 'Invalid email or password' };
      }

      const passwordValid = await this.verifyPassword(loginData.password, user.passwordHash);
      console.log('Password valid:', passwordValid);
      
      if (!passwordValid) {
        return { success: false, message: 'Invalid email or password' };
      }

      return { 
        success: true, 
        message: 'Login successful!',
        user 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  // Clean up expired verification codes (should be called periodically)
  static async cleanupExpiredVerifications(): Promise<void> {
    try {
      await storage.deleteExpiredVerifications();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}