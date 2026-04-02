import React, { useMemo, useState } from 'react';
import type { FranchiseState, TeamPlayer, TeamState } from '../game/types';
import { computeTradePackageValue, evaluateTradePackage, type TradeCounterOffer } from '../game/franchise';
import Modal from './Modal';
import RatingMeter from './RatingMeter';

type TradeParams = {
  fromPlayerIds: string[];
  toPlayerIds: string[];
  fromPickIds: string[];
  toPickIds: string[];
  toTeamId: string;
};

function standingRecord(franchise: FranchiseState, teamId: string) {
  const row = franchise.seasonStandings.find((entry) => entry.teamId === teamId);
  return row ? `${row.wins}-${row.losses}` : '0-0';
}

function averageCategory(team: TeamState, key: 'shooting' | 'speed' | 'playmaking' | 'defense') {
  if (!team.roster.length) return 5;
  return Math.round(team.roster.reduce((sum, player) => sum + player.prospect.categories[key], 0) / team.roster.length);
}

function weakestCategory(team: TeamState) {
  const categories = ['shooting', 'speed', 'playmaking', 'defense'] as const;
  return [...categories].sort((a, b) => averageCategory(team, a) - averageCategory(team, b))[0];
}

function playerStrengths(player: TeamPlayer) {
  const categories = [
    ['shooting', player.prospect.categories.shooting],
    ['speed', player.prospect.categories.speed],
    ['playmaking', player.prospect.categories.playmaking],
    ['defense', player.prospect.categories.defense],
  ] as const;
  const sorted = [...categories].sort((a, b) => b[1] - a[1]);
  return {
    top: `${sorted[0][0]} ${sorted[0][1]}`,
    secondary: `${sorted[1][0]} ${sorted[1][1]}`,
  };
}

function packageTone(score: ReturnType<typeof evaluateTradePackage>) {
  if (score.color === 'good') return 'var(--good)';
  if (score.color === 'fair') return 'var(--accent)';
  return 'var(--bad)';
}

function TeamMiniCard(props: { team: TeamState; franchise: FranchiseState; selected?: boolean; onClick?: () => void }) {
  return (
    <button className={`card tradePartnerCard ${props.selected ? 'tradePartnerCardActive' : ''}`} onClick={props.onClick} style={{ width: '100%', textAlign: 'left' }}>
      <div className="tradePartnerTop">
        <div style={{ minWidth: 0 }}>
          <div className="tradePartnerName">{props.team.name}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Record {standingRecord(props.franchise, props.team.id)} - Rating {props.team.teamRating.toFixed(1)}
          </div>
        </div>
        <div className="tradePartnerLogo" style={{ background: props.team.logoColor }}>
          {props.team.logoText}
        </div>
      </div>
      <div className="tradePartnerMeta">
        <span className="tradeMetaBadge">Weakness: {weakestCategory(props.team)}</span>
        <span className="tradeMetaBadge">{props.team.roster.length} players</span>
      </div>
    </button>
  );
}

function AssetChip(props: { label: string; tone?: 'neutral' | 'good' | 'info' }) {
  const background =
    props.tone === 'good'
      ? 'rgba(22,163,74,0.10)'
      : props.tone === 'info'
        ? 'rgba(14,165,233,0.10)'
        : 'rgba(15,23,42,0.05)';
  const border =
    props.tone === 'good'
      ? 'rgba(22,163,74,0.16)'
      : props.tone === 'info'
        ? 'rgba(14,165,233,0.18)'
        : 'rgba(15,23,42,0.08)';
  return (
    <span className="tradeAssetChip" style={{ background, borderColor: border }}>
      {props.label}
    </span>
  );
}

