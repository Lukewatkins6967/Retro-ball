import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import type {
  AiAggressivenessPreset,
  AppTheme,
  DifficultyPreset,
  GameSettings,
  GameSpeedPreset,
  InjuryFrequencyPreset,
  SalaryCapPreset,
  StaminaImpactPreset,
} from '../game/settings';

type SettingsCategory = 'ui' | 'gameplay' | 'difficulty' | 'audio';

const CATEGORY_META: Array<{ id: SettingsCategory; label: string; icon: string }> = [
  { id: 'ui', label: 'Themes', icon: '🎨' },
  { id: 'gameplay', label: 'Gameplay', icon: '🏀' },
  { id: 'difficulty', label: 'Difficulty', icon: '🔥' },
  { id: 'audio', label: 'Audio', icon: '🎧' },
];

const THEME_OPTIONS: Array<{ value: AppTheme; label: string; emoji: string; description: string }> = [
  { value: 'modern', label: 'Modern Edge', emoji: '✨', description: 'Polished glass, bright depth, and clean front-office energy.' },
  { value: 'retroArcade', label: 'Pixel Jam', emoji: '🕹️', description: 'Cabinet glow, punchy gradients, scanline swagger, and loud arcade attitude.' },
  { value: 'darkMode', label: 'Blackout Luxe', emoji: '🌒', description: 'Moody arena darkness with premium gold trims and late-night war room drama.' },
  { value: 'neonCyber', label: 'Neon Rush', emoji: '⚡', description: 'Electric cyan-magenta contrast with hacked-terminal intensity and sharp futuristic edges.' },
  { value: 'classicSports', label: 'Courtside Vintage', emoji: '🏆', description: 'Broadcast-era paper, pennant tones, and old-school championship theater.' },
  { value: 'minimalist', label: 'Gallery Air', emoji: '☁️', description: 'Editorial whitespace, soft monochrome layers, and calm museum-clean framing.' },
];

