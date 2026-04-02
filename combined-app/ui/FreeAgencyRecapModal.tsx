import React, { useMemo } from 'react';
import type { FranchiseState } from '../game/types';
import { getRotationMetrics } from '../game/stamina';
import Modal from './Modal';

export default function FreeAgencyRecapModal(props: {
  franchise: FranchiseState;
  onClose: () => void;
}) {
  const summaries = props.franchise.freeAgencyState?.dailySummaries ?? [];

  const signings = useMemo(
    () =>
      summaries.flatMap((summary) =>
        summary.signings.map((signing) => ({
          ...signing,
          day: summary.day,
        })),
      ),
    [summaries],
  );

  const biggestDeals = useMemo(
    () =>
      signings
        .slice()
        .sort((a, b) => b.salary - a.salary || b.years - a.years)
        .slice(0, 5),
    [signings],
  );

  const biddingWarFeeds = useMemo(
    () =>
      summaries
        .flatMap((summary) => summary.feed.map((feed) => ({ day: summary.day, feed })))
        .filter((entry) => entry.feed.toLowerCase().includes('bidding war'))
        .slice(0, 6),
    [summaries],
  );

  const depthRows = useMemo(() => {
    const teams = [props.franchise.user, props.franchise.ai, ...props.franchise.otherTeams];
    return teams
      .map((team) => {
        const rotation = getRotationMetrics(team);
        return {
          teamId: team.id,
          teamName: team.name,
          rosterSize: team.roster.length,
          starterRating: rotation.starterRating.toFixed(1),
          benchRating: rotation.benchRating.toFixed(1),
          depthRating: rotation.depthScore.toFixed(1),
        };
      })
      .sort((a, b) => Number(b.depthRating) - Number(a.depthRating))
      .slice(0, 8);
  }, [props.franchise]);

  return (
    <Modal title="Free Agency Recap" onClose={props.onClose} width="min(980px, calc(100vw - 24px))" maxHeight="90vh">
      <div className="faRecapShell">
        <div className="faRecapHero">
          <div>
            <div className="faRecapKicker">Market Closed</div>
            <div className="faRecapTitle">The league just finished free agency.</div>
            <div className="faRecapSubtitle">
              Review the biggest signings, late bidding wars, and which teams built the deepest rotations before the next phase.
            </div>
          </div>
          <button className="btn btnPrimary" onClick={props.onClose} style={{ padding: '10px 16px', fontWeight: 900 }}>
            Close and Continue
          </button>
        </div>

        <div className="faRecapGrid">
          <div className="faRecapCard">
            <div className="faRecapSectionTitle">Signings</div>
            <div className="faRecapList">
              {signings.length ? (
                signings.map((signing) => (
                  <div key={`${signing.day}-${signing.playerId}-${signing.teamId}`} className="faRecapItem">
                    <div>
                      <div className="faRecapItemTitle">{signing.playerName}</div>
                      <div className="faRecapItemMeta">
                        {signing.teamName} | {signing.role} | Day {signing.day}
                      </div>
                    </div>
                    <div className="faRecapContract">
                      ${Math.round(signing.salary / 1000)}k x {signing.years}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No signings were completed this cycle.</div>
              )}
            </div>
          </div>

          <div className="faRecapCard">
            <div className="faRecapSectionTitle">Top Moves</div>
            <div className="faRecapList">
              {biggestDeals.length ? (
                biggestDeals.map((deal) => (
                  <div key={`${deal.playerId}-${deal.teamId}-${deal.salary}`} className="faRecapItem">
                    <div>
                      <div className="faRecapItemTitle">{deal.playerName}</div>
                      <div className="faRecapItemMeta">{deal.teamName}</div>
                    </div>
                    <div className="faRecapContract">
                      ${Math.round(deal.salary / 1000)}k x {deal.years}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">The market stayed quiet at the very top.</div>
              )}
            </div>
          </div>

          <div className="faRecapCard">
            <div className="faRecapSectionTitle">Bidding War Highlights</div>
            <div className="faRecapFeed">
              {biddingWarFeeds.length ? (
                biddingWarFeeds.map((entry) => (
                  <div key={`${entry.day}-${entry.feed}`} className="faRecapFeedItem">
                    <span className="faRecapFeedTag">Day {entry.day}</span>
                    <span>{entry.feed}</span>
                  </div>
                ))
              ) : (
                <div className="muted">No major bidding wars broke loose this year.</div>
              )}
            </div>
          </div>

          <div className="faRecapCard">
            <div className="faRecapSectionTitle">Depth Leaders</div>
            <div className="faRecapFeed">
              {depthRows.map((row) => (
                <div key={row.teamId} className="faRecapDepthRow">
                  <div>
                    <div className="faRecapItemTitle">{row.teamName}</div>
                    <div className="faRecapItemMeta">{row.rosterSize} players on roster</div>
                  </div>
                  <div className="faRecapDepthStats">
                    <span>Starters {row.starterRating}</span>
                    <span>Bench {row.benchRating}</span>
                    <span>Depth {row.depthRating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
