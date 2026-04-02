import React, { useMemo, useState } from 'react';
import type { LeagueNewsPost } from '../game/types';

function toneColor(tone: LeagueNewsPost['badgeTone']) {
  if (tone === 'accent') return 'rgba(245,158,11,0.14)';
  if (tone === 'info') return 'rgba(14,165,233,0.14)';
  if (tone === 'good') return 'rgba(34,197,94,0.14)';
  if (tone === 'bad') return 'rgba(220,38,38,0.14)';
  return 'rgba(37,99,235,0.10)';
}

export default function NewsScreen(props: {
  posts: LeagueNewsPost[];
  onBack: () => void;
}) {
  const sorted = useMemo(() => [...props.posts].sort((a, b) => b.createdAtMs - a.createdAtMs), [props.posts]);
  const [filter, setFilter] = useState<'all' | LeagueNewsPost['type']>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? sorted : sorted.filter((post) => post.type === filter)),
    [filter, sorted],
  );

  const counts = useMemo(
    () =>
      sorted.reduce(
        (acc, post) => {
          acc.all += 1;
          acc[post.type] += 1;
          return acc;
        },
        { all: 0, highlight: 0, reaction: 0, breaking: 0, draft: 0, award: 0, trade: 0, storyline: 0 } as Record<'all' | LeagueNewsPost['type'], number>,
      ),
    [sorted],
  );

  const featured = filtered[0];
  const trending = filtered.slice(1, 5);
  const filterOptions: Array<{ key: 'all' | LeagueNewsPost['type']; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'highlight', label: 'Highlights' },
    { key: 'reaction', label: 'Reactions' },
    { key: 'breaking', label: 'Breaking' },
    { key: 'storyline', label: 'Storylines' },
    { key: 'award', label: 'Awards' },
    { key: 'trade', label: 'Trades' },
    { key: 'draft', label: 'Draft' },
  ];

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Social & League Feed</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Live timeline for finals, trades, awards, reactions, locker-room tension, and league chatter.
            </div>
          </div>
          <button onClick={props.onBack} className="btn btnSoft" style={{ padding: '10px 14px' }}>
            Back
          </button>
        </div>

        {sorted.length === 0 ? (
          <div style={{ marginTop: 16 }} className="card">
            <div className="muted" style={{ opacity: 0.85 }}>
              No social posts yet. Finish the draft and start the season to fill this feed with match reactions, trade buzz, award chatter, and finals coverage.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  className={`btn ${filter === option.key ? 'btnPrimary' : 'btnSoft'}`}
                  style={{ padding: '8px 12px', fontWeight: 800 }}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label} {counts[option.key]}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.76))',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.16)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}>
                      Featured Story
                    </div>
                    <div style={{ marginTop: 10, fontSize: 24, fontWeight: 1000, lineHeight: 1.18 }}>
                      {featured?.text}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {featured?.icon ?? '•'}
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {featured?.badge ? (
                    <span className="pill" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
                      {featured.badge}
                    </span>
                  ) : null}
                  <span className="pill" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
                    {new Date(featured?.createdAtMs ?? Date.now()).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="card">
                <div style={{ fontWeight: 1000 }}>Trending Now</div>
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  Fast-glance pulse of the latest league chatter.
                </div>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {trending.map((post) => (
                    <div key={post.id} style={{ padding: 10, borderRadius: 12, background: toneColor(post.badgeTone), border: '1px solid rgba(15,23,42,0.08)' }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>
                        {post.badge ?? post.type.toUpperCase()}
                      </div>
                      <div style={{ marginTop: 6, lineHeight: 1.4 }}>{post.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
              {filtered.slice(0, 80).map((post, index) => (
                <div
                  key={post.id}
                  className="card"
                  style={{
                    background: index === 0 ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.76)',
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 16,
                          background: `linear-gradient(180deg, rgba(37,99,235,1), rgba(29,78,216,1))`,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: 18,
                          boxShadow: '0 14px 24px rgba(37,99,235,0.16)',
                        }}
                        title={post.type}
                      >
                        {post.icon ?? '•'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {post.badge ? (
                            <span style={{ padding: '4px 10px', borderRadius: 999, background: toneColor(post.badgeTone), fontSize: 12, fontWeight: 900 }}>
                              {post.badge}
                            </span>
                          ) : null}
                          <span className="muted" style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            {post.type}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>{post.text}</div>
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: 12, opacity: 0.72, minWidth: 88, textAlign: 'right' }}>
                      {new Date(post.createdAtMs).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
