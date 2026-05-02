'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, HandHeart, Heart, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Tag = 'healing' | 'family' | 'guidance' | 'gratitude' | 'strength' | 'peace';

interface Prayer {
  id: number;
  name: string;
  initial: string;
  avatarHue: string;
  time: string;
  text: string;
  tag: Tag;
  prayingCount: number;
  isPraying: boolean;
}

interface CommunityPrayerRow {
  id: number;
  name: string;
  initial: string;
  text: string;
  tag: string;
  praying_count: number | null;
  created_at: string | null;
}

interface EncouragementState {
  text: string;
  loading: boolean;
  sent: boolean;
  error?: string;
}

const TAG_CONFIG: Record<Tag, { label: string; bgVar: string; textVar: string }> = {
  healing: { label: 'Healing', bgVar: 'var(--tag-healing-bg)', textVar: 'var(--tag-healing-text)' },
  family: { label: 'Family', bgVar: 'var(--tag-family-bg)', textVar: 'var(--tag-family-text)' },
  guidance: { label: 'Guidance', bgVar: 'var(--tag-guidance-bg)', textVar: 'var(--tag-guidance-text)' },
  gratitude: { label: 'Gratitude', bgVar: 'var(--tag-gratitude-bg)', textVar: 'var(--tag-gratitude-text)' },
  strength: { label: 'Strength', bgVar: 'var(--tag-strength-bg)', textVar: 'var(--tag-strength-text)' },
  peace: { label: 'Peace', bgVar: 'var(--tag-peace-bg)', textVar: 'var(--tag-peace-text)' },
};

const AVATAR_HUES = ['#4a3268', '#2e8a56', '#b94040', '#3a5ca8', '#a07820', '#c9692a'];

const INITIAL_PRAYERS: Prayer[] = [
  {
    id: 1,
    name: 'Sarah M.',
    initial: 'S',
    avatarHue: AVATAR_HUES[0],
    time: '2 min ago',
    text: 'Please pray for my mother who is undergoing surgery tomorrow morning. We are trusting God for a full recovery and peace for our whole family.',
    tag: 'healing',
    prayingCount: 14,
    isPraying: false,
  },
  {
    id: 2,
    name: 'David K.',
    initial: 'D',
    avatarHue: AVATAR_HUES[1],
    time: '18 min ago',
    text: "Asking for wisdom and clear direction as I face a major career decision this week. I want to walk in God's will and not my own.",
    tag: 'guidance',
    prayingCount: 9,
    isPraying: false,
  },
  {
    id: 3,
    name: 'Grace O.',
    initial: 'G',
    avatarHue: AVATAR_HUES[2],
    time: '45 min ago',
    text: 'Thank you all for your prayers last month - my husband found a new job! God is so faithful. Praising Him today.',
    tag: 'gratitude',
    prayingCount: 31,
    isPraying: false,
  },
  {
    id: 4,
    name: 'James R.',
    initial: 'J',
    avatarHue: AVATAR_HUES[3],
    time: '1 hr ago',
    text: "My teenage son has been drifting away from faith. Please intercede for restoration in our family and that he would encounter God's love.",
    tag: 'family',
    prayingCount: 22,
    isPraying: false,
  },
  {
    id: 5,
    name: 'Ruth A.',
    initial: 'R',
    avatarHue: AVATAR_HUES[4],
    time: '2 hrs ago',
    text: 'Dealing with severe anxiety and sleepless nights. Claiming Philippians 4:7 - the peace that surpasses understanding. Please stand with me.',
    tag: 'peace',
    prayingCount: 17,
    isPraying: false,
  },
  {
    id: 6,
    name: 'Michael T.',
    initial: 'M',
    avatarHue: AVATAR_HUES[5],
    time: '3 hrs ago',
    text: 'Starting chemotherapy next week. I believe in the power of prayer and the Great Physician. Please lift me up for physical and spiritual strength.',
    tag: 'strength',
    prayingCount: 48,
    isPraying: false,
  },
];

const SORT_OPTIONS = ['Recent', 'Most Prayed', 'My Prayers'];

