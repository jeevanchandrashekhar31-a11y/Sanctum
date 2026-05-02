'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

type SlideId = 'welcome' | 'explore' | 'build';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES: Array<{ id: SlideId; title: string; subtitle: string; illustration: React.ReactNode }> = [
  {
    id: 'welcome',
    title: 'Good Morning',
    subtitle: 'Start each day with purpose',
    illustration: (
      <div className="w-32 h-32 relative">
        <style>{`
          @keyframes sunrise {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {/* Sky gradient */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(180deg, var(--gold) 0%, var(--gold) 30%, transparent 100%)`,
            opacity: 0.2,
            animation: 'sunrise 1s ease-out'
          }}
        />
        {/* Sun */}
        <div 
          className="absolute top-4 left-1/2 w-12 h-12 rounded-full"
          style={{
            background: 'var(--gold)',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 40px var(--gold)',
            animation: 'sunrise 1s ease-out 0.2s both'
          }}
        />
        {/* Rays */}
        {[0, 45, 90, 135].map((angle) => (
          <div
            key={angle}
            className="absolute w-1 h-6"
            style={{
              background: 'var(--gold)',
              left: '50%',
              top: '-8px',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              opacity: 0.3,
              transformOrigin: '0 40px',
              animation: `sunrise 1s ease-out ${0.3 + angle / 200}s both`
            }}
          />
        ))}
      </div>
    ),
  },
  {
    id: 'explore',
    title: 'Explore Scripture',
    subtitle: 'Ask anything about the Bible',
    illustration: (
      <div className="w-32 h-32 relative flex items-center justify-center">
        <style>{`
          @keyframes openBook {
            0% { opacity: 0; transform: scale(0.8) rotateZ(-10deg); }
            100% { opacity: 1; transform: scale(1) rotateZ(0); }
          }
        `}</style>
        {/* Book left page */}
        <div 
          className="absolute w-12 h-16 rounded-l"
          style={{
            background: 'var(--surface-card)',
            border: `1px solid var(--gold)`,
            left: '22px',
            boxShadow: '-4px 4px 12px rgba(0,0,0,0.1)',
            animation: 'openBook 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both'
          }}
        >
          <div className="p-2 h-full flex flex-col gap-1">
            <div className="h-1 bg-gold opacity-40 rounded" style={{ width: '70%' }} />
            <div className="h-0.5 bg-text-muted opacity-20 rounded" />
            <div className="h-0.5 bg-text-muted opacity-20 rounded" style={{ width: '80%' }} />
          </div>
        </div>
        {/* Book right page */}
        <div 
          className="absolute w-12 h-16 rounded-r"
          style={{
            background: 'var(--surface-card)',
            border: `1px solid var(--gold)`,
            right: '22px',
            boxShadow: '4px 4px 12px rgba(0,0,0,0.1)',
            animation: 'openBook 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both'
          }}
        >
          <div className="p-2 h-full flex flex-col gap-1">
            <div className="h-1 bg-gold opacity-40 rounded" style={{ width: '60%' }} />
            <div className="h-0.5 bg-text-muted opacity-20 rounded" />
            <div className="h-0.5 bg-text-muted opacity-20 rounded" style={{ width: '75%' }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'build',
    title: 'Build the Habit',
    subtitle: 'Track your streak, grow your faith',
    illustration: (
      <div className="w-32 h-32 relative flex items-center justify-center">
        <style>{`
          @keyframes flameBounce {
            0%, 100% { opacity: 1; transform: translateY(0) scale(1); }
            50% { opacity: 0.8; transform: translateY(-8px) scale(1.1); }
          }
        `}</style>
        {/* Flame */}
        <span 
          className="text-6xl inline-block"
          style={{
            animation: 'flameBounce 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px rgba(255,107,53,0.6))'
          }}
        >
          🔥
        </span>
        {/* Circle background */}
        <div 
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: 'var(--gold)',
            animation: 'flameBounce 1.5s ease-in-out infinite'
          }}
        />
      </div>
    ),
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      localStorage.setItem('sanctum-onboarded', 'true');
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  return (
    <div
      className="flex flex-col h-full min-h-0 w-full relative"
      style={{
        background: 'var(--surface-page)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 text-center gap-8">
        {/* Illustration */}
        <div style={{ animation: 'fadeInUp 0.5s ease-out' }}>
          {slide.illustration}
        </div>

        {/* Text */}
        <div style={{ animation: 'slideInLeft 0.5s ease-out 0.1s both' }}>
          <h1 
            className="text-3xl font-bold mb-2 font-serif"
            style={{ color: 'var(--text-primary)' }}
          >
            {slide.title}
          </h1>
          <p
            className="text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Dots & Button */}
      <div className="flex flex-col items-center gap-6 px-6 pb-8">
        {/* Dot indicators */}
        <div className="flex gap-2" role="tablist" aria-label="Slide indicators">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={index === currentSlide}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: index === currentSlide ? 'var(--gold)' : 'var(--surface-subtle)',
                width: index === currentSlide ? '24px' : '8px',
              }}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="w-full min-h-12 flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all active:scale-95"
          style={{
            background: 'var(--gold)',
            color: 'var(--text-on-gold)',
            boxShadow: '0 6px 24px rgba(212,168,67,0.3)',
          }}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
