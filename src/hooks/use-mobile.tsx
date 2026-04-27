import { useState, useEffect } from 'react';

export function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const narrowViewport = window.innerWidth < 768;
  const touchDevice = navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  return narrowViewport && touchDevice;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(checkIsMobile);
  useEffect(() => {
    const handler = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}
