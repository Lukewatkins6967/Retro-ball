import React, { useMemo, useState } from 'react';
import type { FranchiseState, TeamPlayer } from '../game/types';
import { calculateMarketSalary, evaluateContractOffer } from '../game/franchise';
import { getPlayerDemandList } from '../game/personality';
import RatingMeter from './RatingMeter';
import Modal from './Modal';

type SortKey = 'overall' | 'potential' | 'salary';

function marketSort(players: TeamPlayer[], sortBy: SortKey) {
  return players
    .slice()
    .sort((a, b) => {
      if (sortBy === 'salary') return b.contract.salary - a.contract.salary;
      if (sortBy === 'potential') return b.prospect.potential - a.prospect.potential || b.prospect.overall - a.prospect.overall;
      return b.prospect.overall - a.prospect.overall || b.prospect.potential - a.prospect.potential;
    });
}

function perGame(total: number, games: number) {
  return (total / Math.max(1, games)).toFixed(1);
}

function playerTotals(player: TeamPlayer) {
  const games = player.seasonStats.matchesPlayed + player.playoffStats.matchesPlayed;
  const points = player.seasonStats.points + player.playoffStats.points;
  const rebounds = player.seasonStats.rebounds + player.playoffStats.rebounds;
  const assists = player.seasonStats.assists + player.playoffStats.assists;
  const steals = player.seasonStats.steals + player.playoffStats.steals;
  const blocks = player.seasonStats.blocks + player.playoffStats.blocks;
  const efficiency = ((points + rebounds + assists * 1.3 + steals * 1.7 + blocks * 1.7) / Math.max(1, games)).toFixed(1);
  return {
    games,
    points,
    rebounds,
    assists,
    steals,
    blocks,
    efficiency,
  };
}

function meterTone(value: number) {
  if (value >= 75) return 'var(--good)';
  if (value >= 50) return 'var(--accent)';
  return 'var(--bad)';
}

