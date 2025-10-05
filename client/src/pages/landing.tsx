import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Sparkles, Users, Shield, Zap, CheckCircle, Mail, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FaGoogle } from "react-icons/fa";
import { EmailSignup } from "@/components/auth/EmailSignup.tsx";
import { EmailLogin } from "@/components/auth/EmailLogin.tsx";
import { LoadingScreen, PageTransition } from "@/components/ui/loading-screen";
import { Link } from "wouter";

export default function Landing() {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setLoadingMessage("Connecting to Google...");
    window.location.href = "/api/login";
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setLoadingMessage("Setting up your guest session...");
    
    try {
      const response = await fetch('/api/login/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setLoadingMessage("Welcome! Redirecting to your workspace...");
        // Refresh the page to update authentication state
        window.location.reload();
      } else {
        console.error('Guest login failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Guest login error:', error);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = () => {
    setShowAuthDialog(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    setIsLoading(true);
    setLoadingMessage("Welcome! Setting up your workspace...");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted relative">
      {/* Loading Screen Overlay */}
      {isLoading && (
        <LoadingScreen 
          message={loadingMessage}
          submessage="We're preparing your passport photo workspace..."
          show={true}
        />
      )}
      
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-b border-border/50 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-primary p-2 rounded-xl shadow-primary">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Passport Photo Creator
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Button 
                onClick={handleGuestLogin} 
                variant="outline" 
                size="sm"
                className="border-primary/30 hover:bg-primary/10 text-xs sm:text-sm px-3 py-2"
              >
                <span className="hidden sm:inline">Continue as </span>Guest
              </Button>
              <Button 
                onClick={handleEmailAuth} 
                variant="outline" 
                size="sm"
                className="border-primary/30 hover:bg-primary/10 text-xs sm:text-sm px-3 py-2"
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Email
              </Button>
              <Button 
                onClick={handleGoogleLogin} 
                size="sm"
                className="bg-gradient-primary hover:shadow-primary transition-all text-xs sm:text-sm px-3 py-2"
              >
                <FaGoogle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Google
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="inline-block bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full mb-4">
              <span className="text-primary font-medium text-sm flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                AI-Powered Photo Processing
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-6 leading-tight">
              Professional Passport Photos
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                In Minutes
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto px-4">
              Create perfect passport photos with AI background removal, custom sizing, and professional layouts. 
              Save time and money with our automated photo processing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-2xl mx-auto px-4">
              <Button 
                onClick={handleGoogleLogin} 
                size="lg" 
                className="bg-gradient-primary hover:shadow-primary transition-all px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
              >
                <FaGoogle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                Get Started with Google
              </Button>
              <Button 
                onClick={() => { setAuthMode('signup'); handleEmailAuth(); }} 
                size="lg" 
                variant="outline"
                className="border-primary/30 hover:bg-primary/10 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                Create Account
              </Button>
              <Button 
                onClick={handleGuestLogin} 
                size="lg" 
                variant="ghost"
                className="hover:bg-primary/5 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
              >
                Try as Guest
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm shadow-card dark:shadow-slate-900/50">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-primary p-4 rounded-2xl w-16 h-16 mx-auto mb-6 shadow-primary">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-slate-100">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Upload your photo and get professional results in seconds. No waiting, no delays.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm shadow-card dark:shadow-slate-900/50">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-primary p-4 rounded-2xl w-16 h-16 mx-auto mb-6 shadow-primary">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-slate-100">AI Background Removal</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Automatically remove backgrounds and add custom colors for perfect passport photos.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm shadow-card dark:shadow-slate-900/50">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-primary p-4 rounded-2xl w-16 h-16 mx-auto mb-6 shadow-primary">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-slate-100">Secure & Private</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Your photos are processed securely and stored safely. Delete anytime with one click.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <div className="bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-12 shadow-card dark:shadow-slate-900/50">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-slate-100">
            Everything You Need for Perfect Photos
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {[
                "Multiple standard sizes (35x45mm, 51x51mm, etc.)",
                "Custom photo dimensions and quantities",
                "Professional black borders and spacing",
                "Real-time preview with instant feedback"
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-gray-700 dark:text-slate-300">{feature}</p>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              {[
                "Save custom presets for future use",
                "Download as PDF, PNG, or JPG formats",
                "Crop and position tools for perfect framing",
                "History of all your processed photos"
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-gray-700 dark:text-slate-300">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-slate-100">
            Ready to Create Professional Photos?
          </h2>
          <p className="text-xl text-gray-600 dark:text-slate-400 mb-8">
            Join thousands of users who trust our AI-powered photo processing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleGoogleLogin} 
              size="lg" 
              className="bg-gradient-primary hover:shadow-primary transition-all px-8 py-4 text-lg"
            >
              <FaGoogle className="h-5 w-5 mr-3" />
              Sign in with Google
            </Button>
            
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 text-center max-w-md mx-auto">
              <p>If you see "This app isn't verified" or "blocked by Google's policies", click "Advanced" → "Go to workspace.jijosem565.repl.co (unsafe)" to continue.</p>
            </div>
            <Button 
              onClick={() => { setAuthMode('login'); handleEmailAuth(); }} 
              size="lg" 
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 px-8 py-4 text-lg"
            >
              <Mail className="h-5 w-5 mr-3" />
              Sign in with Email
            </Button>
            <Button 
              onClick={handleGuestLogin} 
              size="lg" 
              variant="ghost"
              className="hover:bg-primary/5 px-8 py-4 text-lg"
            >
              Try as Guest
            </Button>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border/50 dark:border-slate-700/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 dark:text-slate-500">
            <p>&copy; 2025 Passport Photo Creator. Professional photos made simple.</p>
            <div className="mt-4">
              <Link href="/privacy-policy">
                <a data-testid="link-privacy-policy" className="text-primary hover:text-primary/80 underline transition-colors">
                  Privacy Policy
                </a>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[500px] p-0">
          <div className="p-6">
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl font-bold">Join Passport Photo Maker</DialogTitle>
            </DialogHeader>
            
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                <EmailLogin 
                  onSuccess={handleAuthSuccess}
                  onSwitchToSignup={() => setAuthMode('signup')}
                />
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <EmailSignup 
                  onSuccess={handleAuthSuccess}
                  onSwitchToLogin={() => setAuthMode('login')}
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-center my-6">
              <div className="border-t border-border flex-grow"></div>
              <span className="px-4 text-sm text-muted-foreground">or</span>
              <div className="border-t border-border flex-grow"></div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleGoogleLogin} 
                variant="outline" 
                className="w-full border-primary/30 hover:bg-primary/10"
              >
                <FaGoogle className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>
              
              <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 text-center">
                <p>If blocked by Google, click "Advanced" → "Go to workspace.jijosem565.repl.co (unsafe)"</p>
              </div>
              
              <Button 
                onClick={handleGuestLogin} 
                variant="ghost" 
                className="w-full hover:bg-primary/5"
              >
                Continue as Guest
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}