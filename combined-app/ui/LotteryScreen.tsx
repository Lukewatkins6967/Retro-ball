import React, { useEffect, useMemo, useState } from 'react';
import type { DraftStandingRow, TeamState } from '../game/types';
import type { LotteryReveal as LotteryRevealType } from '../game/lottery';
import { generateDraftLotteryReveal } from '../game/lottery';

export default function LotteryScreen(props: {
  teams: TeamState[];
  lastSeasonStandings: DraftStandingRow[];
  maxRounds: number;
  onComplete: (finalFirstRoundOrderTeamIds: string[]) => void;
}) {
  const [phase, setPhase] = useState<'spin' | 'reveal' | 'done'>('spin');
  const [tick, setTick] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [revealMs, setRevealMs] = useState(650);

  const reveal: LotteryRevealType = useMemo(() => {
    return generateDraftLotteryReveal(props.lastSeasonStandings, props.teams, 3);
  }, [props.lastSeasonStandings, props.teams]);

  const top3 = reveal.top3TeamIds;
  const userTeamId = props.teams.find((team) => team.id === 'user')?.id ?? 'user';

  const firstRoundOwnerBySource = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of props.teams) {
      for (const pick of team.draftPicks) {
        if (pick.round === 1) {
          map.set(pick.fromTeamId, pick.ownerTeamId ?? team.id);
        }
      }
    }
    for (const team of props.teams) {
      if (!map.has(team.id)) map.set(team.id, team.id);
    }
    return map;
  }, [props.teams]);

  const ownerText = (sourceTeamId: string) => {
    const ownerTeamId = firstRoundOwnerBySource.get(sourceTeamId) ?? sourceTeamId;
    if (ownerTeamId === sourceTeamId) return null;
    if (ownerTeamId === userTeamId) return '(Your pick)';
    const ownerTeam = props.teams.find((team) => team.id === ownerTeamId);
    return ownerTeam ? `(Pick belongs to ${ownerTeam.name})` : null;
  };

  const oddsP1 = props.teams
    .map((t) => ({ id: t.id, name: t.name, managerName: t.managerName, color: t.logoColor, text: t.logoText, prob: reveal.oddsByTeamId[t.id] ?? 0 }))
    .sort((a, b) => b.prob - a.prob);

  useEffect(() => {
    if (phase !== 'spin') return;
    const totalMs = 2500;
    const start = performance.now();
    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
      if (performance.now() - start > totalMs) {
        window.clearInterval(timer);
        setPhase('reveal');
      }
    }, 140);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    if (revealed.length >= reveal.lotteryOrderTeamIds.length) {
      setPhase('done');
      props.onComplete(reveal.lotteryOrderTeamIds);
      return;
    }

    const timer = window.setTimeout(() => {
      const nextIndex = revealed.length;
      const nextId = reveal.lotteryOrderTeamIds[nextIndex];
      setRevealed((prev) => [...prev, nextId]);

      // “Jumping team” polish: occasionally shorten reveal and mark surprise.
      setRevealMs((ms) => (Math.random() < 0.1 ? Math.max(400, ms - 50) : ms));
    }, revealMs);

    return () => window.clearTimeout(timer);
  }, [phase, revealed.length, reveal.lotteryOrderTeamIds, revealMs, props]);

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Draft Lottery</h2>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Odds based on last season standings • Reveals update the draft order
            </div>
          </div>
          <div className="pill" title="This animation is pre-draft only.">
            <span style={{ fontWeight: 900, color: 'var(--primary2)' }}>Stage</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {phase === 'spin' ? 'Spinning balls…' : phase === 'reveal' ? 'Revealing picks…' : 'Complete'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="grid2">
          <div className="card">
            <b>Top pick odds (Pick #1)</b>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              These are the normalized probabilities at the start of the reveal.
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {oddsP1.map((o) => {
                const isTop3 = top3.includes(o.id);
                return (
                  <div
                    key={o.id}
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      border: `1px solid ${isTop3 ? 'rgba(245,158,11,0.35)' : 'rgba(15,23,42,0.12)'}`,
                      background: isTop3 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.65)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(180deg, ${o.color}, rgba(0,0,0,0.0))`,
                          color: '#fff',
                          fontWeight: 900,
                        }}
                      >
                        {o.text}
                      </div>
                        <div>
                          <div style={{ fontWeight: 900 }}>{o.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {o.managerName} {ownerText(o.id) ?? ''}
                          </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: 'var(--primary2)' }}>{Math.round(o.prob * 1000) / 10}%</div>
                      <div className="muted" style={{ fontSize: 12 }}>P1 odds</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <b>Lottery Reveal</b>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Animated picks from balls → board (top 3 highlighted)
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {reveal.lotteryOrderTeamIds.map((id, idx) => {
                const team = props.teams.find((t) => t.id === id)!;
                const hasRevealed = revealed.includes(id);
                const isTop3 = top3.includes(id);
                const stageText = hasRevealed ? `Pick #${idx + 1}` : `Pick #${idx + 1}…`;
                return (
                  <div
                    key={id}
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      border: `1px solid ${
                        isTop3 && hasRevealed ? 'rgba(245,158,11,0.45)' : 'rgba(15,23,42,0.12)'
                      }`,
                      background: isTop3 && hasRevealed ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.65)',
                      boxShadow: hasRevealed ? '0 14px 34px rgba(0,0,0,0.10)' : undefined,
                      transform: hasRevealed ? 'translateY(-1px)' : undefined,
                      transition: 'transform 160ms ease, box-shadow 160ms ease',
                      opacity: hasRevealed ? 1 : 0.75,
                    }}
                    title={hasRevealed ? stageText : 'Revealing…'}
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
                            background: `linear-gradient(180deg, ${team.logoColor}, rgba(0,0,0,0.0))`,
                            color: '#fff',
                            fontWeight: 900,
                          }}
                        >
                          {team.logoText}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900 }}>{team.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {team.managerName} {ownerText(team.id) ?? ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: isTop3 && hasRevealed ? 'var(--accent)' : 'var(--primary2)' }}>
                          {hasRevealed ? `#${idx + 1}` : `…`}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {isTop3 ? 'Top pick' : 'Lottery slot'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
