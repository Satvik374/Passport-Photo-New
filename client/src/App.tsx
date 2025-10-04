import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import PassportGenerator from "@/pages/passport-generator";
import Landing from "@/pages/landing";
import { EmailTest } from "@/components/EmailTest";
import { LoadingScreen, NavigationLoader } from "@/components/ui/loading-screen";

import { useState, useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Prevent page reloads by stabilizing the authentication state
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show loading screen during initial authentication check only
  if (isLoading || isInitialLoad) {
    return (
      <LoadingScreen 
        message="Initializing Application"
        submessage="Setting up your passport photo workspace..."
        show={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/test-email" component={() => (
              <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
                <EmailTest />
              </div>
            )} />
          </>
        ) : (
          <>
            <Route path="/" component={PassportGenerator} />
            <Route path="/test-email" component={() => (
              <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
                <EmailTest />
              </div>
            )} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Initial app loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1500); // Show for 1.5 seconds minimum

    return () => clearTimeout(timer);
  }, []);

  if (isAppLoading) {
    return (
      <LoadingScreen 
        message="Starting Passport Photo Generator"
        submessage="Preparing your professional photo creation workspace..."
        show={true}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <NavigationLoader />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
