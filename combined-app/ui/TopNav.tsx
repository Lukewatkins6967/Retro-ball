import React from 'react';

export default function TopNav(props: {
  current: 'start' | 'lottery' | 'draft' | 'roster' | 'stats' | 'game' | 'seasonSchedule' | 'playoffs' | 'news' | 'freeAgency' | 'updateLog' | string;
  hasFranchise: boolean;
  freeAgencyEnabled: boolean;
  onNavigate: (screen: 'draft' | 'roster' | 'stats' | 'seasonSchedule' | 'game' | 'news' | 'freeAgency') => void;
  onOpenSettings: () => void;
  onRestart: () => void;
}) {
  const statusText = !props.hasFranchise
    ? 'New franchise setup'
    : props.freeAgencyEnabled
      ? 'Offseason market open'
      : 'Season in progress';

  const navBtn = (label: string, target: 'draft' | 'roster' | 'stats' | 'seasonSchedule' | 'game' | 'freeAgency') => {
    const active = props.current === target;
    const disabled = (!props.hasFranchise && target !== 'draft') || (target === 'freeAgency' && !props.freeAgencyEnabled);

    return (
      <button
        className={`btn navBtn ${active ? 'btnPrimary navBtnActive' : 'btnSoft'}`}
        disabled={disabled}
        onClick={() => props.onNavigate(target)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="navRoot">
      <div className="navShell">
        <div className="navBrandBlock">
          <div className="navBrandBadge">
            HB
          </div>
          <div>
            <div className="navBrandTitle">Hybrid Basketball</div>
            <div className="navBrandSubtitle">Retro Bowl management + NBA-style league control</div>
          </div>
        </div>

        <div className="navActions">
          <span className="navStatusPill">{statusText}</span>
          <div className="navLinks">
            {navBtn('Draft', 'draft')}
            {navBtn('Roster', 'roster')}
            {navBtn('Free Agency', 'freeAgency')}
            {navBtn('Stats', 'stats')}
            {navBtn('Season', 'seasonSchedule')}
            <button
              className={`btn navBtn ${props.current === 'news' ? 'btnPrimary navBtnActive' : 'btnSoft'}`}
              disabled={!props.hasFranchise}
              onClick={() => props.onNavigate('news')}
              title="League News (simulated feed)"
            >
              News
            </button>
            <button
              className="btn navBtn navBtnSettings"
              onClick={props.onOpenSettings}
              title="Open settings"
            >
              <span aria-hidden="true">🎛️</span>
            </button>
            <button
              className="btn navBtn navBtnDanger"
              disabled={!props.hasFranchise}
              onClick={props.onRestart}
              title="Restart (resets all progress)"
            >
              Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
