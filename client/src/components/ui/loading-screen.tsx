import { useEffect, useState } from 'react';
import { Loader2, Camera, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  show?: boolean;
}

export function LoadingScreen({ 
  message = "Loading...", 
  submessage = "Please wait while we prepare everything for you",
  show = true 
}: LoadingScreenProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!show) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 dark:from-gray-900 dark:via-gray-800 dark:to-black loading-fade-in">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white/20 rounded-full animate-float delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-white/30 rounded-full animate-float delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white/40 rounded-full animate-float delay-3000"></div>
        <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-white/15 rounded-full animate-float delay-500"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:50px_50px] animate-pulse"></div>
      </div>

      {/* Main loading content */}
      <div className="relative z-10 text-center px-8 max-w-md w-full">
        {/* Logo/Icon area */}
        <div className="mb-8">
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Rotating outer ring */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white border-r-white/50 border-b-white/20 border-l-white/20 rounded-full animate-spin"></div>
            
            {/* Inner content */}
            <div className="absolute inset-3 bg-gradient-to-br from-white/20 to-white/5 rounded-full backdrop-blur-sm flex items-center justify-center">
              <Camera className="w-8 h-8 text-white animate-pulse" />
            </div>
            
            {/* Orbiting sparkles */}
            <div className="absolute inset-0 animate-spin-slow">
              <Sparkles className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 text-yellow-300 animate-pulse" />
              <Sparkles className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 text-blue-300 animate-pulse delay-500" />
              <Sparkles className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-3 h-3 text-pink-300 animate-pulse delay-1000" />
              <Sparkles className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 text-purple-300 animate-pulse delay-1500" />
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Passport Photo Generator
            </span>
          </h2>
          
          <div className="space-y-2">
            <p className="text-xl font-semibold text-white/90">
              {message}{dots}
            </p>
            <p className="text-sm text-white/70 leading-relaxed">
              {submessage}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full animate-loading-bar"></div>
          </div>

          {/* Feature hints */}
          <div className="mt-6 text-xs text-white/50 space-y-1">
            <p>✨ AI-powered background removal</p>
            <p>📏 Professional passport layouts</p>
            <p>🎨 Multiple download formats</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini loading spinner for smaller components
export function LoadingSpinner({ size = 'md', className = '' }: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin opacity-20"></div>
      <div className="absolute inset-1 border-2 border-current border-r-transparent border-b-transparent rounded-full animate-spin-reverse"></div>
      <Loader2 className={`${sizeClasses[size]} animate-pulse`} />
    </div>
  );
}

// Page transition loader
export function PageTransition({ isLoading, message = "Transitioning..." }: { 
  isLoading: boolean; 
  message?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-br from-blue-600/90 to-purple-600/90 backdrop-blur-sm flex items-center justify-center">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full animate-float delay-1000"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-white/15 rounded-full animate-float delay-2000"></div>
        <div className="absolute bottom-20 left-32 w-20 h-20 bg-white/20 rounded-full animate-float delay-3000"></div>
      </div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <LoadingSpinner size="lg" className="text-white" />
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
          </div>
          <p className="text-white font-medium text-lg">{message}</p>
          <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/60 rounded-full animate-loading-bar"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Router loading interceptor
export function NavigationLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMessage, setNavMessage] = useState('');

  useEffect(() => {
    // Intercept link clicks
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        const href = link.href;
        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
        const isApiRoute = href.includes('/api/');
        
        if (isExternal || isApiRoute) {
          setNavMessage(isExternal ? 'Redirecting...' : 'Processing...');
          setIsNavigating(true);
        }
      }
    };

    // Intercept form submissions
    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.method === 'POST' || form.action.includes('/api/')) {
        setNavMessage('Processing...');
        setIsNavigating(true);
      }
    };

    document.addEventListener('click', handleLinkClick);
    document.addEventListener('submit', handleFormSubmit);

    // Reset on page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsNavigating(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('click', handleLinkClick);
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <PageTransition isLoading={isNavigating} message={navMessage} />;
}