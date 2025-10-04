import { useState, useEffect } from 'react';

export function usePageTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [message, setMessage] = useState('');

  const startTransition = (transitionMessage: string) => {
    setMessage(transitionMessage);
    setIsTransitioning(true);
  };

  const endTransition = () => {
    setIsTransitioning(false);
    setMessage('');
  };

  // Auto-end transition after 5 seconds to prevent getting stuck
  useEffect(() => {
    if (isTransitioning) {
      const timeout = setTimeout(() => {
        endTransition();
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning]);

  return {
    isTransitioning,
    message,
    startTransition,
    endTransition
  };
}