const isTag = (value: string): value is Tag => value in TAG_CONFIG;

const formatTimeAgo = (value: string | null) => {
  if (!value) return 'Just now';

  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return 'Just now';

  const diffMs = Date.now() - created.getTime();
  if (diffMs < 60_000) return 'Just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const mapPrayerRow = (row: CommunityPrayerRow): Prayer => {
  const tag = isTag(row.tag) ? row.tag : 'guidance';
  const name = row.name || 'Anonymous';
  const id = Number(row.id);

  return {
    id,
    name,
    initial: (row.initial || name.charAt(0) || 'S').slice(0, 1).toUpperCase(),
    avatarHue: AVATAR_HUES[Math.abs(id) % AVATAR_HUES.length],
    time: formatTimeAgo(row.created_at),
    text: row.text,
    tag,
    prayingCount: row.praying_count ?? 0,
    isPraying: false,
  };
};

export default function PrayerWall() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [activeSort, setActiveSort] = useState('Recent');
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTag, setNewTag] = useState<Tag>('guidance');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [encouragements, setEncouragements] = useState<Record<number, EncouragementState>>({});

  useEffect(() => {
    let active = true;

    const loadPrayers = async () => {
      const { data, error } = await supabase
        .from('community_prayers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!active) return;

      if (error) {
        console.error('Failed to load community prayers:', error);
        setPrayers(INITIAL_PRAYERS);
        setLoadError('Using sample prayers until Supabase is connected.');
      } else {
        setPrayers((data ?? []).map((row) => mapPrayerRow(row as CommunityPrayerRow)));
        setLoadError('');
      }

      setLoading(false);
    };

    loadPrayers();

    const channel = supabase
      .channel('prayers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_prayers' },
        (payload) => {
          const prayer = mapPrayerRow(payload.new as CommunityPrayerRow);
          setPrayers((prev) => {
            if (prev.some((item) => item.id === prayer.id)) return prev;
            return [prayer, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const handlePray = (id: number) => {
    setPrayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isPraying: !p.isPraying, prayingCount: p.isPraying ? p.prayingCount - 1 : p.prayingCount + 1 }
          : p
      )
    );
  };

  const handleEncourage = async (prayer: Prayer) => {
    const current = encouragements[prayer.id];
    if (current?.loading || current?.sent) return;

    setEncouragements((prev) => ({
      ...prev,
      [prayer.id]: {
        text: prev[prayer.id]?.text ?? '',
        loading: true,
        sent: false,
      },
    }));

    try {
      const response = await fetch('/api/encourage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prayerText: prayer.text }),
      });

      const data = await response.json() as { encouragement?: unknown; error?: string };

      const encouragementText = typeof data.encouragement === 'string' ? data.encouragement.trim() : '';

      if (!response.ok || !encouragementText) {
        throw new Error(data.error || 'Could not create encouragement.');
      }

      setEncouragements((prev) => ({
        ...prev,
        [prayer.id]: {
          text: encouragementText,
          loading: false,
          sent: true,
        },
      }));
    } catch (error) {
      console.error('Failed to send encouragement:', error);
      setEncouragements((prev) => ({
        ...prev,
        [prayer.id]: {
          text: '',
          loading: false,
          sent: false,
          error: 'Could not send encouragement right now.',
        },
      }));
    }
  };

  const handleSubmit = async () => {
    if (!newText.trim() || posting) return;

    setPosting(true);
    setLoadError('');

    const newPrayer = {
      name: 'You',
      initial: 'Y',
      text: newText.trim(),
      tag: newTag,
      praying_count: 0,
    };

    try {
      const { data, error } = await supabase
        .from('community_prayers')
        .insert([newPrayer])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to post community prayer:', error);
        setLoadError('Could not post your prayer yet. Check your Supabase keys and table policies.');
        return;
      }

      if (data) {
        const savedPrayer = mapPrayerRow(data as CommunityPrayerRow);
        setPrayers((prev) => {
          if (prev.some((item) => item.id === savedPrayer.id)) return prev;
          return [savedPrayer, ...prev].slice(0, 20);
        });
      }

      setNewText('');
      setShowModal(false);
    } finally {
      setPosting(false);
    }
  };

  const sorted = useMemo(() => {
    return [...prayers].sort((a, b) => {
      if (activeSort === 'Most Prayed') return b.prayingCount - a.prayingCount;
      if (activeSort === 'My Prayers') return (b.isPraying ? 1 : 0) - (a.isPraying ? 1 : 0);
      return 0;
    });
  }, [activeSort, prayers]);

  return (
    <div
      className="flex flex-col h-full w-full font-sans"
      style={{
        background: 'var(--surface-page)',
        paddingTop: 'env(safe-area-inset-top)',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes wallPulse {
          0%, 100% { opacity: 0.58; }
          50% { opacity: 1; }
        }

        @keyframes encouragementDrop {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="flex-shrink-0 px-5 pt-10 pb-4" style={{ background: 'var(--surface-page)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
              Community
            </p>
            <h1 className="text-2xl font-bold leading-tight font-serif" style={{ color: 'var(--text-primary)' }}>
              Prayer Wall
            </h1>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--purple-deep)', marginRight: '2.5rem' }}
          >
            <HandHeart size={18} style={{ color: 'var(--text-on-primary)' }} />
          </div>
        </div>

        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--purple-deep)' }}>
            {loading ? 'Loading' : `${prayers.length} shared`}
          </span>{' '}
          prayers from the community
        </p>

        {loadError && (
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            {loadError}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setActiveSort(opt)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                activeSort === opt
                  ? { background: 'var(--purple-deep)', color: 'var(--text-on-primary)' }
                  : { background: 'var(--surface-raised)', color: 'var(--purple-deep)' }
              }
            >
              {opt}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">
        {loading && prayers.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--surface-card)',
                  boxShadow: '0 2px 12px var(--wall-card-shadow)',
                  border: '1px solid var(--wall-card-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full"
                    style={{ animation: 'wallPulse 1.5s ease-in-out infinite', background: 'var(--surface-raised)' }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-3 rounded-full w-1/2"
                      style={{ animation: 'wallPulse 1.5s ease-in-out infinite', background: 'var(--surface-raised)' }}
                    />
                    <div
                      className="h-2.5 rounded-full w-1/4"
                      style={{ animation: 'wallPulse 1.5s ease-in-out infinite', background: 'var(--surface-raised)' }}
                    />
                  </div>
                </div>
              </div>
            ))
          : sorted.map((prayer) => {
              const tag = TAG_CONFIG[prayer.tag];
              const isExpanded = expandedId === prayer.id;
              const isLong = prayer.text.length > 120;
              const encouragement = encouragements[prayer.id];

              return (
                <article
                  key={prayer.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: 'var(--surface-card)',
                    boxShadow: '0 2px 12px var(--wall-card-shadow)',
                    border: '1px solid var(--wall-card-border)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: prayer.avatarHue + '28', color: prayer.avatarHue }}
                    >
                      {prayer.initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {prayer.name}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: tag.bgVar, color: tag.textVar }}
                        >
                          {tag.label}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {prayer.time}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pl-[52px]">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {isLong && !isExpanded ? prayer.text.slice(0, 120) + '...' : prayer.text}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : prayer.id)}
                        className="mt-1 text-xs font-semibold flex items-center gap-0.5"
                        style={{ color: 'var(--purple-deep)' }}
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                        <ChevronDown
                          size={12}
                          style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </button>
                    )}
                  </div>

                  <div className="mx-0 mt-3 mb-3" style={{ height: '1px', background: 'var(--divider)' }} />

                  <div className="flex items-center gap-2 pl-[52px]">
                    <button
                      onClick={() => handlePray(prayer.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={
                        prayer.isPraying
                          ? { background: 'var(--tag-healing-bg)', color: 'var(--tag-healing-text)' }
                          : { background: 'var(--wall-praying-bg)', color: 'var(--purple-deep)' }
                      }
                    >
                      <Heart
                        size={13}
                        fill={prayer.isPraying ? 'var(--tag-healing-text)' : 'none'}
                        stroke={prayer.isPraying ? 'var(--tag-healing-text)' : 'var(--purple-deep)'}
                      />
                      <span>{prayer.prayingCount} Praying</span>
                    </button>

                    <button
                      onClick={() => setShowModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{ background: 'var(--purple-deep)', color: 'var(--text-on-primary)' }}
                    >
                      <HandHeart size={13} />
                      <span>Add prayer</span>
                    </button>
                  </div>

                  <div className="mt-3 pl-[52px]">
                    <button
                      onClick={() => handleEncourage(prayer)}
                      disabled={encouragement?.loading || encouragement?.sent}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:active:scale-100"
                      style={
                        encouragement?.sent
                          ? { background: 'rgba(46, 138, 86, 0.12)', color: '#2e8a56' }
                          : { background: 'var(--gold-dim)', color: 'var(--gold-light)' }
                      }
                    >
                      {encouragement?.loading && <Loader2 size={13} className="animate-spin" />}
                      <span>
                        {encouragement?.sent
                          ? 'Encouragement sent ✓'
                          : encouragement?.loading
                            ? 'Sending encouragement...'
                            : 'Send encouragement ✦'}
                      </span>
                    </button>

                    {(encouragement?.text || encouragement?.error) && (
                      <div
                        className="mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed"
                        style={{
                          animation: 'encouragementDrop 0.22s ease-out',
                          background: encouragement.error ? 'var(--surface-subtle)' : 'var(--surface-raised)',
                          border: '1px solid var(--border)',
                          color: encouragement.error ? 'var(--text-muted)' : 'var(--text-secondary)',
                        }}
                      >
                        {encouragement.text || encouragement.error}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

        {!loading && sorted.length === 0 && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--wall-card-border)',
              color: 'var(--text-muted)',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No prayers yet
            </p>
            <p className="text-xs mt-1">Share the first request with the community.</p>
          </div>
        )}

        <div className="h-4" />
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="absolute bottom-[88px] right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{ background: 'var(--gold)', boxShadow: '0 4px 20px rgba(201,168,76,0.45)', color: 'var(--text-on-gold)' }}
        aria-label="Share a prayer request"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showModal && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'var(--surface-overlay)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="rounded-t-3xl p-6"
            style={{ background: 'var(--surface-card)', boxShadow: '0 -4px 30px rgba(74,50,104,0.15)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
                Share a Prayer
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface-raised)' }}
                aria-label="Close"
              >
                <X size={16} style={{ color: 'var(--purple-deep)' }} />
              </button>
            </div>

            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Category
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.keys(TAG_CONFIG) as Tag[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewTag(t)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={
                    newTag === t
                      ? { background: TAG_CONFIG[t].textVar, color: 'var(--text-on-primary)' }
                      : { background: TAG_CONFIG[t].bgVar, color: TAG_CONFIG[t].textVar }
                  }
                >
                  {TAG_CONFIG[t].label}
                </button>
              ))}
            </div>

            <textarea
              className="w-full rounded-xl p-4 text-sm leading-relaxed resize-none outline-none"
              style={{
                background: 'var(--surface-raised)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                minHeight: '120px',
              }}
              placeholder="Share your prayer request with the community..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />

            <p className="text-[11px] mt-2 text-center italic" style={{ color: 'var(--text-muted)' }}>
              &ldquo;Pray for one another, that you may be healed.&rdquo; - James 5:16
            </p>

            <button
              onClick={handleSubmit}
              disabled={!newText.trim() || posting}
              className="w-full mt-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: newText.trim() && !posting ? 'var(--purple-deep)' : 'var(--surface-subtle)',
                color: newText.trim() && !posting ? 'var(--text-on-primary)' : 'var(--text-muted)',
              }}
            >
              {posting && <Loader2 size={15} className="animate-spin" />}
              <span>{posting ? 'Posting...' : 'Post to Prayer Wall'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