function offerTone(value: number) {
  if (value >= 78) return 'var(--good)';
  if (value >= 58) return 'var(--accent)';
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

function interestLabel(value: number) {
  if (value >= 78) return 'Ready to sign';
  if (value >= 60) return 'Strong interest';
  if (value >= 42) return 'Listening';
  return 'Cold market';
}

function tagTone(player: TeamPlayer) {
  if (player.prospect.overall >= 90) {
    return {
      label: 'Franchise Star',
      bg: 'rgba(245,158,11,0.14)',
      border: 'rgba(245,158,11,0.24)',
      color: 'rgba(180,83,9,0.98)',
    };
  }
  if (player.prospect.potential >= 9) {
    return {
      label: 'High Potential',
      bg: 'rgba(37,99,235,0.12)',
      border: 'rgba(37,99,235,0.22)',
      color: 'rgba(29,78,216,0.98)',
    };
  }
  return null;
}

export default function FreeAgencyScreen(props: {
  franchise: FranchiseState;
  onBack: () => void;
  onOffer: (playerId: string, offer: { salary: number; years: number }) => void;
  onAdvanceDay: () => void;
  onContinue: () => void;
  message?: string;
}) {
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortKey>('overall');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [offerSalary, setOfferSalary] = useState<number | null>(null);
  const [offerYears, setOfferYears] = useState(3);

  const freeAgencyState = props.franchise.freeAgencyState ?? {
    currentDay: 1,
    totalDays: 7,
    dailySummaries: [],
  };
  const processedDays = freeAgencyState.dailySummaries.length;
  const marketClosed = processedDays >= freeAgencyState.totalDays;
  const dayLabel = marketClosed
    ? `Market Closed after Day ${freeAgencyState.totalDays}`
    : `Day ${Math.min(freeAgencyState.currentDay, freeAgencyState.totalDays)} of ${freeAgencyState.totalDays}`;
  const latestSummary = processedDays ? freeAgencyState.dailySummaries[processedDays - 1] : null;

  const salaryTotal = props.franchise.user.roster.reduce((sum, player) => sum + player.contract.salary, 0);
  const capSpace = Math.max(0, props.franchise.user.salaryCap - salaryTotal);
  const positions = ['All', ...Array.from(new Set(props.franchise.freeAgents.map((player) => player.prospect.position)))];

  const filteredMarket = useMemo(() => {
    const base =
      positionFilter === 'All'
        ? props.franchise.freeAgents
        : props.franchise.freeAgents.filter((player) => player.prospect.position === positionFilter);
    return marketSort(base, sortBy);
  }, [positionFilter, props.franchise.freeAgents, sortBy]);

  const totalOpenOffers = props.franchise.freeAgents.reduce((sum, player) => sum + (player.marketOffers?.length ?? 0), 0);
  const userOffersLive = props.franchise.freeAgents.filter((player) => player.marketOffers?.some((offer) => offer.teamId === props.franchise.user.id)).length;

  const selectedPlayer = selectedPlayerId
    ? props.franchise.freeAgents.find((player) => player.id === selectedPlayerId) ?? null
    : null;
  const liveOffer = selectedPlayer
    ? {
        salary: offerSalary ?? calculateMarketSalary(selectedPlayer),
        years: offerYears,
      }
    : null;
  const liveEvaluation =
    selectedPlayer && liveOffer
      ? evaluateContractOffer(props.franchise, props.franchise.user.id, selectedPlayer, liveOffer)
      : null;

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 18 }}>
        <div
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.9fr)',
            alignItems: 'stretch',
          }}
        >
          <div
            className="card"
            style={{
              padding: 18,
              background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.96))',
              color: 'white',
              border: '1px solid rgba(148,163,184,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 260 }}>
                <div className="pill" style={{ background: 'rgba(148,163,184,0.16)', borderColor: 'rgba(148,163,184,0.2)', color: 'rgba(226,232,240,0.96)', width: 'fit-content' }}>
                  {dayLabel}
                </div>
                <h2 style={{ margin: '12px 0 0', fontSize: 30, lineHeight: 1.02 }}>Free Agency Hub</h2>
                <div style={{ marginTop: 8, color: 'rgba(226,232,240,0.86)', maxWidth: 640, fontSize: 14 }}>
                  Run the market day by day, monitor bidding wars, and build real depth before the lottery and draft.
                </div>
              </div>
              <div style={{ minWidth: 220, textAlign: 'right' }}>
                <div style={{ color: 'rgba(191,219,254,0.9)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Salary Cap
                </div>
                <div style={{ fontWeight: 1000, fontSize: 30, marginTop: 4 }}>${Math.round(capSpace / 1000)}k</div>
                <div style={{ color: 'rgba(226,232,240,0.7)', fontSize: 13, marginTop: 6 }}>
                  ${Math.round(salaryTotal / 1000)}k committed of $350k
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: 'grid',
                gap: 10,
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              }}
            >
              <div className="pill" style={{ justifyContent: 'space-between', background: 'rgba(59,130,246,0.16)', borderColor: 'rgba(96,165,250,0.24)', color: 'white' }}>
                <span>Open Players</span>
                <b>{props.franchise.freeAgents.length}</b>
              </div>
              <div className="pill" style={{ justifyContent: 'space-between', background: 'rgba(14,165,233,0.16)', borderColor: 'rgba(56,189,248,0.24)', color: 'white' }}>
                <span>Active Offers</span>
                <b>{totalOpenOffers}</b>
              </div>
              <div className="pill" style={{ justifyContent: 'space-between', background: 'rgba(16,185,129,0.14)', borderColor: 'rgba(52,211,153,0.22)', color: 'white' }}>
                <span>Your Bids</span>
                <b>{userOffersLive}</b>
              </div>
              <div className="pill" style={{ justifyContent: 'space-between', background: 'rgba(245,158,11,0.14)', borderColor: 'rgba(251,191,36,0.24)', color: 'white' }}>
                <span>Days Done</span>
                <b>{processedDays}/{freeAgencyState.totalDays}</b>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btnSoft" onClick={props.onBack} style={{ padding: '10px 14px' }}>
                Back to Roster
              </button>
              <button
                className="btn btnPrimary"
                onClick={props.onAdvanceDay}
                disabled={marketClosed}
                style={{ padding: '10px 14px', fontWeight: 900, opacity: marketClosed ? 0.55 : 1 }}
              >
                Advance Day
              </button>
              <button className="btn btnPrimary" onClick={props.onContinue} style={{ padding: '10px 14px', fontWeight: 900 }}>
                {marketClosed ? 'Continue to Lottery' : 'Sim Remaining Days & Continue'}
              </button>
            </div>
            {props.message ? (
              <div className="pill" style={{ marginTop: 12, whiteSpace: 'normal', maxWidth: 760 }}>
                {props.message}
              </div>
            ) : null}
          </div>

          <div className="card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Daily Summary</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  {latestSummary ? `Results from Day ${latestSummary.day}` : 'Advance the market to generate the first daily recap.'}
                </div>
              </div>
              {latestSummary?.signings.length ? (
                <div className="pill" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.2)', color: 'rgba(5,150,105,0.95)' }}>
                  {latestSummary.signings.length} signing{latestSummary.signings.length === 1 ? '' : 's'}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {latestSummary ? (
                <>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                      News Feed
                    </div>
                    <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      {latestSummary.feed.map((item) => (
                        <div key={item} className="pill" style={{ whiteSpace: 'normal', alignItems: 'flex-start' }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                    <div className="card" style={{ padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                        New Offers
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 1000, marginTop: 6 }}>{latestSummary.newOffers.length}</div>
                    </div>
                    <div className="card" style={{ padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                        Biggest Deal
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, marginTop: 8 }}>
                        {latestSummary.biggestContracts[0]
                          ? `${latestSummary.biggestContracts[0].playerName} - $${Math.round(latestSummary.biggestContracts[0].salary / 1000)}k`
                          : 'No contracts yet'}
                      </div>
                    </div>
                  </div>

                  {latestSummary.biggestContracts.length ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {latestSummary.biggestContracts.map((deal) => (
                        <div key={`${deal.playerName}-${deal.teamName}-${deal.salary}`} className="pill" style={{ justifyContent: 'space-between', whiteSpace: 'normal' }}>
                          <span>
                            <b>{deal.playerName}</b> to {deal.teamName}
                          </span>
                          <span>${Math.round(deal.salary / 1000)}k x {deal.years}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>
                  No summary yet. Once you advance a day, signings, bidding wars, and contract headlines will show up here.
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Filter Position</span>
            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}>
              {positions.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Sort By</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}>
              <option value="overall">Overall</option>
              <option value="potential">Potential</option>
              <option value="salary">Expected Salary</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {filteredMarket.length === 0 ? (
            <div className="card">
              <b>No free agents match those filters.</b>
            </div>
          ) : (
            filteredMarket.map((player) => {
              const expectedSalary = calculateMarketSalary(player);
              const tag = tagTone(player);
              const totals = playerTotals(player);
              const userOffer = player.marketOffers?.find((offer) => offer.teamId === props.franchise.user.id);
              const bestOffer = player.marketOffers?.[0];
              const demands = getPlayerDemandList(player, props.franchise.user, props.franchise).slice(0, 3);
              return (
                <button
                  key={player.id}
                  className="card playerCardInteractive"
                  onClick={() => {
                    setSelectedPlayerId(player.id);
                    setOfferYears(userOffer?.years ?? 3);
                    setOfferSalary(userOffer?.salary ?? expectedSalary);
                  }}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gap: 16,
                      gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(240px, 0.85fr) minmax(220px, 0.75fr)',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 1000, fontSize: 20 }}>{player.prospect.name}</div>
                        {tag ? (
                          <div className="pill" style={{ background: tag.bg, borderColor: tag.border, color: tag.color, fontWeight: 900 }}>
                            {tag.label}
                          </div>
                        ) : null}
                        {bestOffer && bestOffer.teamId !== props.franchise.user.id && (bestOffer.acceptanceOdds ?? 0) >= 70 ? (
                          <div className="pill" style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.18)', color: 'rgba(185,28,28,0.95)', fontWeight: 900 }}>
                            Hot market
                          </div>
                        ) : null}
                      </div>

                      <div className="muted" style={{ marginTop: 5, fontSize: 13 }}>
                        {player.prospect.position} | Age {player.prospect.age} | Height {player.prospect.height}" | OVR {player.prospect.overall} | POT {player.prospect.potential}
                      </div>

                      {player.formerTeamName ? (
                        <div style={{ marginTop: 10 }}>
                          <span className="pill" style={{ fontSize: 12 }}>
                            Former team: <b>{player.formerTeamName}</b>
                          </span>
                        </div>
                      ) : null}

                      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <RatingMeter value={player.prospect.categories.shooting} label="Shot" color="info" />
                        <RatingMeter value={player.prospect.categories.playmaking} label="Play" color="primary" />
                        <RatingMeter value={player.prospect.categories.defense} label="Defense" color="good" />
                        <RatingMeter value={player.prospect.categories.speed} label="Speed" color="accent" />
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                          <span className="muted">Morale</span>
                          <b style={{ color: offerTone(player.morale) }}>
                            {player.morale}/100 • <span style={{ color: statusTone(player.status) }}>{player.status}</span>
                          </b>
                        </div>
                        <div className="progressTrack">
                          <div className="progressBar" style={{ width: `${player.morale}%`, background: `linear-gradient(90deg, ${offerTone(player.morale)}, rgba(14,165,233,0.9))` }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                        Production Snapshot
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
                        <div className="pill" style={{ justifyContent: 'space-between' }}><span>PTS</span><b>{perGame(totals.points, totals.games)}</b></div>
                        <div className="pill" style={{ justifyContent: 'space-between' }}><span>REB</span><b>{perGame(totals.rebounds, totals.games)}</b></div>
                        <div className="pill" style={{ justifyContent: 'space-between' }}><span>AST</span><b>{perGame(totals.assists, totals.games)}</b></div>
                        <div className="pill" style={{ justifyContent: 'space-between' }}><span>STL</span><b>{perGame(totals.steals, totals.games)}</b></div>
                        <div className="pill" style={{ justifyContent: 'space-between' }}><span>BLK</span><b>{perGame(totals.blocks, totals.games)}</b></div>
                        <div className="pill" style={{ justifyContent: 'space-between' }}><span>EFF</span><b>{totals.efficiency}</b></div>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        Expected contract: <b>${Math.round(expectedSalary / 1000)}k</b> per year
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                      <div className="card" style={{ padding: 12, background: 'rgba(15,23,42,0.03)' }}>
                        <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                          Market Board
                        </div>
                        <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 12 }}>
                          <div className="pill" style={{ justifyContent: 'space-between' }}>
                            <span>Total offers</span>
                            <b>{player.marketOffers?.length ?? 0}</b>
                          </div>
                          <div className="pill" style={{ justifyContent: 'space-between' }}>
                            <span>Your interest</span>
                            <b style={{ color: offerTone(userOffer?.acceptanceOdds ?? 0) }}>
                              {userOffer ? `${userOffer.acceptanceOdds ?? 0}%` : 'No bid'}
                            </b>
                          </div>
                          <div className="pill" style={{ justifyContent: 'space-between', whiteSpace: 'normal' }}>
                            <span>Best offer</span>
                            <b>
                              {bestOffer
                                ? `${bestOffer.teamName} - ${bestOffer.role}`
                                : 'Market quiet'}
                            </b>
                          </div>
                        </div>
                      </div>

                      {userOffer ? (
                        <div className="pill" style={{ justifyContent: 'space-between', whiteSpace: 'normal' }}>
                          <span>Your deal: ${Math.round(userOffer.salary / 1000)}k x {userOffer.years} ({userOffer.role})</span>
                          <span style={{ color: offerTone(userOffer.acceptanceOdds ?? 0), fontWeight: 900 }}>
                            {interestLabel(userOffer.acceptanceOdds ?? userOffer.happiness)}
                          </span>
                        </div>
                      ) : (
                        <div className="pill" style={{ whiteSpace: 'normal' }}>
                          No offer submitted yet. Click to open negotiations.
                        </div>
                      )}

                      {demands.length ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {demands.map((demand) => (
                            <div key={demand} className="pill" style={{ whiteSpace: 'normal' }}>
                              {demand}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedPlayer && liveOffer && liveEvaluation ? (
        <Modal title={`${selectedPlayer.prospect.name} Negotiation`} onClose={() => setSelectedPlayerId(null)} size="medium">
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(14,165,233,0.05))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 1000, fontSize: 24 }}>{selectedPlayer.prospect.name}</div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {selectedPlayer.prospect.position} | Age {selectedPlayer.prospect.age} | OVR {selectedPlayer.prospect.overall} | POT {selectedPlayer.prospect.potential}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted" style={{ fontSize: 12 }}>Expected Range</div>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>
                    ${Math.round(liveEvaluation.minSalary / 1000)}k - ${Math.round(liveEvaluation.maxSalary / 1000)}k
                  </div>
                  <div className="pill" style={{ marginTop: 8, width: 'fit-content', marginLeft: 'auto' }}>
                    Role offered: <b>{liveEvaluation.offeredRole}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <b>Player Demands</b>
                <div className="pill" style={{ color: statusTone(selectedPlayer.status) }}>
                  {selectedPlayer.status.toUpperCase()}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span>Morale</span>
                  <b style={{ color: offerTone(selectedPlayer.morale) }}>{selectedPlayer.morale}/100</b>
                </div>
                <div className="progressTrack" style={{ marginTop: 6 }}>
                  <div className="progressBar" style={{ width: `${selectedPlayer.morale}%`, background: `linear-gradient(90deg, ${offerTone(selectedPlayer.morale)}, rgba(14,165,233,0.9))` }} />
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
              <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
                {getPlayerDemandList(selectedPlayer, props.franchise.user, props.franchise).map((demand) => (
                  <div key={demand} className="pill" style={{ whiteSpace: 'normal' }}>
                    {demand}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <b>Contract Offer</b>
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span>Annual Salary</span>
                  <b>${Math.round(liveOffer.salary / 1000)}k</b>
                </div>
                <input
                  type="range"
                  min={Math.round(liveEvaluation.minSalary / 1000)}
                  max={Math.round(liveEvaluation.maxSalary / 1000)}
                  value={Math.round(liveOffer.salary / 1000)}
                  onChange={(e) => setOfferSalary(Number(e.target.value) * 1000)}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span>Contract Length</span>
                  <b>{offerYears} year(s)</b>
                </div>
                <select value={offerYears} onChange={(e) => setOfferYears(Number(e.target.value))} style={{ marginTop: 8, width: '100%', padding: 10, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}>
                  {[1, 2, 3, 4, 5].map((years) => (
                    <option key={years} value={years}>{years} year(s)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                    <span>Chance to Sign</span>
                    <b style={{ color: meterTone(liveEvaluation.acceptanceOdds) }}>{liveEvaluation.acceptanceOdds}%</b>
                  </div>
                  <div className="progressTrack" style={{ marginTop: 6 }}>
                    <div className="progressBar" style={{ width: `${liveEvaluation.acceptanceOdds}%`, background: `linear-gradient(90deg, ${meterTone(liveEvaluation.acceptanceOdds)}, rgba(14,165,233,0.9))` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                    <span>Player Happiness</span>
                    <b style={{ color: meterTone(liveEvaluation.happinessMeter) }}>{liveEvaluation.happinessMeter}/100</b>
                  </div>
                  <div className="progressTrack" style={{ marginTop: 6 }}>
                    <div className="progressBar" style={{ width: `${liveEvaluation.happinessMeter}%`, background: `linear-gradient(90deg, ${meterTone(liveEvaluation.happinessMeter)}, rgba(14,165,233,0.9))` }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="pill" style={{ justifyContent: 'space-between' }}><span>Loyalty</span><b>{liveEvaluation.loyaltyMeter}</b></div>
                  <div className="pill" style={{ justifyContent: 'space-between' }}><span>Team Appeal</span><b>{liveEvaluation.teamAppeal}</b></div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 12 }}>
                {liveEvaluation.reasons.map((reason) => (
                  <div key={reason} className="muted">- {reason}</div>
                ))}
              </div>
            </div>

            <div className="card">
              <b>Live Offer Board</b>
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Players compare salary, role, loyalty, and team situation across every bid on the board.
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {(selectedPlayer.marketOffers ?? []).length ? (
                  (selectedPlayer.marketOffers ?? []).map((marketOffer) => (
                    <div
                      key={`${marketOffer.teamId}-${marketOffer.salary}-${marketOffer.years}-${marketOffer.day}`}
                      className="pill"
                      style={{ justifyContent: 'space-between', flexWrap: 'wrap', whiteSpace: 'normal' }}
                    >
                      <span>
                        <b>{marketOffer.teamName}</b> | ${Math.round(marketOffer.salary / 1000)}k | {marketOffer.years} yrs | {marketOffer.role} | Day {marketOffer.day}
                        {marketOffer.fromOriginalTeam ? ' | Original team' : ''}
                      </span>
                      <span style={{ color: offerTone(marketOffer.acceptanceOdds ?? marketOffer.happiness), fontWeight: 900 }}>
                        {marketOffer.acceptanceOdds ?? marketOffer.happiness}% chance
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="muted" style={{ fontSize: 12 }}>
                    No outside offers are on the board yet.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                className="btn btnPrimary"
                onClick={() => props.onOffer(selectedPlayer.id, liveOffer)}
                disabled={marketClosed}
                style={{ padding: '10px 14px', fontWeight: 900, opacity: marketClosed ? 0.55 : 1 }}
              >
                {marketClosed ? 'Market Closed' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
