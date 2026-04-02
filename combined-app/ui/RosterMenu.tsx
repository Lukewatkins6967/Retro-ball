import React, { useMemo, useState } from 'react';
import type { FranchiseState, TeamPlayer } from '../game/types';
import { calculateMarketSalary, evaluateContractOffer } from '../game/franchise';
import { describeLockerRoom } from '../game/personality';
import { fatigueLabel, getRotationMetrics, staminaPercent, type RotationMode } from '../game/stamina';
import PotentialStars from './PotentialStars';
import RatingMeter from './RatingMeter';
import StatIcon from './StatIcon';
import Modal from './Modal';

function activeStats(player: TeamPlayer, playoffsActive: boolean) {
  return playoffsActive ? player.playoffStats : player.seasonStats;
}

function warningTone(seasonsLeft: number) {
  if (seasonsLeft <= 0) return 'rgba(220,38,38,0.95)';
  if (seasonsLeft === 1) return 'rgba(245,158,11,0.95)';
  return 'rgba(37,99,235,0.9)';
}

function meterTone(value: number) {
  if (value >= 75) return 'var(--good)';
  if (value >= 50) return 'var(--accent)';
  return 'var(--bad)';
}

function staminaTone(value: number) {
  if (value >= 72) return 'var(--good)';
  if (value >= 48) return 'var(--accent)';
  return 'var(--bad)';
}

function statusTone(status: TeamPlayer['status']) {
  if (status === 'happy') return 'var(--good)';
  if (status === 'unhappy') return 'var(--bad)';
  return 'var(--accent)';
}

function personalityRows(player: TeamPlayer) {
  return [
    ['Ego', player.personality.ego],
    ['Loyalty', player.personality.loyalty],
    ['Work Ethic', player.personality.workEthic],
    ['Clutch', player.personality.clutchFactor],
    ['Temperament', player.personality.temperament],
  ] as const;
}

function negotiationLabel(value: number) {
  if (value >= 80) return 'Very likely';
  if (value >= 65) return 'Likely';
  if (value >= 50) return 'Toss-up';
  if (value >= 35) return 'Unlikely';
  return 'Very unlikely';
}

