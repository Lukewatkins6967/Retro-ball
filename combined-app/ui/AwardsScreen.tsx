import React, { useEffect, useMemo, useState } from 'react';
import { computeAwardRaces } from '../game/awards';
import type { FranchiseState, SeasonAwardWinner, SeasonAwards } from '../game/types';

function awardLine(winner?: SeasonAwardWinner) {
  if (!winner) return 'Race still forming';
  return `${winner.playerName} • ${winner.teamName}`;
}

function raceMetricLabel(type: 'mvp' | 'roy' | 'dpoy') {
  if (type === 'mvp') return 'MVP score';
  if (type === 'roy') return 'ROY score';
  return 'DPOY score';
}

function AwardRaceCard(props: {
  title: string;
  raceType: 'mvp' | 'roy' | 'dpoy';
  entries: SeasonAwardWinner[];
}) {
  return (
    <div className="card awardsRaceCard">
      <div className="awardsSectionLabel">{props.title}</div>
      <div className="awardsRaceList">
        {props.entries.length ? (
          props.entries.map((entry, index) => (
            <div key={`${props.raceType}-${entry.playerId}`} className="awardsRaceRow">
              <div>
                <div className="awardsRaceName">
                  #{index + 1} {entry.playerName}
                </div>
                <div className="muted">
                  {entry.teamName}
                  {entry.tagline ? ` • ${entry.tagline}` : ''}
                </div>
              </div>
              <div className="awardsRaceScore">
                {entry.score}
                <span>{raceMetricLabel(props.raceType)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="muted">No qualified players yet.</div>
        )}
      </div>
    </div>
  );
}

function AwardResultCard(props: {
  title: string;
  winner?: SeasonAwardWinner;
  accentClass: string;
}) {
  return (
    <div className={`card awardResultCard ${props.accentClass}`}>
      <div className="awardsSectionLabel">{props.title}</div>
      <div className="awardResultName">{props.winner?.playerName ?? 'TBD'}</div>
      <div className="muted">{props.winner?.teamName ?? 'Awards lock when the regular season ends.'}</div>
      {props.winner?.tagline ? <div className="awardResultTagline">{props.winner.tagline}</div> : null}
    </div>
  );
}

function RevealCard(props: {
  label: string;
  winner: SeasonAwardWinner;
  revealed: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className={`awardRevealCard ${props.revealed ? 'isRevealed' : ''} ${props.emphasis ? 'isChampion' : ''}`}>
      <div className="awardsSectionLabel">{props.label}</div>
      <div className="awardRevealName">{props.winner.playerName}</div>
      <div className="muted">{props.winner.teamName}</div>
      <div className="awardRevealTagline">{props.winner.tagline ?? 'Season-defining run'}</div>
    </div>
  );
}

function buildRevealOrder(finalists: SeasonAwardWinner[]) {
  const topThree = finalists.slice(0, 3);
  if (topThree.length < 3) return [];
  return [
    { key: 'third', label: '3rd Place', winner: topThree[2] },
    { key: 'second', label: 'Runner-Up', winner: topThree[1] },
    { key: 'first', label: 'Most Valuable Player', winner: topThree[0] },
  ];
}

export default function AwardsScreen(props: {
  franchise: FranchiseState;
  onBack: () => void;
  onOpenPlayoffs: () => void;
  onOpenHistory: () => void;
}) {
  const season = props.franchise.season;
  const latestAwards: SeasonAwards | null =
    props.franchise.seasonAwards ??
    (props.franchise.seasonAwardsHistory?.length
      ? props.franchise.seasonAwardsHistory[props.franchise.seasonAwardsHistory.length - 1]
      : null);
  const races = useMemo(() => computeAwardRaces(props.franchise), [props.franchise]);
  const finalists = latestAwards?.mvpFinalists?.length ? latestAwards.mvpFinalists : races.mvp.slice(0, 3);
  const revealOrder = useMemo(() => buildRevealOrder(finalists), [finalists]);
  const revealSeasonKey = `${latestAwards?.seasonIndex ?? props.franchise.seasonIndex}-${season?.phase ?? 'preseason'}`;
  const [revealedCount, setRevealedCount] = useState(
    latestAwards && season?.phase !== 'regular' && revealOrder.length ? 1 : 0,
  );

  useEffect(() => {
    if (!latestAwards || season?.phase === 'regular' || !revealOrder.length) {
      setRevealedCount(0);
      return;
    }

    setRevealedCount(0);
    const timers = revealOrder.map((_, index) =>
      window.setTimeout(() => {
        setRevealedCount(index + 1);
      }, 900 + index * 950),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [latestAwards, revealOrder, revealSeasonKey, season?.phase]);

  const showReveal = !!latestAwards && season?.phase !== 'regular' && revealOrder.length === 3;

  return (
    <div className="page">
      <div className="panel panelSolid awardsPage">
        <div className="awardsHero">
          <div>
            <div className="pill awardsHeroPill">
              {season?.phase === 'regular' ? 'Live race tracker' : `Season ${latestAwards?.seasonIndex ?? props.franchise.seasonIndex} awards`}
            </div>
            <h2 style={{ margin: '12px 0 0' }}>Awards Central</h2>
            <div className="muted awardsHeroCopy">
              {season?.phase === 'regular'
                ? 'Watch the MVP, ROY, and DPOY ladders shift as the season moves. Team record and efficiency matter, so the table and the stars are tied together.'
                : 'The regular season is in the books. Finalists are lined up, the big awards are locked in, and the league now has a real awards night feel.'}
            </div>
          </div>
          <div className="awardsHeroActions">
            {season?.phase === 'playoffs' ? (
              <button className="btn btnPrimary" onClick={props.onOpenPlayoffs} style={{ padding: '10px 14px', fontWeight: 900 }}>
                Open Playoffs
              </button>
            ) : null}
            <button className="btn btnSoft" onClick={props.onOpenHistory} style={{ padding: '10px 14px', fontWeight: 900 }}>
              League History
            </button>
            <button className="btn btnGhost" onClick={props.onBack} style={{ padding: '10px 14px', fontWeight: 900 }}>
              Back
            </button>
          </div>
        </div>

        {showReveal ? (
          <div className="awardRevealStage">
            <div className="awardsSectionLabel">MVP Reveal</div>
            <div className="awardRevealGrid">
              {revealOrder.map((entry, index) => (
                <RevealCard
                  key={`${entry.key}-${entry.winner.playerId}`}
                  label={entry.label}
                  winner={entry.winner}
                  revealed={index < revealedCount}
                  emphasis={entry.key === 'first'}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="awardsSummaryGrid">
          <AwardResultCard title="Most Valuable Player" winner={latestAwards?.mvp} accentClass="awardResultMvp" />
          <AwardResultCard title="Rookie of the Year" winner={latestAwards?.roy} accentClass="awardResultRoy" />
          <AwardResultCard title="Defensive Player of the Year" winner={latestAwards?.dpoy} accentClass="awardResultDpoy" />
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <AwardRaceCard title="MVP Race" raceType="mvp" entries={races.mvp} />
          <AwardRaceCard title="Rookie Race" raceType="roy" entries={races.roy} />
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <AwardRaceCard title="DPOY Race" raceType="dpoy" entries={races.dpoy} />
          <div className="card awardsRaceCard">
            <div className="awardsSectionLabel">All-League First Team</div>
            <div className="awardsRaceList">
              {(latestAwards?.allLeagueFirstTeam ?? []).length ? (
                latestAwards?.allLeagueFirstTeam.map((entry) => (
                  <div key={`${entry.slot}-${entry.playerId}`} className="awardsRaceRow">
                    <div>
                      <div className="awardsRaceName">
                        {entry.slot} • {entry.playerName}
                      </div>
                      <div className="muted">{entry.teamName}</div>
                    </div>
                    <div className="awardsRaceScore">
                      {entry.score}
                      <span>{entry.position}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">First Team selections appear once the regular season closes.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card awardsFooterCard">
          <div className="awardsSectionLabel">Headline Winners</div>
          <div className="awardsFooterGrid">
            <div>
              <div className="muted">MVP</div>
              <div className="awardsFooterLine">{awardLine(latestAwards?.mvp)}</div>
            </div>
            <div>
              <div className="muted">ROY</div>
              <div className="awardsFooterLine">{awardLine(latestAwards?.roy)}</div>
            </div>
            <div>
              <div className="muted">DPOY</div>
              <div className="awardsFooterLine">{awardLine(latestAwards?.dpoy)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
