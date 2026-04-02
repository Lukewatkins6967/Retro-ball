import React, { useEffect, useMemo, useState } from 'react';
import type { DraftStandingRow, FranchiseState, LeagueNewsPost, PowerRankingRow } from '../game/types';
import { simulateSeasonWithAwardsAndPlayoffs, type SeasonMatchEvent } from '../game/seasonSimEngine';
import { prepareNextSeasonCycle } from '../game/franchise';

function formatRankList(
  title: string,
  items: Array<{ playerId: string; playerName: string; teamId: string; score: number; rank: number; prevRank: number | null; arrow: '↑' | '↓' | '→' | '—' }>,
  teamById: Record<string, FranchiseState['user']['id']>,
) {
  return (
    <div className="card" style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.75)' }}>
      <div style={{ fontWeight: 950, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>{title}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          top 5
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        {items.map((it) => (
          <div
            key={it.playerId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 10px',
              borderRadius: 12,
              background: it.rank === 1 ? 'rgba(245,158,11,0.18)' : 'rgba(37,99,235,0.06)',
            }}
          >
            <div>
              <div style={{ fontWeight: 900, lineHeight: 1.15 }}>{it.playerName}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                #{it.rank} · {teamById[it.teamId] ? (teamById[it.teamId] as any) : it.teamId}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 950 }}>{Math.round(it.score * 10) / 10}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {it.arrow !== '—' ? it.arrow : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeasonSimScreen(props: {
  franchise: FranchiseState;
  onBackToNews: () => void;
  onFinish: (nextFranchise: FranchiseState, seasonPosts: LeagueNewsPost[]) => void;
}) {
  const [phase, setPhase] = useState<'simulating' | 'playing' | 'results'>('simulating');
  const [result, setResult] = useState<ReturnType<typeof simulateSeasonWithAwardsAndPlayoffs> | null>(null);
  const [playhead, setPlayhead] = useState(0);

  const teamNameById = useMemo(() => {
    const t = result
      ? [result.updatedFranchise.user, result.updatedFranchise.ai, ...result.updatedFranchise.otherTeams].reduce(
          (acc, x) => {
            acc[x.id] = x.name;
            return acc;
          },
          {} as Record<string, string>,
        )
      : {};
    return t;
  }, [result]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase('simulating');
      // Run the whole simulation upfront; then “replay” it to give live-feel UI updates.
      const sim = simulateSeasonWithAwardsAndPlayoffs(props.franchise, { gamesPerTeam: 5, dtMs: 45 });
      if (cancelled) return;
      setResult(sim);
      setPlayhead(0);
      setPhase('playing');
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!result) return;
    if (phase !== 'playing') return;
    if (result.events.length === 0) {
      setPhase('results');
      return;
    }

    const t = setInterval(() => {
      setPlayhead((p) => {
        const next = p + 1;
        if (next >= result.events.length) return p;
        return next;
      });
    }, 750);

    return () => clearInterval(t);
  }, [phase, result]);

  useEffect(() => {
    if (!result) return;
    if (phase !== 'playing') return;
    if (playhead >= result.events.length - 1) {
      setPhase('results');
    }
  }, [playhead, phase, result, props]);

  const event: SeasonMatchEvent | null = result ? result.events[playhead] : null;

  const standings = event?.seasonStandingsSnapshot?.slice().sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)) ?? [];

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>League Season</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              5-game regular season · live award race · playoffs + championship (fast-forward)
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={props.onBackToNews} className="btn btnSoft" style={{ padding: '10px 14px' }}>
              League News
            </button>
            <div className="pill muted" style={{ padding: '10px 12px', fontSize: 13 }}>
              {phase === 'simulating'
                ? 'Simulating…'
                : phase === 'playing'
                  ? `Playing match ${playhead + 1}/${result?.events.length ?? 0}`
                  : 'Season results'}
            </div>
          </div>
        </div>

        {phase === 'simulating' && (
          <div style={{ marginTop: 16, padding: 18 }} className="card">
            <div style={{ fontWeight: 950 }}>Running season sim (this takes a few seconds)…</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Award race and standings update after each match.
            </div>
          </div>
        )}

        {phase !== 'simulating' && result && event && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 14 }}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="card" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.75)' }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Week {event.week} · {event.winnerTeamId ? 'Result' : 'Result'}
                </div>
                <div style={{ marginTop: 10, fontWeight: 1000, fontSize: 20 }}>
                  {teamNameById[event.homeTeamId]} {event.winnerTeamId === event.homeTeamId ? 'W' : ''} {event.finalScore.a}
                  <span className="muted" style={{ fontWeight: 800 }}>
                    {' '}
                    -{' '}
                  </span>
                  {event.finalScore.b} {teamNameById[event.awayTeamId]} {event.winnerTeamId === event.awayTeamId ? 'W' : ''}
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  Top performer: <span style={{ fontWeight: 950, color: 'var(--text)' }}>{event.topScorerByPoints.playerName}</span> ({event.topScorerByPoints.points} pts)
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr' }}>
                {/* Award race cards */}
                {event.awardLeaders && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(1, 1fr)' }}>
                        {/* MVP */}
                        <div>
                          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ gridColumn: 'span 1' }}>
                              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr' }}>
                                {/* MVP card */}
                                <div
                                  className="card"
                                  style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.75)' }}
                                >
                                  <div style={{ fontWeight: 950, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>MVP Race</span>
                                    <span className="muted" style={{ fontSize: 12 }}>
                                      live top 5
                                    </span>
                                  </div>
                                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                                    {event.awardLeaders.mvp.map((it) => (
                                      <div
                                        key={it.playerId}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          gap: 12,
                                          padding: '8px 10px',
                                          borderRadius: 12,
                                          background: it.rank === 1 ? 'rgba(245,158,11,0.18)' : 'rgba(37,99,235,0.06)',
                                        }}
                                      >
                                        <div>
                                          <div style={{ fontWeight: 900 }}>{it.playerName}</div>
                                          <div className="muted" style={{ fontSize: 12 }}>
                                            #{it.rank} · {teamNameById[it.teamId] ?? it.teamId}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontWeight: 950 }}>{Math.round(it.score * 10) / 10}</div>
                                          <div className="muted" style={{ fontSize: 12 }}>
                                            {it.arrow}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ gridColumn: 'span 1' }}>
                              <div
                                className="card"
                                style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.75)' }}
                              >
                                <div style={{ fontWeight: 950, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>ROY / DPOY</span>
                                  <span className="muted" style={{ fontSize: 12 }}>
                                    live top 5
                                  </span>
                                </div>
                                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                                  <div>
                                    <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                                      ROY
                                    </div>
                                    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                                      {event.awardLeaders.roy.map((it) => (
                                        <div key={it.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                          <span style={{ fontWeight: 900 }}>{it.playerName}</span>
                                          <span className="muted" style={{ fontSize: 12 }}>
                                            {it.arrow} · #{it.rank}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                                      DPOY
                                    </div>
                                    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                                      {event.awardLeaders.dpoy.map((it) => (
                                        <div key={it.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                          <span style={{ fontWeight: 900 }}>{it.playerName}</span>
                                          <span className="muted" style={{ fontSize: 12 }}>
                                            {it.arrow} · #{it.rank}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div className="card" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.75)' }}>
                <div style={{ fontWeight: 1000 }}>Standings</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Updated through Week {event.week}
                </div>
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  {standings.slice(0, 8).map((row, idx) => (
                    <div
                      key={row.teamId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 12,
                        background: idx === 0 ? 'rgba(34,197,94,0.16)' : 'rgba(37,99,235,0.06)',
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        {idx + 1}. {teamNameById[row.teamId] ?? row.teamId}
                      </div>
                      <div className="muted" style={{ fontWeight: 900 }}>
                        {row.wins}-{row.losses} · PD {row.pointsFor - row.pointsAgainst}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.75)' }}>
                <div style={{ fontWeight: 1000 }}>What happens next</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  After the regular season, the app fast-forwards through playoffs and the championship, then returns you to Draft Lottery.
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'results' && result && (
          <div style={{ marginTop: 16 }} className="grid2">
            <div className="card" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.78)' }}>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>End-of-Season Awards</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Winners determined from season totals + team success.
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {(() => {
                  const playerById: Record<string, { name: string; teamName: string }> = {};
                  const allTeams = [result.updatedFranchise.user, result.updatedFranchise.ai, ...result.updatedFranchise.otherTeams];
                  for (const t of allTeams) {
                    for (const tp of t.roster) {
                      playerById[tp.id] = { name: tp.prospect.name, teamName: t.name };
                    }
                  }
                  const mvp = result.awardWinners.mvp ? playerById[result.awardWinners.mvp] : undefined;
                  const roy = result.awardWinners.roy ? playerById[result.awardWinners.roy] : undefined;
                  const dpoy = result.awardWinners.dpoy ? playerById[result.awardWinners.dpoy] : undefined;
                  const bestTeamName = result.seasonSummary?.bestTeamId
                    ? allTeams.find((t) => t.id === result.seasonSummary?.bestTeamId)?.name
                    : undefined;
                  const biggestImproverName = result.seasonSummary?.biggestImprovementPlayerId
                    ? playerById[result.seasonSummary.biggestImprovementPlayerId]?.name
                    : undefined;
                  const biggestImproverDelta = result.seasonSummary?.biggestImprovementDelta ?? 0;

                  return (
                    <>
                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(37,99,235,0.08)' }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          Season Summary
                        </div>
                        <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
                          <div>
                            Best Team: <span style={{ fontWeight: 1000 }}>{bestTeamName ?? '—'}</span>
                          </div>
                          <div>
                            Biggest Improvement: <span style={{ fontWeight: 1000 }}>{biggestImproverName ?? '—'}</span>{' '}
                            <span className="muted" style={{ fontWeight: 900 }}>
                              (+{Math.round(biggestImproverDelta * 10) / 10})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(245,158,11,0.12)' }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          MVP
                        </div>
                        <div style={{ fontWeight: 1000 }}>{mvp ? mvp.name : '—'}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {mvp ? mvp.teamName : ''}
                        </div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(37,99,235,0.10)' }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          Rookie of the Year
                        </div>
                        <div style={{ fontWeight: 1000 }}>{roy ? roy.name : '—'}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {roy ? roy.teamName : ''}
                        </div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(34,197,94,0.10)' }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          Defensive Player of the Year
                        </div>
                        <div style={{ fontWeight: 1000 }}>{dpoy ? dpoy.name : '—'}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {dpoy ? dpoy.teamName : ''}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="card" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.78)' }}>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>Playoffs & Championship</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Playoffs simulated after the regular season.
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {(() => {
                  const allTeams = [result.updatedFranchise.user, result.updatedFranchise.ai, ...result.updatedFranchise.otherTeams];
                  const champion = result.finals?.championTeamId ? allTeams.find((t) => t.id === result.finals?.championTeamId) : undefined;
                  const finalsMvpPlayerId = result.finals?.finalsMvpPlayerId ?? '';
                  let finalsMvpName: string | null = null;
                  if (finalsMvpPlayerId) {
                    for (const t of allTeams) {
                      const tp = t.roster.find((x) => x.id === finalsMvpPlayerId);
                      if (tp) {
                        finalsMvpName = tp.prospect.name;
                        break;
                      }
                    }
                  }

                  const getTeamName = (teamId: string) =>
                    allTeams.find((t) => t.id === teamId)?.name ?? teamId;

                  return (
                    <>
                      {result.playoffs && (
                        <div style={{ padding: 12, borderRadius: 14, background: 'rgba(37,99,235,0.06)' }}>
                          <div style={{ fontWeight: 1000 }}>Bracket</div>
                          <div className="muted" style={{ marginTop: 6 }}>
                            Seeds + semifinal matchups (then finals)
                          </div>

                          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                            <div>
                              <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                                Seeds
                              </div>
                              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {result.playoffs.seeds.map((s) => (
                                  <span
                                    key={s.teamId}
                                    className="pill"
                                    style={{ background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.18)' }}
                                  >
                                    #{s.seed} {s.teamName}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {result.playoffs.semifinals.length > 0 && (
                              <div>
                                <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                                  Semifinals
                                </div>
                                <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
                                  {result.playoffs.semifinals.map((m, idx) => (
                                    <div key={`${m.aTeamId}-${m.bTeamId}-${idx}`} style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.7)' }}>
                                      <div style={{ fontWeight: 950 }}>
                                        {getTeamName(m.aTeamId)} {m.score.a} - {m.score.b} {getTeamName(m.bTeamId)}
                                      </div>
                                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                        Winner: {getTeamName(m.winnerTeamId)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {result.playoffs.finals && (
                              <div>
                                <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                                  Finals
                                </div>
                                <div style={{ marginTop: 6 }}>
                                  <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.7)' }}>
                                    <div style={{ fontWeight: 950 }}>
                                      {getTeamName(result.playoffs.finals.aTeamId)} {result.playoffs.finals.score.a} - {result.playoffs.finals.score.b} {getTeamName(result.playoffs.finals.bTeamId)}
                                    </div>
                                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                      Winner: {getTeamName(result.playoffs.finals.winnerTeamId)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(16,185,129,0.12)' }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          Champion
                        </div>
                        <div style={{ fontWeight: 1000 }}>{champion ? champion.name : '—'}</div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(245,158,11,0.10)' }}>
                        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          Finals MVP
                        </div>
                        <div style={{ fontWeight: 1000 }}>{finalsMvpName ?? '—'}</div>
                      </div>
                    </>
                  );
                })()}

                <button
                  className="btn btnPrimary"
                  style={{ padding: '12px 16px', fontWeight: 950, marginTop: 6 }}
                  onClick={() => {
                    // Persist regular-season standings for the next Draft Lottery.
                    try {
                      localStorage.setItem('combinedAppLastSeasonStandings_v1', JSON.stringify(result.seasonStandings));
                    } catch {
                      // Ignore storage issues.
                    }

                    const next = prepareNextSeasonCycle(result.updatedFranchise);
                    props.onFinish(next, result.seasonPosts);
                  }}
                >
                  Continue to Free Agency
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