function PlayerCard(props: { p: TeamPlayer; playoffsActive: boolean; onOpen: (playerId: string) => void }) {
  const { p } = props;
  const stats = activeStats(p, props.playoffsActive);
  const letter = p.prospect.name.trim().charAt(0).toUpperCase() || 'P';
  const contractWarning = p.contract.seasonsLeft <= 1;
  const isStar = p.prospect.overall >= 90 || p.prospect.potential >= 9;
  const stamina = staminaPercent(p);

  return (
    <button
      className="card playerCardInteractive"
      onClick={() => props.onOpen(p.id)}
      style={{ width: '100%', textAlign: 'left', position: 'relative' }}
      title={`Manage ${p.prospect.name}`}
    >
      {contractWarning && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            borderRadius: 999,
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.28)',
            color: 'rgba(220,38,38,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 1000,
            boxShadow: '0 10px 24px rgba(220,38,38,0.16)',
          }}
          aria-label="Contract warning"
        >
          !
        </div>
      )}

      {isStar && (
        <div
          className="pill"
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            background: 'rgba(245,158,11,0.12)',
            borderColor: 'rgba(245,158,11,0.22)',
            color: 'rgba(180,83,9,0.95)',
            fontWeight: 900,
          }}
        >
          Star
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginTop: isStar ? 26 : 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(37,99,235,1), rgba(29,78,216,1))',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              boxShadow: '0 18px 44px rgba(37,99,235,0.22)',
            }}
          >
            {letter}
          </div>
          <div>
            <b style={{ fontSize: 16 }}>{p.prospect.name}</b>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {p.prospect.position} • Age {p.prospect.age}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', paddingRight: contractWarning ? 30 : 0 }}>
          <div className="muted" style={{ fontSize: 12 }}>Overall</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary2)' }}>{p.prospect.overall}</div>
          <div style={{ marginTop: 8 }}>
            <PotentialStars potential={p.prospect.potential} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div title="Shot accuracy">
          <StatIcon stat="shooting" />
          <div style={{ marginTop: 6 }}>
            <RatingMeter value={p.prospect.categories.shooting} label="Shot" color="info" />
          </div>
        </div>
        <div title="Speed / movement">
          <StatIcon stat="speed" />
          <div style={{ marginTop: 6 }}>
            <RatingMeter value={p.prospect.categories.speed} label="Speed" color="accent" />
          </div>
        </div>
        <div title="Pass accuracy & assist chance">
          <StatIcon stat="playmaking" />
          <div style={{ marginTop: 6 }}>
            <RatingMeter value={p.prospect.categories.playmaking} label="Play" color="primary" />
          </div>
        </div>
        <div title="Steals & blocks">
          <StatIcon stat="defense" />
          <div style={{ marginTop: 6 }}>
            <RatingMeter value={p.prospect.categories.defense} label="Defense" color="good" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
          <span className="muted">Stamina</span>
          <b style={{ color: staminaTone(stamina) }}>
            {stamina}% • {fatigueLabel(stamina)}
          </b>
        </div>
        <div className="staminaTrack" style={{ marginTop: 6 }}>
          <div className="staminaFill" style={{ width: `${stamina}%`, background: staminaTone(stamina) }} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
          <span className="muted">Morale</span>
          <b style={{ color: meterTone(p.morale) }}>
            {p.morale}/100 • <span style={{ color: statusTone(p.status) }}>{p.status}</span>
          </b>
        </div>
        <div className="progressTrack" style={{ marginTop: 6 }}>
          <div className="progressBar" style={{ width: `${p.morale}%`, background: `linear-gradient(90deg, ${meterTone(p.morale)}, rgba(14,165,233,0.9))` }} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {personalityRows(p).slice(0, 4).map(([label, value]) => (
          <div key={label} className="pill" style={{ justifyContent: 'space-between' }}>
            <span>{label}</span>
            <b>{value}/10</b>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="muted" style={{ fontSize: 12 }}>
          Contract: <b style={{ color: warningTone(p.contract.seasonsLeft) }}>{p.contract.seasonsLeft}</b> year(s)
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Salary: <b style={{ color: 'var(--text)' }}>${Math.round(p.contract.salary / 1000)}k</b>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.88 }}>
        <b>{props.playoffsActive ? 'Playoff stats' : 'Season stats'}</b>: PTS {stats.points} • AST {stats.assists} • REB {stats.rebounds} • STL {stats.steals} • BLK {stats.blocks}
      </div>
    </button>
  );
}

