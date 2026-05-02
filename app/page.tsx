'use client';

import { useState, useEffect } from 'react';
import AppWrapper from "@/components/app-wrapper";
import Onboarding from "@/components/onboarding";

export default function Page() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sanctum-onboarded') !== 'true';
  });
  const [mounted, setMounted] = useState(false);
  const [animateMainApp, setAnimateMainApp] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setAnimateMainApp(true);
  };

  if (!mounted) return null;

  return (
    <main className="mobile-stage">
      <style>{`
        @keyframes sanctumMainEnter {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="mobile-viewport">
        {showOnboarding ? (
          <Onboarding onComplete={handleOnboardingComplete} />
        ) : (
          <div
            className="h-full min-h-0"
            style={animateMainApp ? { animation: 'sanctumMainEnter 400ms ease-out both' } : undefined}
          >
            <AppWrapper />
          </div>
        )}
      </div>
    </main>
  );
}
