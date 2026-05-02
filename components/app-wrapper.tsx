'use client';

import { useState, useEffect } from 'react';
import DevotionalCard from './devotional-card';
import BibleChat from './bible-chat';
import PrayerJournal from './prayer-journal';
import HabitTracker from './habit-tracker';
import PrayerWall from './prayer-wall';
import SavedBookmarks from './saved-bookmarks';
import { BookOpen, MessageCircle, BookMarked, Flame, Users, Sun, Moon, Bookmark } from 'lucide-react';

type Tab = 'devotional' | 'chat' | 'journal' | 'habits' | 'wall';
type NavItem = Tab | 'saved';

const TABS: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  { id: 'devotional', label: 'Today',     icon: <BookOpen   size={18} /> },
  { id: 'chat',       label: 'Chat',      icon: <MessageCircle size={18} /> },
  { id: 'journal',    label: 'Journal',   icon: <BookMarked size={18} /> },
  { id: 'habits',     label: 'Streak',    icon: <Flame      size={18} /> },
  { id: 'wall',       label: 'Wall',      icon: <Users      size={18} /> },
  { id: 'saved',      label: 'Saved',     icon: <Bookmark   size={18} /> },
];

export default function AppWrapper() {
  const [activeTab, setActiveTab] = useState<Tab>('devotional');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage and apply / remove the .dark class on <html>
  useEffect(() => {
    setMounted(true);
    // Read from localStorage
    const saved = localStorage.getItem('theme-mode');
    const dark = saved === 'dark';
    setIsDark(dark);
    
    // Apply to DOM
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  // Persist theme changes
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [isDark, mounted]);

  if (!mounted) return null;

  return (
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden" style={{ background: 'var(--surface-page)' }}>

      {/* ── Theme toggle ── */}
      <button
        onClick={() => setIsDark((d) => !d)}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute right-3 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md"
        style={{
          top: 'calc(0.75rem + env(safe-area-inset-top))',
          background: isDark ? 'rgba(201,168,76,0.18)' : 'rgba(74,50,104,0.10)',
          border:     isDark ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(74,50,104,0.20)',
          color:      isDark ? 'var(--gold)' : 'var(--purple-deep)',
        }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'devotional' && <DevotionalCard />}
        {activeTab === 'chat'       && <BibleChat />}
        {activeTab === 'journal'    && <PrayerJournal />}
        {activeTab === 'habits'     && <HabitTracker />}
        {activeTab === 'wall'       && <PrayerWall />}
      </div>

      {showBookmarks && <SavedBookmarks onClose={() => setShowBookmarks(false)} />}

      {/* ── Bottom Navigation ── */}
      <nav
        className="z-40 flex items-center flex-shrink-0 border-t"
        style={{
          background:   'var(--nav-bg)',
          borderColor:  'var(--nav-border)',
          paddingTop:   '8px',
          paddingBottom:'calc(10px + env(safe-area-inset-bottom))',
          paddingLeft:  '4px',
          paddingRight: '4px',
        }}
        aria-label="Main navigation"
      >
        {TABS.map((tab) => {
          const active = tab.id === 'saved' ? showBookmarks : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'saved') {
                  setShowBookmarks(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1 transition-all active:scale-95"
              aria-current={active ? 'page' : undefined}
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                style={
                  active
                    ? { background: 'var(--purple-deep)', color: 'var(--text-on-primary)' }
                    : { color: 'var(--nav-inactive)', background: 'transparent' }
                }
              >
                {tab.icon}
              </span>
              <span
                className="text-[9px] font-semibold tracking-normal truncate max-w-full px-0.5"
                style={{ color: active ? 'var(--purple-deep)' : 'var(--nav-inactive)' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