export default function RosterMenu(props: {
  franchise: FranchiseState;
  draftCompleted: boolean;
  onBackToDraft?: () => void;
  onSetActive: (active: [string, string]) => void;
  onStartSeason: () => void;
  onOpenTrade: (playerId?: string) => void;
  onOpenFreeAgency: () => void;
  freeAgencyAvailable: boolean;
  onSetRotationMode: (mode: RotationMode) => void;
  onOfferReSign: (playerId: string, offer: { salary: number; years: number }) => void;
  progressionNotices?: string[];
  message?: string;
}) {
  const { user } = props.franchise;
  const salaryTotal = user.roster.reduce((s, p) => s + p.contract.salary, 0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [offerSalary, setOfferSalary] = useState<number | null>(null);
  const [offerYears, setOfferYears] = useState(3);

  const roster = [...user.roster].sort((a, b) => b.prospect.overall - a.prospect.overall);
  const playoffsActive = props.franchise.season?.phase === 'playoffs';
  const selectedPlayer = selectedPlayerId ? roster.find((player) => player.id === selectedPlayerId) ?? null : null;

  const liveOffer = selectedPlayer
    ? {
        salary: offerSalary ?? calculateMarketSalary(selectedPlayer),
        years: offerYears,
      }
    : null;
  const liveEvaluation = selectedPlayer && liveOffer
    ? evaluateContractOffer(props.franchise, props.franchise.user.id, selectedPlayer, liveOffer, { isReSign: true })
    : null;

  const leader = (fn: (p: TeamPlayer) => number) => roster.slice().sort((a, b) => fn(b) - fn(a))[0];
  const leaders = {
    points: leader((p) => activeStats(p, playoffsActive).points),
    assists: leader((p) => activeStats(p, playoffsActive).assists),
    rebounds: leader((p) => activeStats(p, playoffsActive).rebounds),
    steals: leader((p) => activeStats(p, playoffsActive).steals),
    blocks: leader((p) => activeStats(p, playoffsActive).blocks),
  };

  const activeBall = user.activePlayerIds[0];
  const activeOff = user.activePlayerIds[1];
  const teamRating = user.teamRating;
  const rotationMetrics = getRotationMetrics(user);

  const playerHistory = useMemo(() => {
    if (!selectedPlayer) return [];
    return props.franchise.tradeHistory
      .filter((entry) => entry.outgoingPlayerIds.includes(selectedPlayer.id) || entry.incomingPlayerIds.includes(selectedPlayer.id))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [props.franchise.tradeHistory, selectedPlayer]);

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Roster & Management</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Click any player card to negotiate extensions, check loyalty, and manage contract risk.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ opacity: 0.85, fontSize: 13 }} className="muted">
              Cap: ${Math.round(user.salaryCap / 1000)}k • Salary: ${Math.round(salaryTotal / 1000)}k
            </div>
            <div style={{ opacity: 0.75, fontSize: 12 }} className="muted">
              Date: {props.franchise.currentDate.month}/{props.franchise.currentDate.day}/{props.franchise.currentDate.year}
            </div>
          </div>
        </div>

        {props.message ? (
          <div className="pill" style={{ marginTop: 14, whiteSpace: 'normal', maxWidth: '100%' }}>
            {props.message}
          </div>
        ) : null}

        {!props.draftCompleted && props.onBackToDraft && (
          <div style={{ marginTop: 12 }}>
            <button onClick={props.onBackToDraft} className="btn btnSoft">
              Back to Draft
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.92)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <b>Active Lineup (2v2)</b>
              <button
                className="btn btnSoft"
                onClick={props.onOpenFreeAgency}
                disabled={!props.freeAgencyAvailable}
                title={props.freeAgencyAvailable ? 'Open offseason free agency' : 'Free agency unlocks after the season ends'}
                style={{ padding: '10px 14px', fontWeight: 900 }}
              >
                {props.freeAgencyAvailable ? 'Open Free Agency' : 'Free Agency After Season'}
              </button>
            </div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ opacity: 0.85 }}>Ball Handler</span>
                <select value={activeBall} onChange={(e) => props.onSetActive([e.target.value, activeOff])} style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}>
                  {roster.map((p) => (
                    <option key={p.id} value={p.id}>{p.prospect.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ opacity: 0.85 }}>Off-ball Defender</span>
                <select value={activeOff} onChange={(e) => props.onSetActive([activeBall, e.target.value])} style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}>
                  {roster.map((p) => (
                    <option key={p.id} value={p.id}>{p.prospect.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ opacity: 0.85 }}>Rotation Strategy</span>
                <select
                  value={user.rotationMode}
                  onChange={(e) => props.onSetRotationMode(e.target.value as RotationMode)}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}
                >
                  <option value="tight">Tight Rotation • Lean on stars</option>
                  <option value="balanced">Balanced Rotation • Mix starters and bench</option>
                  <option value="deep">Deep Rotation • Keep everyone fresh</option>
                </select>
              </label>
              <div className="muted" style={{ fontSize: 12 }}>
                Bench quality now affects team rating, late-game performance, trade value, and how aggressively the AI rotates players.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }} className="grid2">
          {roster.map((p) => (
            <PlayerCard
              key={p.id}
              p={p}
              playoffsActive={playoffsActive}
              onOpen={(playerId) => {
                const player = roster.find((entry) => entry.id === playerId);
                setSelectedPlayerId(playerId);
                setShowHistory(false);
                setOfferYears(3);
                setOfferSalary(player ? calculateMarketSalary(player) : null);
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 14 }} className="grid2">
          <div className="card">
            <b>Team Rating</b>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{teamRating}/10</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Updates after matches using roster performance, fatigue balance, and bench strength.</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                  <span className="muted">Team chemistry</span>
                  <b style={{ color: meterTone(user.chemistry) }}>{user.chemistry}/100</b>
                </div>
                <div className="progressTrack" style={{ marginTop: 6 }}>
                  <div className="progressBar" style={{ width: `${user.chemistry}%`, background: `linear-gradient(90deg, ${meterTone(user.chemistry)}, rgba(14,165,233,0.9))` }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                  <span className="muted">Average team stamina</span>
                  <b style={{ color: staminaTone(rotationMetrics.averageStamina) }}>{Math.round(rotationMetrics.averageStamina)}%</b>
                </div>
                <div className="staminaTrack" style={{ marginTop: 6 }}>
                  <div className="staminaFill" style={{ width: `${rotationMetrics.averageStamina}%`, background: staminaTone(rotationMetrics.averageStamina) }} />
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <b>Depth & Rotation</b>
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <div className="rotationSummaryGrid">
                <div className="rotationSummaryTile">
                  <span className="muted" style={{ fontSize: 12 }}>Starter Rating</span>
                  <b style={{ fontSize: 20 }}>{rotationMetrics.starterRating.toFixed(1)}</b>
                </div>
                <div className="rotationSummaryTile">
                  <span className="muted" style={{ fontSize: 12 }}>Bench Rating</span>
                  <b style={{ fontSize: 20 }}>{rotationMetrics.benchRating.toFixed(1)}</b>
                </div>
                <div className="rotationSummaryTile">
                  <span className="muted" style={{ fontSize: 12 }}>Depth Score</span>
                  <b style={{ fontSize: 20 }}>{rotationMetrics.depthScore.toFixed(1)}</b>
                </div>
                <div className="rotationSummaryTile">
                  <span className="muted" style={{ fontSize: 12 }}>Rotation Mode</span>
                  <b style={{ fontSize: 16, textTransform: 'capitalize' }}>{user.rotationMode}</b>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Strong benches stay fresher in close games. Thin teams are more explosive early, but they fade faster and are more exposed if a starter is tired.
              </div>
              <div className="pill" style={{ justifyContent: 'space-between' }}>
                <span>Locker room</span>
                <b style={{ color: meterTone(user.chemistry) }}>{describeLockerRoom(user.lockerRoomStatus)}</b>
              </div>
            </div>
          </div>
          <div className="card">
            <b>Team Leaders</b>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, display: 'grid', gap: 6 }}>
              <div>PTS: {leaders.points?.prospect.name ?? '—'} ({leaders.points ? activeStats(leaders.points, playoffsActive).points : 0})</div>
              <div>AST: {leaders.assists?.prospect.name ?? '—'} ({leaders.assists ? activeStats(leaders.assists, playoffsActive).assists : 0})</div>
              <div>REB: {leaders.rebounds?.prospect.name ?? '—'} ({leaders.rebounds ? activeStats(leaders.rebounds, playoffsActive).rebounds : 0})</div>
              <div>STL: {leaders.steals?.prospect.name ?? '—'} ({leaders.steals ? activeStats(leaders.steals, playoffsActive).steals : 0})</div>
              <div>BLK: {leaders.blocks?.prospect.name ?? '—'} ({leaders.blocks ? activeStats(leaders.blocks, playoffsActive).blocks : 0})</div>
            </div>
          </div>
        </div>

        {props.progressionNotices && props.progressionNotices.length > 0 && (
          <div style={{ marginTop: 14, background: 'rgba(40,167,69,0.08)', border: '1px solid rgba(40,167,69,0.22)', borderRadius: 14, padding: 12 }}>
            <b>Growth Notifications</b>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
              {props.progressionNotices.map((n, idx) => (
                <div key={`${n}-${idx}`}>- {n}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => props.onStartSeason()} className="btn btnPrimary" disabled={roster.length < 2} style={{ padding: '12px 16px', fontWeight: 900 }}>
            Start Season (5 Games)
          </button>
          <div style={{ fontSize: 13, opacity: 0.8, alignSelf: 'center' }} className="muted">
            Stats influence gameplay and contract expectations.
          </div>
        </div>
      </div>

      {selectedPlayer && liveOffer && liveEvaluation && (
        <Modal
          title={`${selectedPlayer.prospect.name} Contract Panel`}
          width="min(560px, calc(100vw - 18px))"
          maxHeight="min(82vh, 760px)"
          onClose={() => {
            setSelectedPlayerId(null);
            setShowHistory(false);
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(14,165,233,0.05))', padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 1000, lineHeight: 1.1 }}>{selectedPlayer.prospect.name}</div>
                  <div className="muted" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.4 }}>
                    {selectedPlayer.prospect.position} • Age {selectedPlayer.prospect.age} • OVR {selectedPlayer.prospect.overall} / POT {selectedPlayer.prospect.potential}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Current Contract</div>
                  <div style={{ marginTop: 4, fontWeight: 900, color: warningTone(selectedPlayer.contract.seasonsLeft) }}>
                    {selectedPlayer.contract.seasonsLeft} year(s) at ${Math.round(selectedPlayer.contract.salary / 1000)}k
                  </div>
                  <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                    Loyalty {selectedPlayer.loyalty}/10 • Happiness {selectedPlayer.happiness}/10
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <b>Personality & Morale</b>
                <div className="pill" style={{ color: statusTone(selectedPlayer.status) }}>
                  {selectedPlayer.status.toUpperCase()}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                  <span>Morale</span>
                  <b style={{ color: meterTone(selectedPlayer.morale) }}>{selectedPlayer.morale}/100</b>
                </div>
                <div className="progressTrack" style={{ marginTop: 6 }}>
                  <div className="progressBar" style={{ width: `${selectedPlayer.morale}%`, background: `linear-gradient(90deg, ${meterTone(selectedPlayer.morale)}, rgba(14,165,233,0.9))` }} />
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {personalityRows(selectedPlayer).map(([label, value]) => (
                  <div key={label} className="pill" style={{ justifyContent: 'space-between' }}>
                    <span>{label}</span>
                    <b>{value}/10</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <b>Current Performance</b>
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '6px 4px' }}>GP</th>
                      <th style={{ padding: '6px 4px' }}>PTS</th>
                      <th style={{ padding: '6px 4px' }}>AST</th>
                      <th style={{ padding: '6px 4px' }}>REB</th>
                      <th style={{ padding: '6px 4px' }}>STL</th>
                      <th style={{ padding: '6px 4px' }}>BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 4px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>{activeStats(selectedPlayer, playoffsActive).matchesPlayed}</td>
                      <td style={{ padding: '8px 4px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>{activeStats(selectedPlayer, playoffsActive).points}</td>
                      <td style={{ padding: '8px 4px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>{activeStats(selectedPlayer, playoffsActive).assists}</td>
                      <td style={{ padding: '8px 4px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>{activeStats(selectedPlayer, playoffsActive).rebounds}</td>
                      <td style={{ padding: '8px 4px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>{activeStats(selectedPlayer, playoffsActive).steals}</td>
                      <td style={{ padding: '8px 4px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>{activeStats(selectedPlayer, playoffsActive).blocks}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>Contract Outlook</b>
                <div className="pill" style={{ fontSize: 12 }}>
                  Market target: ${Math.round(liveEvaluation.targetSalary / 1000)}k
                </div>
              </div>
              <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                Contract talks now happen during end-of-season free agency. Happy players are much more likely to return to their original team there.
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                  <span>Annual Salary Offer</span>
                  <b>${Math.round(liveOffer.salary / 1000)}k</b>
                </div>
                <input
                  type="range"
                  min={Math.round(liveEvaluation.minSalary / 1000)}
                  max={Math.round(liveEvaluation.maxSalary / 1000)}
                  value={Math.round(liveOffer.salary / 1000)}
                  onChange={(e) => setOfferSalary(Number(e.target.value) * 1000)}
                  style={{ width: '100%', marginTop: 6 }}
                />
                <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
                  Comfort range: ${Math.round(liveEvaluation.minSalary / 1000)}k to ${Math.round(liveEvaluation.maxSalary / 1000)}k
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                  <span>Contract Length</span>
                  <b>{offerYears} year(s)</b>
                </div>
                <select value={offerYears} onChange={(e) => setOfferYears(Number(e.target.value))} style={{ marginTop: 6, width: '100%', padding: 9, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}>
                  {[1, 2, 3, 4, 5].map((years) => (
                    <option key={years} value={years}>{years} year(s)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                    <span>Acceptance Odds</span>
                    <b style={{ color: meterTone(liveEvaluation.acceptanceOdds) }}>{liveEvaluation.acceptanceOdds}% • {negotiationLabel(liveEvaluation.acceptanceOdds)}</b>
                  </div>
                  <div className="progressTrack" style={{ marginTop: 4 }}>
                    <div className="progressBar" style={{ width: `${liveEvaluation.acceptanceOdds}%`, background: `linear-gradient(90deg, ${meterTone(liveEvaluation.acceptanceOdds)}, rgba(14,165,233,0.9))` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                    <span>Player Happiness</span>
                    <b style={{ color: meterTone(liveEvaluation.happinessMeter) }}>{liveEvaluation.happinessMeter}/100</b>
                  </div>
                  <div className="progressTrack" style={{ marginTop: 4 }}>
                    <div className="progressBar" style={{ width: `${liveEvaluation.happinessMeter}%`, background: `linear-gradient(90deg, ${meterTone(liveEvaluation.happinessMeter)}, rgba(14,165,233,0.9))` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                    <span>Loyalty / Team Appeal</span>
                    <b>{liveEvaluation.loyaltyMeter}/100 • {liveEvaluation.teamAppeal}/100</b>
                  </div>
                  <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className="pill" style={{ justifyContent: 'space-between' }}>
                      <span>Loyalty</span>
                      <b>{liveEvaluation.loyaltyMeter}</b>
                    </div>
                    <div className="pill" style={{ justifyContent: 'space-between' }}>
                      <span>Team Appeal</span>
                      <b>{liveEvaluation.teamAppeal}</b>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 4, fontSize: 11 }}>
                {liveEvaluation.reasons.map((reason) => (
                  <div key={reason} className="muted">• {reason}</div>
                ))}
              </div>
            </div>

            {showHistory ? (
              <div className="card" style={{ background: 'rgba(255,255,255,0.92)', padding: 12 }}>
                <b>Player History</b>
                <div style={{ marginTop: 8, display: 'grid', gap: 8, fontSize: 12 }}>
                  <div>Drafted/added in round: {selectedPlayer.acquiredRound}</div>
                  <div>Years with team: {selectedPlayer.yearsWithTeam}</div>
                  <div>Current overall/potential: {selectedPlayer.prospect.overall}/{selectedPlayer.prospect.potential}</div>
                  {playerHistory.length === 0 ? (
                    <div className="muted">No trade history logged for this player yet.</div>
                  ) : (
                    playerHistory.map((entry) => (
                      <div key={entry.id} className="pill" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <span>{entry.description}</span>
                        <span className="muted">{new Date(entry.createdAtMs).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btnSoft" onClick={() => props.onOpenTrade(selectedPlayer.id)} style={{ padding: '9px 12px' }}>
                Trade
              </button>
              <button className="btn btnSoft" onClick={() => setShowHistory((current) => !current)} style={{ padding: '9px 12px' }}>
                View History
              </button>
              <button
                className="btn btnPrimary"
                onClick={() => props.onOfferReSign(selectedPlayer.id, liveOffer)}
                disabled
                title="Re-signing is only available during end-of-season free agency"
                style={{ padding: '9px 12px', fontWeight: 900 }}
              >
                Re-sign In Free Agency
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
