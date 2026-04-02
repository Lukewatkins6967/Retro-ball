import React, { useEffect, useMemo, useState } from 'react';
import type { FranchiseState, Prospect } from '../game/types';
import { overallToTenScale } from '../game/ratings';
import PotentialStars from './PotentialStars';
import RatingMeter from './RatingMeter';
import StatIcon from './StatIcon';

export default function DraftMenu(props: {
  franchise: FranchiseState;
  choices: Prospect[];
  onPick: (prospectId: string) => void;
  onGoRoster: () => void;
  aiForNextPick: boolean;
  onAiForNextPickChange: (value: boolean) => void;
}) {
  const estimateDraftValue = (p: Prospect) => {
    // UI-only: approximates “future value”. Trading uses a separate function in franchise logic.
    const value = overallToTenScale(p.overall) * 1200 + p.potential * 320 + p.rank * -8;
    return Math.max(1, Math.round(value));
  };

  const { franchise } = props;
  const draftCompleted = franchise.draftCompleted;

  const allTeams = useMemo(() => [franchise.user, franchise.ai, ...franchise.otherTeams], [franchise]);
  const currentPickTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
  const isUserTurn = currentPickTeamId === franchise.user.id;

  const totalPicks = franchise.draft.draftOrderTeamIds.length;
  const currentPickNumber = Math.min(totalPicks, franchise.draft.currentPickIndex + 1);

  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    // Show a countdown feel, but do NOT auto-pick.
    if (!isUserTurn || draftCompleted || props.aiForNextPick) {
      setSecondsLeft(0);
      return;
    }

    setSecondsLeft(8);
    const t = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserTurn, draftCompleted, franchise.draft.currentPickIndex, props.aiForNextPick]);

  const lastFeed = franchise.draft.draftFeed[franchise.draft.draftFeed.length - 1];

  const nextPickNumberForTeam = (teamId: string) => {
    const idx = franchise.draft.draftOrderTeamIds
      .slice(franchise.draft.currentPickIndex)
      .findIndex((id) => id === teamId);
    if (idx < 0) return null;
    return franchise.draft.currentPickIndex + idx + 1;
  };

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Draft</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Round {franchise.draft.round} of {franchise.draft.maxRounds} • Pick {currentPickNumber}/{totalPicks}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="pill" title="TV broadcast style: feed updates as picks happen.">
              <span style={{ fontWeight: 900, color: 'var(--primary2)' }}>Live</span>
              <span className="muted" style={{ fontSize: 13 }}>
                draft feed
              </span>
            </div>

            <div
              className="pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 6,
                background: 'rgba(255,255,255,0.65)',
              }}
              title="Choose whether you draft manually or let AI handle your picks."
            >
              <span className="muted" style={{ fontSize: 13 }}>
                Your picks:
              </span>
              <button
                className={`btn ${!props.aiForNextPick ? 'btnPrimary' : 'btnSoft'}`}
                style={{ padding: '8px 12px' }}
                onClick={() => props.onAiForNextPickChange(false)}
              >
                Me
              </button>
              <button
                className={`btn ${props.aiForNextPick ? 'btnPrimary' : 'btnSoft'}`}
                style={{ padding: '8px 12px' }}
                onClick={() => props.onAiForNextPickChange(true)}
              >
                AI
              </button>
            </div>

            {!draftCompleted && isUserTurn && !props.aiForNextPick && (
              <div className="pill" title="Countdown (no auto-pick). Choose Me/AI and draft when ready.">
                <span className="muted" style={{ fontSize: 13 }}>
                  Next pick in
                </span>
                <b style={{ color: 'var(--accent)', fontSize: 16 }}>{secondsLeft}s</b>
              </div>
            )}
          </div>
        </div>

        {draftCompleted ? (
          <div style={{ marginTop: 18 }} className="card">
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: 'var(--primary2)', textTransform: 'uppercase' }}>
                  Draft Complete
                </div>
                <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950 }}>
                  Your season is ready.
                </div>
                <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
                  Head back to roster management to set your lineup and begin the season. The next draft will not open again until this season finishes and the next lottery begins.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={props.onGoRoster} className="btn btnPrimary" style={{ fontWeight: 900, padding: '12px 16px' }}>
                  Return to Roster
                </button>
                <div className="pill" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.16)' }}>
                  Wait until next season for the next draft
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18 }} className="grid2">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <b>Draft Board</b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {isUserTurn ? 'Your turn' : `Waiting on ${allTeams.find((t) => t.id === currentPickTeamId)?.name ?? 'AI'}`}
                </span>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {allTeams.map((t) => {
                  const nextPick = nextPickNumberForTeam(t.id);
                  const picksMade = franchise.draft.draftedByTeamId[t.id]?.length ?? 0;
                  const isCurrent = t.id === currentPickTeamId;
                  return (
                    <div
                      key={t.id}
                      style={{
                        borderRadius: 14,
                        padding: 12,
                        border: `1px solid ${isCurrent ? 'rgba(37,99,235,0.35)' : 'rgba(15,23,42,0.12)'}`,
                        background: isCurrent ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.65)',
                        boxShadow: isCurrent ? '0 18px 44px rgba(37,99,235,0.12)' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: `linear-gradient(180deg, ${t.logoColor}, rgba(0,0,0,0.0))`,
                              color: '#fff',
                              fontWeight: 900,
                            }}
                            title="Team logo placeholder"
                          >
                            {t.logoText}
                          </div>
                          <div>
                            <div style={{ fontWeight: 900 }}>{t.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {t.managerName}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: 'var(--primary2)' }}>{nextPick ? `#${nextPick}` : '—'}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            Picks: {picksMade}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <b>Live Draft Feed</b>
                  {lastFeed ? (
                    <span className="pill" style={{ padding: '6px 10px', borderRadius: 999 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Latest
                      </span>
                      <b style={{ color: 'var(--primary2)' }}>Pick {lastFeed.pickNumber}</b>
                    </span>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>
                      No picks yet
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {franchise.draft.draftFeed.length === 0 ? (
                    <div className="muted" style={{ opacity: 0.8 }}>
                      Draft begins shortly…
                    </div>
                  ) : (
                    [...franchise.draft.draftFeed].slice(-10).reverse().map((e) => (
                      <div
                        key={e.id}
                        style={{
                          borderRadius: 14,
                          padding: 12,
                          border: '1px solid rgba(15,23,42,0.10)',
                          background: e.surpriseLabel === 'Trophy Potential' ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.7)',
                          transform: e.id === lastFeed?.id ? 'translateY(-1px)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `linear-gradient(180deg, ${e.teamLogoColor}, rgba(0,0,0,0.0))`,
                                color: '#fff',
                                fontWeight: 900,
                              }}
                            >
                              {e.teamLogoText}
                            </div>
                            <div>
                              <div style={{ fontWeight: 900 }}>
                                Pick #{e.pickNumber} • {e.teamName}
                              </div>
                              <div className="muted" style={{ fontSize: 12 }}>
                                {e.managerName}
                              </div>
                            </div>
                          </div>
                          <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>
                            {e.surpriseLabel}
                          </div>
                        </div>

                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 15 }}>{e.prospectName}</div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {e.position} • Overall {e.overall} • Potential {e.potential}/10
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <span className="pill" style={{ padding: '6px 10px' }}>
                                <StatIcon stat="shooting" />
                              </span>
                              <span className="pill" style={{ padding: '6px 10px' }}>
                                <StatIcon stat="speed" />
                              </span>
                              <span className="pill" style={{ padding: '6px 10px' }}>
                                <StatIcon stat="playmaking" />
                              </span>
                              <span className="pill" style={{ padding: '6px 10px' }}>
                                <StatIcon stat="defense" />
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="muted" style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                          {e.pressRelease}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isUserTurn && !props.aiForNextPick ? (
                <div style={{ marginTop: 14 }} className="card">
                  <b>Choose Your Player</b>
                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    Draft pool is updated after every pick.
                  </div>
                  <div style={{ marginTop: 14 }} className="grid2">
                    {props.choices.map((p) => (
                      <div key={p.id} className="card" title="Click to draft this prospect.">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <b style={{ fontSize: 15 }}>{p.name}</b>
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {p.position} • {p.college}
                            </div>
                            <div style={{ marginTop: 8 }} className="muted">
                              Value: <b style={{ color: 'var(--primary2)' }}>${estimateDraftValue(p)}</b>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>Ovr</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary2)' }}>{p.overall}</div>
                            <div style={{ marginTop: 8 }}>
                              <PotentialStars potential={p.potential} />
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <RatingMeter value={p.categories.shooting} label="Shot" color="info" />
                          <RatingMeter value={p.categories.speed} label="Speed" color="accent" />
                          <RatingMeter value={p.categories.playmaking} label="Play" color="primary" />
                          <RatingMeter value={p.categories.defense} label="Defense" color="good" />
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <button
                            onClick={() => props.onPick(p.id)}
                            className="btn btnPrimary"
                            style={{ width: '100%', padding: '12px 14px', fontWeight: 900 }}
                          >
                            Draft {p.name.split(' ')[0]}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : isUserTurn && props.aiForNextPick ? (
                <div style={{ marginTop: 14 }} className="card muted">
                  AI will take your next pick, then the draft pauses again at your next turn.
                </div>
              ) : (
                <div style={{ marginTop: 14 }} className="card muted">
                  Not your pick yet. The feed will update as AI teams select their prospects.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }} className="muted">
          Tip: Shooting/Speed/Playmaking/Defense and potential influence draft stock and match potential.
        </div>
      </div>
    </div>
  );
}