function OptionRow<T extends string>(props: {
  title: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  description?: string;
}) {
  return (
    <div className="settingsControlCard">
      <div className="settingsControlHeader">
        <div>
          <div className="settingsControlTitle">{props.title}</div>
          {props.description ? <div className="settingsControlDescription">{props.description}</div> : null}
        </div>
      </div>
      <div className="settingsChipGroup">
        {props.options.map((option) => (
          <button
            key={option.value}
            className={`settingsChip ${props.value === option.value ? 'settingsChipActive' : ''}`}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow(props: {
  title: string;
  value: boolean;
  description?: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="settingsControlCard">
      <div className="settingsControlHeader">
        <div>
          <div className="settingsControlTitle">{props.title}</div>
          {props.description ? <div className="settingsControlDescription">{props.description}</div> : null}
        </div>
        <button
          className={`settingsToggle ${props.value ? 'settingsToggleActive' : ''}`}
          onClick={() => props.onChange(!props.value)}
          aria-pressed={props.value}
          title={props.title}
        >
          <span className="settingsToggleKnob" />
        </button>
      </div>
    </div>
  );
}

function SliderRow(props: {
  title: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  description?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="settingsControlCard">
      <div className="settingsControlHeader">
        <div>
          <div className="settingsControlTitle">{props.title}</div>
          {props.description ? <div className="settingsControlDescription">{props.description}</div> : null}
        </div>
        <div className="settingsControlValue">
          {props.value}
          {props.suffix ?? ''}
        </div>
      </div>
      <input
        className="settingsRange"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function SettingsPanel(props: {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<SettingsCategory>('ui');

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    props.onChange({
      ...props.settings,
      [key]: value,
    });
  };

  const currentTheme = useMemo(
    () => THEME_OPTIONS.find((theme) => theme.value === props.settings.theme) ?? THEME_OPTIONS[0],
    [props.settings.theme],
  );

  return (
    <Modal title="Settings" onClose={props.onClose} width="min(980px, calc(100vw - 24px))" maxHeight="92vh">
      <div className="settingsShell">
        <div className="settingsSidebar">
          <div className="settingsSidebarHeader">
            <div className="settingsSidebarKicker">Style Studio</div>
            <div className="settingsSidebarTitle">Remix your league, menu mood, and front-office vibe.</div>
          </div>

          <div className="settingsCategoryList">
            {CATEGORY_META.map((entry) => (
              <button
                key={entry.id}
                className={`settingsCategoryButton ${category === entry.id ? 'settingsCategoryButtonActive' : ''}`}
                onClick={() => setCategory(entry.id)}
              >
                <span className="settingsCategoryIcon">{entry.icon}</span>
                <span>{entry.label}</span>
              </button>
            ))}
          </div>

          <div className="settingsThemePreview">
            <div className="settingsThemePreviewLabel">Active Theme</div>
            <div className="settingsThemePreviewName">
              <span className="settingsThemePreviewEmoji" aria-hidden="true">{currentTheme.emoji}</span>
              <span>{currentTheme.label}</span>
            </div>
            <div className="settingsThemePreviewDescription">{currentTheme.description}</div>
          </div>
        </div>

        <div className="settingsContent">
          {category === 'ui' ? (
            <div className="settingsSection">
              <div className="settingsSectionTitle">Theme Library</div>
              <div className="settingsThemeGrid">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.value}
                    className={`settingsThemeCard settingsThemeCard-${theme.value} ${props.settings.theme === theme.value ? 'settingsThemeCardActive' : ''}`}
                    onClick={() => update('theme', theme.value)}
                  >
                    <div className="settingsThemeCardHeader">
                      <span className="settingsThemeCardTitle">
                        <span className="settingsThemeCardEmoji" aria-hidden="true">{theme.emoji}</span>
                        <span>{theme.label}</span>
                      </span>
                      {props.settings.theme === theme.value ? <span className="settingsThemeCheck">Active</span> : null}
                    </div>
                    <div className="settingsThemeSwatches">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="settingsThemeDescription">{theme.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {category === 'gameplay' ? (
            <div className="settingsSection">
              <div className="settingsSectionTitle">Gameplay Controls</div>
              <OptionRow<GameSpeedPreset>
                title="Game Speed"
                value={props.settings.gameSpeed}
                description="Controls live arcade tempo and sim pacing."
                options={[
                  { value: 'slow', label: 'Slow' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'fast', label: 'Fast' },
                ]}
                onChange={(value) => update('gameSpeed', value)}
              />
              <ToggleRow
                title="Auto Substitutions"
                value={props.settings.autoSubstitutions}
                description="Let the engine rotate fresh players automatically."
                onChange={(value) => update('autoSubstitutions', value)}
              />
              <SliderRow
                title="Arcade vs Simulation Balance"
                value={props.settings.arcadeBalance}
                min={0}
                max={100}
                suffix="%"
                description="Lower values feel more sim-heavy, higher values push bigger arcade swings."
                onChange={(value) => update('arcadeBalance', value)}
              />
              <OptionRow<StaminaImpactPreset>
                title="Stamina Impact Strength"
                value={props.settings.staminaImpact}
                description="How hard fatigue punishes tired lineups."
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                onChange={(value) => update('staminaImpact', value)}
              />
              <OptionRow<SalaryCapPreset>
                title="Salary Cap Strictness"
                value={props.settings.salaryCapStrictness}
                description="Soft cap allows a small cushion for contract moves."
                options={[
                  { value: 'soft', label: 'Soft' },
                  { value: 'hard', label: 'Hard' },
                ]}
                onChange={(value) => update('salaryCapStrictness', value)}
              />
              <OptionRow<InjuryFrequencyPreset>
                title="Injury Frequency"
                value={props.settings.injuryFrequency}
                description="Reserved for league wear-and-tear balancing as the roster system expands."
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'low', label: 'Low' },
                  { value: 'high', label: 'High' },
                ]}
                onChange={(value) => update('injuryFrequency', value)}
              />
              <OptionRow<AiAggressivenessPreset>
                title="AI Aggressiveness"
                value={props.settings.aiAggressiveness}
                description="How aggressively AI teams chase trades, free agents, and live actions."
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                onChange={(value) => update('aiAggressiveness', value)}
              />
            </div>
          ) : null}

          {category === 'difficulty' ? (
            <div className="settingsSection">
              <div className="settingsSectionTitle">League Difficulty</div>
              <OptionRow<DifficultyPreset>
                title="Difficulty"
                value={props.settings.difficulty}
                description="Adjusts trades, contract talks, sim luck, shot making, steals, and AI aggression."
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'hard', label: 'Hard' },
                  { value: 'extreme', label: 'Extreme' },
                ]}
                onChange={(value) => update('difficulty', value)}
              />
              <div className="settingsDifficultyNote">
                <div className="settingsControlTitle">Difficulty impact snapshot</div>
                <div className="settingsControlDescription">
                  Easy gives your team friendlier negotiations and on-court help. Hard and Extreme push AI shot quality,
                  trade leverage, and contract resistance upward.
                </div>
              </div>
            </div>
          ) : null}

          {category === 'audio' ? (
            <div className="settingsSection">
              <div className="settingsSectionTitle">Audio Mix</div>
              <SliderRow
                title="Sound Effects Volume"
                value={props.settings.sfxVolume}
                min={0}
                max={100}
                suffix="%"
                description="Court FX, hits, whistles, and gameplay audio."
                onChange={(value) => update('sfxVolume', value)}
              />
              <SliderRow
                title="Music Volume"
                value={props.settings.musicVolume}
                min={0}
                max={100}
                suffix="%"
                description="Crowd bed, menu ambiance, and match atmosphere."
                onChange={(value) => update('musicVolume', value)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