function AssetRow(props: {
  player: TeamPlayer;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const strengths = playerStrengths(props.player);
  return (
    <label className={`tradeAssetRow ${props.checked ? 'tradeAssetRowSelected' : ''}`}>
      <div className="tradeAssetMain">
        <input type="checkbox" checked={props.checked} onChange={(e) => props.onToggle(e.target.checked)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="tradeAssetName">
            {props.player.prospect.name}
            <span className="tradeAssetPos">{props.player.prospect.position}</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            OVR {props.player.prospect.overall} - POT {props.player.prospect.potential} - ${Math.round(props.player.contract.salary / 1000)}k - {props.player.contract.seasonsLeft}y
          </div>
          <div className="tradeAssetStats">
            <span>PTS {props.player.seasonStats.points}</span>
            <span>REB {props.player.seasonStats.rebounds}</span>
            <span>AST {props.player.seasonStats.assists}</span>
          </div>
          <div className="tradeAssetRatings">
            <RatingMeter value={props.player.prospect.categories.shooting} label="Shot" color="info" />
            <RatingMeter value={props.player.prospect.categories.playmaking} label="Play" color="primary" />
            <RatingMeter value={props.player.prospect.categories.defense} label="Def" color="good" />
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            Best traits: {strengths.top}, {strengths.secondary}
          </div>
        </div>
      </div>
    </label>
  );
}

function PickRow(props: {
  label: string;
  disabled?: boolean;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <label className={`tradePickRow ${props.checked ? 'tradePickRowSelected' : ''} ${props.disabled ? 'tradePickRowDisabled' : ''}`}>
      <input type="checkbox" disabled={props.disabled} checked={props.checked} onChange={(e) => props.onToggle(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

export default function TradeMenu(props: {
  franchise: FranchiseState;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
  onAccept: (params: TradeParams) => void;
  resultMessage?: string;
  counterOffer?: TradeCounterOffer;
  onBack: () => void;
}) {
  const [userPlayerIds, setUserPlayerIds] = useState<string[]>([]);
  const [partnerPlayerIds, setPartnerPlayerIds] = useState<string[]>([]);
  const [userPickIds, setUserPickIds] = useState<string[]>([]);
  const [partnerPickIds, setPartnerPickIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const leagueTeams = useMemo(() => [props.franchise.ai, ...props.franchise.otherTeams], [props.franchise]);
  const selectedTeam = useMemo(() => leagueTeams.find((team) => team.id === props.selectedTeamId) ?? null, [leagueTeams, props.selectedTeamId]);

  const userRoster = useMemo(() => [...props.franchise.user.roster].sort((a, b) => b.prospect.overall - a.prospect.overall), [props.franchise.user.roster]);
  const partnerRoster = useMemo(() => (selectedTeam ? [...selectedTeam.roster].sort((a, b) => b.prospect.overall - a.prospect.overall) : []), [selectedTeam]);

  const userPicks = props.franchise.user.draftPicks || [];
  const partnerPicks = selectedTeam?.draftPicks || [];

  const selectedUserPlayers = userRoster.filter((player) => userPlayerIds.includes(player.id));
  const selectedPartnerPlayers = partnerRoster.filter((player) => partnerPlayerIds.includes(player.id));
  const selectedUserPicks = userPicks.filter((pick) => userPickIds.includes(pick.id));
  const selectedPartnerPicks = partnerPicks.filter((pick) => partnerPickIds.includes(pick.id));

  const packageScore = evaluateTradePackage(
    { playerIds: userPlayerIds, pickIds: userPickIds },
    { playerIds: partnerPlayerIds, pickIds: partnerPickIds },
    props.franchise,
  );
  const userValue = computeTradePackageValue(props.franchise.user, userPlayerIds, userPickIds, props.franchise);
  const partnerValue = computeTradePackageValue(selectedTeam ?? props.franchise.ai, partnerPlayerIds, partnerPickIds, props.franchise);
  const canConfirm = !!selectedTeam && (userPlayerIds.length + userPickIds.length > 0) && (partnerPlayerIds.length + partnerPickIds.length > 0);
  const revealPicks = props.franchise.draftCompleted;

  const counterOffer = props.counterOffer && selectedTeam && props.counterOffer.toTeamId === selectedTeam.id ? props.counterOffer : undefined;
  const counterUserPlayers = userRoster.filter((player) => counterOffer?.fromPlayerIds.includes(player.id));
  const counterPartnerPlayers = partnerRoster.filter((player) => counterOffer?.toPlayerIds.includes(player.id));
  const counterUserPicks = userPicks.filter((pick) => counterOffer?.fromPickIds.includes(pick.id));
  const counterPartnerPicks = partnerPicks.filter((pick) => counterOffer?.toPickIds.includes(pick.id));

  const loadCounterIntoBuilder = () => {
    if (!counterOffer) return;
    setUserPlayerIds(counterOffer.fromPlayerIds);
    setPartnerPlayerIds(counterOffer.toPlayerIds);
    setUserPickIds(counterOffer.fromPickIds);
    setPartnerPickIds(counterOffer.toPickIds);
  };

  if (!selectedTeam) {
    return (
      <div className="page">
        <div className="panel panelSolid heroSurface" style={{ padding: 20 }}>
          <div className="sectionTitleRow">
            <div>
              <div className="scheduleWeekKicker">Front Office</div>
              <h2 style={{ margin: '8px 0 0' }}>Trade Market</h2>
              <div className="muted" style={{ marginTop: 8, maxWidth: 640, lineHeight: 1.55 }}>
                Pick a partner, scout their weak spots, and build a smarter package before you walk into negotiations.
              </div>
            </div>
            <button onClick={props.onBack} className="btn btnGhost">
              Back
            </button>
          </div>

          <div className="tradePartnerGrid" style={{ marginTop: 18 }}>
            {leagueTeams.map((team) => (
              <TeamMiniCard
                key={team.id}
                team={team}
                franchise={props.franchise}
                onClick={() => props.onSelectTeam(team.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="panel panelSolid heroSurface" style={{ padding: 20 }}>
        <div className="sectionTitleRow">
          <div>
            <div className="scheduleWeekKicker">Trade Desk</div>
            <h2 style={{ margin: '8px 0 0' }}>Negotiate With {selectedTeam.name}</h2>
            <div className="muted" style={{ marginTop: 8, maxWidth: 680, lineHeight: 1.55 }}>
              Build your package, compare values, and see what this deal looks like before you send it to the other front office.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => props.onSelectTeam(null)} className="btn btnSoft">
              Change Partner
            </button>
            <button onClick={props.onBack} className="btn btnGhost">
              Back
            </button>
          </div>
        </div>

        <div className="tradeOverviewGrid" style={{ marginTop: 18 }}>
          <TeamMiniCard team={props.franchise.user} franchise={props.franchise} />
          <div className="card tradeScoreCard">
            <div className="tradeScoreLabel">Package Strength</div>
            <div className="tradeScoreValue" style={{ color: packageTone(packageScore) }}>
              {packageScore.score}%
            </div>
            <div className="tradeScoreStatus">{packageScore.label}</div>
            <div className="progressTrack" style={{ marginTop: 12 }}>
              <div className="progressBar" style={{ width: `${packageScore.score}%`, background: `linear-gradient(90deg, ${packageTone(packageScore)}, rgba(14,165,233,0.9))` }} />
            </div>
            <div className="tradeValueRow">
              <span>You send value</span>
              <b>{Math.round(userValue).toLocaleString()}</b>
            </div>
            <div className="tradeValueRow">
              <span>You receive value</span>
              <b>{Math.round(partnerValue).toLocaleString()}</b>
            </div>
          </div>
          <TeamMiniCard team={selectedTeam} franchise={props.franchise} selected />
        </div>
      </div>

      <div className="tradeBuilderGrid" style={{ marginTop: 16 }}>
        <div className="panel panelSolid" style={{ padding: 16 }}>
          <div className="tradeColumnHeader">
            <div>
              <div className="tradeColumnTitle">Your Assets</div>
              <div className="muted" style={{ fontSize: 13 }}>Choose what you want to send out.</div>
            </div>
            <AssetChip label={`Record ${standingRecord(props.franchise, props.franchise.user.id)}`} tone="info" />
          </div>

          <div className="tradeAssetList" style={{ marginTop: 14 }}>
            {userRoster.map((player) => (
              <AssetRow
                key={player.id}
                player={player}
                checked={userPlayerIds.includes(player.id)}
                onToggle={(checked) =>
                  setUserPlayerIds((prev) => (checked ? [...prev, player.id] : prev.filter((id) => id !== player.id)))
                }
              />
            ))}
          </div>

          <div className="tradePickSection">
            <div className="tradeSubheader">
              <span>Your Picks</span>
              <span className="muted">{revealPicks ? 'Pick trading open' : 'Locked until lottery completes'}</span>
            </div>
            <div className="tradePickList">
              {userPicks.length ? userPicks.map((pick) => (
                <PickRow
                  key={pick.id}
                  disabled={!revealPicks}
                  checked={userPickIds.includes(pick.id)}
                  onToggle={(checked) =>
                    setUserPickIds((prev) => (checked ? [...prev, pick.id] : prev.filter((id) => id !== pick.id)))
                  }
                  label={revealPicks ? `Round ${pick.round} Pick ${pick.pickPosition}` : `Round ${pick.round} lottery pick`}
                />
              )) : <div className="muted">No picks available.</div>}
            </div>
          </div>
        </div>

        <div className="panel panelSolid tradeCenterRail" style={{ padding: 16 }}>
          <div className="tradeColumnTitle">Deal Summary</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Keep an eye on how balanced the offer looks before you send it.
          </div>

          <div className="tradeSummarySection">
            <div className="tradeSubheader">
              <span>You Send</span>
              <span>{selectedUserPlayers.length + selectedUserPicks.length} assets</span>
            </div>
            <div className="tradeChipWrap">
              {selectedUserPlayers.map((player) => <AssetChip key={player.id} label={player.prospect.name} />)}
              {selectedUserPicks.map((pick) => <AssetChip key={pick.id} label={`R${pick.round} P${pick.pickPosition}`} tone="info" />)}
              {!selectedUserPlayers.length && !selectedUserPicks.length ? <div className="muted">Nothing selected yet.</div> : null}
            </div>
          </div>

          <div className="tradeSummarySection">
            <div className="tradeSubheader">
              <span>You Receive</span>
              <span>{selectedPartnerPlayers.length + selectedPartnerPicks.length} assets</span>
            </div>
            <div className="tradeChipWrap">
              {selectedPartnerPlayers.map((player) => <AssetChip key={player.id} label={player.prospect.name} tone="good" />)}
              {selectedPartnerPicks.map((pick) => <AssetChip key={pick.id} label={`R${pick.round} P${pick.pickPosition}`} tone="info" />)}
              {!selectedPartnerPlayers.length && !selectedPartnerPicks.length ? <div className="muted">Choose assets from the other side.</div> : null}
            </div>
          </div>

          <div className="tradeRecommendationCard">
            <div className="tradeSubheader">
              <span>Scout Read</span>
              <span style={{ color: packageTone(packageScore), fontWeight: 900 }}>{packageScore.label}</span>
            </div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              {packageScore.color === 'good'
                ? 'This is close enough to feel realistic. You have a real shot if the fit makes sense.'
                : packageScore.color === 'fair'
                  ? 'This is in the compromise zone. Expect pushback or a counter if the other team likes one of its outgoing pieces.'
                  : 'This package is pretty far off. Add value or trim what you are asking for before sending it.'}
            </div>
          </div>

          {props.resultMessage ? (
            <div className="tradeMessageCard">
              {props.resultMessage}
            </div>
          ) : null}

          {counterOffer ? (
            <div className="tradeCounterCard">
              <div className="tradeSubheader">
                <span>AI Counter Offer</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btnSoft"
                    style={{ padding: '9px 12px', fontWeight: 900 }}
                    onClick={loadCounterIntoBuilder}
                  >
                    Load Counter
                  </button>
                  <button
                    className="btn btnPrimary"
                    style={{ padding: '9px 12px', fontWeight: 900 }}
                    onClick={() =>
                      props.onAccept({
                        fromPlayerIds: counterOffer.fromPlayerIds,
                        toPlayerIds: counterOffer.toPlayerIds,
                        fromPickIds: counterOffer.fromPickIds,
                        toPickIds: counterOffer.toPickIds,
                        toTeamId: counterOffer.toTeamId,
                      })
                    }
                  >
                    Accept Counter
                  </button>
                </div>
              </div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
                {counterOffer.message}
              </div>
              <div className="muted" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                You do not have to match this exactly. Loading it into the builder gives you a softer starting point, and deals that stay close to the compromise are now much more likely to go through.
              </div>
              <div className="tradeCounterGrid">
                <div>
                  <div className="tradeCounterLabel">You Send</div>
                  <div className="tradeChipWrap">
                    {counterUserPlayers.map((player) => <AssetChip key={player.id} label={player.prospect.name} />)}
                    {counterUserPicks.map((pick) => <AssetChip key={pick.id} label={`R${pick.round} P${pick.pickPosition}`} tone="info" />)}
                  </div>
                </div>
                <div>
                  <div className="tradeCounterLabel">You Receive</div>
                  <div className="tradeChipWrap">
                    {counterPartnerPlayers.map((player) => <AssetChip key={player.id} label={player.prospect.name} tone="good" />)}
                    {counterPartnerPicks.map((pick) => <AssetChip key={pick.id} label={`R${pick.round} P${pick.pickPosition}`} tone="info" />)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn btnPrimary" disabled={!canConfirm} onClick={() => setConfirmOpen(true)} style={{ width: '100%', fontWeight: 900 }}>
              Review Trade
            </button>
            <div className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45 }}>
              Tip: higher potential, better production, and controlled contracts usually carry the most weight.
            </div>
          </div>
        </div>

        <div className="panel panelSolid" style={{ padding: 16 }}>
          <div className="tradeColumnHeader">
            <div>
              <div className="tradeColumnTitle">{selectedTeam.name} Assets</div>
              <div className="muted" style={{ fontSize: 13 }}>Target the pieces you want back.</div>
            </div>
            <AssetChip label={`Weakness: ${weakestCategory(selectedTeam)}`} tone="good" />
          </div>

          <div className="tradeAssetList" style={{ marginTop: 14 }}>
            {partnerRoster.map((player) => (
              <AssetRow
                key={player.id}
                player={player}
                checked={partnerPlayerIds.includes(player.id)}
                onToggle={(checked) =>
                  setPartnerPlayerIds((prev) => (checked ? [...prev, player.id] : prev.filter((id) => id !== player.id)))
                }
              />
            ))}
          </div>

          <div className="tradePickSection">
            <div className="tradeSubheader">
              <span>{selectedTeam.name} Picks</span>
              <span className="muted">{revealPicks ? 'Pick trading open' : 'Locked until lottery completes'}</span>
            </div>
            <div className="tradePickList">
              {partnerPicks.length ? partnerPicks.map((pick) => (
                <PickRow
                  key={pick.id}
                  disabled={!revealPicks}
                  checked={partnerPickIds.includes(pick.id)}
                  onToggle={(checked) =>
                    setPartnerPickIds((prev) => (checked ? [...prev, pick.id] : prev.filter((id) => id !== pick.id)))
                  }
                  label={revealPicks ? `Round ${pick.round} Pick ${pick.pickPosition}` : `Round ${pick.round} lottery pick`}
                />
              )) : <div className="muted">No picks available.</div>}
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && selectedTeam && (
        <Modal title="Review Trade Offer" width="min(640px, calc(100vw - 24px))" maxHeight="90vh" onClose={() => setConfirmOpen(false)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="tradeConfirmHero">
              <div>
                <div className="tradeScoreLabel">Final Check</div>
                <div className="tradeScoreValue" style={{ fontSize: 34, color: packageTone(packageScore) }}>
                  {packageScore.score}%
                </div>
                <div className="tradeScoreStatus">{packageScore.label}</div>
              </div>
              <div className="muted" style={{ maxWidth: 260, lineHeight: 1.5 }}>
                This is the exact package your front office is about to send to {selectedTeam.name}.
              </div>
            </div>

            <div className="tradeCounterGrid">
              <div className="card" style={{ padding: 12 }}>
                <div className="tradeCounterLabel">You Send</div>
                <div className="tradeChipWrap" style={{ marginTop: 10 }}>
                  {selectedUserPlayers.map((player) => <AssetChip key={player.id} label={player.prospect.name} />)}
                  {selectedUserPicks.map((pick) => <AssetChip key={pick.id} label={`R${pick.round} P${pick.pickPosition}`} tone="info" />)}
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="tradeCounterLabel">You Receive</div>
                <div className="tradeChipWrap" style={{ marginTop: 10 }}>
                  {selectedPartnerPlayers.map((player) => <AssetChip key={player.id} label={player.prospect.name} tone="good" />)}
                  {selectedPartnerPicks.map((pick) => <AssetChip key={pick.id} label={`R${pick.round} P${pick.pickPosition}`} tone="info" />)}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="tradeValueRow">
                <span>Your outgoing package</span>
                <b>{Math.round(userValue).toLocaleString()}</b>
              </div>
              <div className="tradeValueRow">
                <span>Your incoming package</span>
                <b>{Math.round(partnerValue).toLocaleString()}</b>
              </div>
              <div className="tradeValueRow">
                <span>Projected team swing</span>
                <b>{(props.franchise.user.teamRating + (partnerValue - userValue) / 20).toFixed(1)}</b>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btnGhost" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btnPrimary"
                style={{ fontWeight: 900 }}
                onClick={() => {
                  props.onAccept({
                    fromPlayerIds: userPlayerIds,
                    toPlayerIds: partnerPlayerIds,
                    fromPickIds: userPickIds,
                    toPickIds: partnerPickIds,
                    toTeamId: selectedTeam.id,
                  });
                  setConfirmOpen(false);
                }}
              >
                Confirm Trade
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
