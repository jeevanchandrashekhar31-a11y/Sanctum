'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function SanctumLogo() {
  return (
    <div
      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
      style={{ background: 'var(--purple-deep)', color: 'var(--text-on-primary)' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3v18" />
        <path d="M6 9h12" />
      </svg>
    </div>
  );
}

export default function Error({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="flex min-h-dvh items-center justify-center px-5"
      style={{ background: 'var(--surface-page)', color: 'var(--text-primary)' }}
    >
      <section
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 18px 48px rgba(74,50,104,0.14)',
        }}
      >
        <SanctumLogo />
        <h1 className="font-serif text-2xl font-bold">Sanctum paused</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {error.message || 'Something went wrong while loading this screen.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--gold)', color: 'var(--text-on-gold)' }}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
