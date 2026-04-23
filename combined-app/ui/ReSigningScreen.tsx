import React, { useMemo, useState } from 'react';
import type { FranchiseState, TeamPlayer } from '../game/types';
import { calculateMarketSalary, evaluateContractOffer } from '../game/franchise';
import Modal from './Modal';

function perGame(total: number, games: number) {
  return (total / Math.max(1, games)).toFixed(1);
}

function seasonYear(seasonIndex: number) {
  return 2025 + seasonIndex;
}

function recentAwardLabels(player: TeamPlayer, seasonIndex: number) {
  return player.awardHistory
    .filter((entry) => entry.seasonIndex === seasonIndex)
    .map((entry) => entry.label);
}

export default function ReSigningScreen(props: {
  franchise: FranchiseState;
  message?: string;
  onBack: () => void;
  onOffer: (playerId: string, offer: { salary: number; years: number }) => void;
  onLetWalk: (playerId: string) => void;
  onContinue: () => void;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [offerSalary, setOfferSalary] = useState<number | null>(null);
  const [offerYears, setOfferYears] = useState(3);

  const players = props.franchise.reSigningPlayers;
  const selectedPlayer = selectedPlayerId
    ? players.find((player) => player.id === selectedPlayerId) ?? null
    : null;
  const liveOffer = selectedPlayer
    ? {
        salary: offerSalary ?? calculateMarketSalary(selectedPlayer),
        years: offerYears,
      }
    : null;
  const liveEvaluation =
    selectedPlayer && liveOffer
      ? evaluateContractOffer(props.franchise, props.franchise.user.id, selectedPlayer, liveOffer, { isReSign: true })
      : null;
  const salaryTotal = props.franchise.user.roster.reduce((sum, player) => sum + player.contract.salary, 0);
  const capRoom = Math.max(0, props.franchise.user.salaryCap - salaryTotal);
  const currentSeasonYear = seasonYear(props.franchise.seasonIndex);

  const cards = useMemo(
    () =>
      players
        .slice()
        .sort((a, b) => b.prospect.overall - a.prospect.overall || calculateMarketSalary(b) - calculateMarketSalary(a)),
    [players],
  );

  return (
    <div className="page">
      <div className="panel panelSolid" style={{ padding: 18 }}>
        <div className="playoffHero">
          <div>
            <div className="pill awardsHeroPill">Post-Finals Window</div>
            <h2 style={{ margin: '12px 0 0' }}>Re-Signing Phase</h2>
            <div className="muted awardsHeroCopy">
              Finals are over. Lock in your expiring players before they hit the market, then roll into full free agency and the draft.
            </div>
          </div>
          <div className="playoffHeroMeta">
            <div className="playoffMetaChip">
              <span>Cap Room</span>
              <strong>${Math.round(capRoom / 1000)}k</strong>
            </div>
            <div className="playoffMetaChip">
              <span>Expiring Players</span>
              <strong>{players.length}</strong>
            </div>
            <button className="btn btnGhost" onClick={props.onBack} style={{ padding: '10px 14px', fontWeight: 900 }}>
              Back to Roster
            </button>
          </div>
        </div>

        {props.message ? (
          <div className="pill" style={{ marginTop: 14, whiteSpace: 'normal' }}>
            {props.message}
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          {cards.length ? (
            cards.map((player) => {
              const games = player.seasonStats.matchesPlayed;
              const awards = recentAwardLabels(player, props.franchise.seasonIndex);
              const marketValue = calculateMarketSalary(player);
              return (
                <div key={player.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontSize: 20, fontWeight: 1000 }}>{player.prospect.name}</div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        {player.prospect.position} • OVR {player.prospect.overall} • Age {player.prospect.age}
                      </div>
                      {awards.length ? (
                        <div className="playerBadgeRow" style={{ marginTop: 10 }}>
                          {awards.map((award) => (
                            <span key={`${player.id}-${award}`} className="playerAwardBadge tone-allLeague">
                              {award}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4, minmax(110px, 1fr))', flex: 1, minWidth: 320 }}>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>PPG</span>
                        <b>{perGame(player.seasonStats.points, games)}</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>RPG</span>
                        <b>{perGame(player.seasonStats.rebounds, games)}</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>APG</span>
                        <b>{perGame(player.seasonStats.assists, games)}</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>Games</span>
                        <b>{games}</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>Market</span>
                        <b>${Math.round(marketValue / 1000)}k</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>Last Deal</span>
                        <b>${Math.round(player.contract.salary / 1000)}k</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>Status</span>
                        <b>Expired</b>
                      </div>
                      <div className="pill" style={{ justifyContent: 'space-between' }}>
                        <span>Season</span>
                        <b>{currentSeasonYear}</b>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="btn btnPrimary"
                      style={{ padding: '10px 14px', fontWeight: 900 }}
                      onClick={() => {
                        setSelectedPlayerId(player.id);
                        setOfferSalary(calculateMarketSalary(player));
                        setOfferYears(Math.min(4, player.prospect.age >= 30 ? 2 : 3));
                      }}
                    >
                      Re-Sign Player
                    </button>
                    <button
                      className="btn btnSoft"
                      style={{ padding: '10px 14px', fontWeight: 900 }}
                      onClick={() => props.onLetWalk(player.id)}
                    >
                      Let Walk
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>No unresolved re-signings left.</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Your expiring contracts are settled, so you can move on to free agency whenever you’re ready.
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btnPrimary" onClick={props.onContinue} style={{ padding: '10px 14px', fontWeight: 900 }}>
            Continue to Free Agency
          </button>
        </div>
      </div>

      {selectedPlayer && liveOffer && liveEvaluation ? (
        <Modal title={`Re-Sign ${selectedPlayer.prospect.name}`} onClose={() => setSelectedPlayerId(null)}>
          <div className="muted" style={{ lineHeight: 1.5 }}>
            Make your final offer before {selectedPlayer.prospect.name} hits the open market.
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 900 }}>Salary Per Season</span>
              <input
                type="range"
                min={18}
                max={160}
                step={1}
                value={Math.round(liveOffer.salary / 1000)}
                onChange={(event) => setOfferSalary(Number(event.target.value) * 1000)}
              />
              <div className="muted">${Math.round(liveOffer.salary / 1000)}k per year</div>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 900 }}>Contract Length</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={liveOffer.years}
                onChange={(event) => setOfferYears(Number(event.target.value))}
              />
              <div className="muted">{liveOffer.years} year(s)</div>
            </label>

            <div className="pill" style={{ justifyContent: 'space-between' }}>
              <span>Projected Interest</span>
              <b>{liveEvaluation.acceptanceOdds}%</b>
            </div>
            <div className="pill" style={{ justifyContent: 'space-between' }}>
              <span>Target Market Value</span>
              <b>${Math.round(liveEvaluation.targetSalary / 1000)}k</b>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setSelectedPlayerId(null)} style={{ padding: '10px 14px' }}>
              Cancel
            </button>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                props.onOffer(selectedPlayer.id, liveOffer);
                setSelectedPlayerId(null);
              }}
            >
              Submit Offer
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
