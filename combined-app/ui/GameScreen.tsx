import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MatchResult, MatchState, PlayerInput } from '../game/basketballEngine';
import { createMatch, simulateRestOfMatch, substituteActivePlayer, updateMatch } from '../game/basketballEngine';
import { getGameSpeedMultiplier, getVolumeScale, type GameSettings } from '../game/settings';
import { fatigueLabel } from '../game/stamina';
import type { PlayerInGameStats, TeamPlayer, TeamState } from '../game/types';

type HudPlayer = {
  id: string;
  name: string;
  overall: number;
  position: string;
  stamina: number;
  slotIndex: 0 | 1;
};

type HudSnapshot = {
  score: { user: number; ai: number };
  timeLabel: string;
  userActive: HudPlayer[];
  aiActive: HudPlayer[];
  userBench: HudPlayer[];
  ballOwnerName?: string;
  controlledName?: string;
  recentEvents: string[];
};

type UnitySpritePack = {
  idle: string[];
  run: string[];
  jump: string;
  dodge: string;
  strike: string;
  hit: string;
  accent: string;
  ring: string;
};

const UNITY_ASSET_BASE = '/unity-arcade';

function playerFrame(name: string) {
  return `${UNITY_ASSET_BASE}/players/${name}`;
}

const UNITY_PLAYER_LOOKS: Record<'user_0' | 'user_1' | 'ai_0' | 'ai_1', UnitySpritePack> = {
  user_0: {
    idle: [playerFrame('dellavedova_idle_01.png'), playerFrame('dellavedova_idle_02.png'), playerFrame('dellavedova_idle_03.png'), playerFrame('dellavedova_idle_04.png')],
    run: [playerFrame('dellavedova_run_01.png'), playerFrame('dellavedova_run_02.png'), playerFrame('dellavedova_run_03.png'), playerFrame('dellavedova_run_04.png')],
    jump: playerFrame('dellavedova_jump_01.png'),
    dodge: playerFrame('dellavedova_roll_0.png'),
    strike: playerFrame('dellavedova_punch_02.png'),
    hit: playerFrame('dellavedova_hit.png'),
    accent: '#60a5fa',
    ring: 'rgba(96,165,250,0.34)',
  },
  user_1: {
    idle: [playerFrame('green_idle_01.png'), playerFrame('green_idle_02.png'), playerFrame('green_idle_03.png'), playerFrame('green_idle_04.png')],
    run: [playerFrame('green_run_01.png'), playerFrame('green_run_02.png'), playerFrame('green_run_03.png'), playerFrame('green_run_04.png')],
    jump: playerFrame('green_jump_01.png'),
    dodge: playerFrame('green_roll_0.png'),
    strike: playerFrame('green_punch_02.png'),
    hit: playerFrame('green_hit.png'),
    accent: '#7dd3fc',
    ring: 'rgba(125,211,252,0.3)',
  },
  ai_0: {
    idle: [playerFrame('paul_idle_01.png'), playerFrame('paul_idle_02.png'), playerFrame('paul_idle_03.png'), playerFrame('paul_idle_04.png')],
    run: [playerFrame('paul_run_01.png'), playerFrame('paul_run_02.png'), playerFrame('paul_run_03.png'), playerFrame('paul_run_04.png')],
    jump: playerFrame('paul_jump_01.png'),
    dodge: playerFrame('paul_roll_0.png'),
    strike: playerFrame('paul_punch_02.png'),
    hit: playerFrame('paul_hit.png'),
    accent: '#f87171',
    ring: 'rgba(248,113,113,0.3)',
  },
  ai_1: {
    idle: [playerFrame('peace_idle_01.png'), playerFrame('peace_idle_02.png'), playerFrame('peace_idle_03.png'), playerFrame('peace_idle_04.png')],
    run: [playerFrame('peace_run_01.png'), playerFrame('peacel_run_02.png'), playerFrame('peace_run_03.png'), playerFrame('peace_run_04.png')],
    jump: playerFrame('peace_jump_01.png'),
    dodge: playerFrame('peace_roll_0.png'),
    strike: playerFrame('peacel_punch_02.png'),
    hit: playerFrame('peace_hit.png'),
    accent: '#fb7185',
    ring: 'rgba(251,113,133,0.3)',
  },
};

const UNITY_SHARED_IMAGES = {
  ball: `${UNITY_ASSET_BASE}/Ball.png`,
  court: `${UNITY_ASSET_BASE}/courtTimber.png`,
  logoBlue: `${UNITY_ASSET_BASE}/blue_team_logo_transparent.png`,
  logoRed: `${UNITY_ASSET_BASE}/red_team_logo_transparent.png`,
} as const;

const UNITY_FX_IMAGES = {
  barrier: `${UNITY_ASSET_BASE}/fx/courtBarrier.png`,
  judgeTable: `${UNITY_ASSET_BASE}/fx/JudgeTable.png`,
  seatBlue: `${UNITY_ASSET_BASE}/fx/seat-blue.png`,
  seatRed: `${UNITY_ASSET_BASE}/fx/seat-red.png`,
} as const;

const UNITY_CROWD_IMAGES = Array.from({ length: 15 }, (_, index) => `${UNITY_ASSET_BASE}/fx/crowd_${String(index + 1).padStart(2, '0')}.png`);

const UNITY_AUDIO = {
  crowd: `${UNITY_ASSET_BASE}/audio/crowd_ambience.ogg`,
  bounce: `${UNITY_ASSET_BASE}/audio/BasketballBounce4.wav`,
  backboard: `${UNITY_ASSET_BASE}/audio/BackboardBounce.wav`,
  possession: `${UNITY_ASSET_BASE}/audio/Change_Possession_001.ogg`,
  shoe: [`${UNITY_ASSET_BASE}/audio/ShoeSqueek1.wav`, `${UNITY_ASSET_BASE}/audio/ShoeSqueek2.wav`],
  hit: [
    `${UNITY_ASSET_BASE}/audio/PunchHit.ogg`,
    `${UNITY_ASSET_BASE}/audio/Chop_001.ogg`,
    `${UNITY_ASSET_BASE}/audio/Chop_002.ogg`,
    `${UNITY_ASSET_BASE}/audio/Chop_003.ogg`,
  ],
  shotMake: `${UNITY_ASSET_BASE}/audio/Jumpshot_Success_001.ogg`,
  shotMiss: `${UNITY_ASSET_BASE}/audio/Jumpshot_Missed_001.ogg`,
  dunkMake: `${UNITY_ASSET_BASE}/audio/Dunk_Success_001.ogg`,
  dunkMiss: `${UNITY_ASSET_BASE}/audio/Dunk_Attempt_001.ogg`,
  gameStart: `${UNITY_ASSET_BASE}/audio/Game_Start_001.ogg`,
  gameEnd: `${UNITY_ASSET_BASE}/audio/Game_End_001.ogg`,
} as const;

const UNITY_PRELOAD_PATHS = [
  ...Object.values(UNITY_SHARED_IMAGES),
  ...Object.values(UNITY_FX_IMAGES),
  ...UNITY_CROWD_IMAGES,
  ...Object.values(UNITY_PLAYER_LOOKS).flatMap((pack) => [...pack.idle, ...pack.run, pack.jump, pack.dodge, pack.strike, pack.hit]),
];

function isReadyImage(img: HTMLImageElement | undefined) {
  return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
}

function drawSpriteImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  flipX = false,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getUnityLook(entity: MatchState['entities'][number]) {
  const key = `${entity.team}_${entity.slotIndex}` as 'user_0' | 'user_1' | 'ai_0' | 'ai_1';
  return UNITY_PLAYER_LOOKS[key] ?? UNITY_PLAYER_LOOKS.user_0;
}

function getUnityFrame(entity: MatchState['entities'][number], nowMs: number) {
  const look = getUnityLook(entity);
  const speed = Math.hypot(entity.vel.x, entity.vel.y);
  if ((entity.koMs ?? 0) > 0 || entity.stunMs > 0) return look.hit;
  if (entity.blockMs > 0) {
    const blockProgress = 1 - Math.max(0, Math.min(1, entity.blockMs / 420));
    return blockProgress < 0.52 ? look.jump : look.strike;
  }
  if (entity.dunkMs > 0) return look.strike;
  if (entity.jumpMs > 0) return look.jump;
  if (entity.dodgeMs > 0) return look.dodge;
  if (entity.impactMs > 0) return look.strike;
  const frames = speed > 34 ? look.run : look.idle;
  const cadence = speed > 34 ? 95 : 175;
  return frames[Math.floor(nowMs / cadence) % frames.length];
}

function getBallPos(state: MatchState): { x: number; y: number; zArc?: number } {
  const { ball, entities } = state;
  if (ball.kind === 'possession') {
    const owner = entities.find((entity) => entity.id === ball.ownerId);
    return owner ? { x: owner.pos.x, y: owner.pos.y } : { x: state.court.width / 2, y: state.court.height / 2 };
  }
  if (ball.kind === 'loose') {
    const sourceLift = ball.source === 'shot' ? 20 : 8;
    const zArc = ball.bounceMs > 0 ? Math.min(ball.source === 'shot' ? 52 : 22, sourceLift + ball.bounceMs * 0.08 + Math.hypot(ball.vel.x, ball.vel.y) * 0.035) : 0;
    return { x: ball.pos.x, y: ball.pos.y, zArc };
  }
  if (ball.kind === 'pass') {
    const t = ball.duration ? Math.min(1, ball.t / ball.duration) : 0;
    const ease = t * (2 - t);
    return {
      x: ball.start.x + (ball.end.x - ball.start.x) * ease,
      y: ball.start.y + (ball.end.y - ball.start.y) * ease,
    };
  }
  if (ball.kind === 'shot') {
    const t = ball.duration ? Math.min(1, ball.t / ball.duration) : 0;
    if (ball.isDunk) {
      const shooter = entities.find((entity) => entity.id === ball.shooterId);
      const gather = Math.min(1, t / 0.62);
      const finish = t <= 0.62 ? 0 : Math.min(1, (t - 0.62) / 0.38);
      const gatherEase = gather * gather * (3 - 2 * gather);
      const finishEase = 1 - Math.pow(1 - finish, 3);
      if (shooter) {
        const rawFacing = shooter.facing ?? { x: shooter.team === 'user' ? -1 : 1, y: 0 };
        const faceDir = normalize(rawFacing.x === 0 && rawFacing.y === 0 ? { x: shooter.team === 'user' ? -1 : 1, y: 0 } : rawFacing);
        const lift = Math.max(jumpLiftMs(shooter.jumpMs), dunkLiftMs(shooter.dunkMs));
        const handX = shooter.pos.x + faceDir.x * (11 + gatherEase * 24);
        const handY = shooter.pos.y - lift - 20 - Math.sin(gatherEase * Math.PI) * 8;
        const x = t <= 0.62 ? handX : handX + (ball.target.x - handX) * finishEase;
        const y = t <= 0.62 ? handY : handY + (ball.target.y - 1 - handY) * finishEase;
        const zArc = t <= 0.62 ? 18 + Math.sin(gatherEase * Math.PI) * (ball.arcHeight + 8) : 10 + Math.sin((1 - finishEase) * Math.PI * 0.5) * 10;
        return { x, y, zArc };
      }
      const handX = ball.start.x + (ball.target.x - ball.start.x) * 0.54 * gatherEase;
      const handY = ball.start.y + (ball.target.y - ball.start.y) * 0.34 * gatherEase - Math.sin(gatherEase * Math.PI) * 12;
      const x = t <= 0.62 ? handX : handX + (ball.target.x - handX) * finishEase;
      const y = t <= 0.62 ? handY : handY + (ball.target.y - handY) * finishEase;
      const zArc = t <= 0.62 ? Math.sin(gatherEase * Math.PI) * (ball.arcHeight + 18) : Math.sin((1 - finishEase) * Math.PI * 0.5) * 14;
      return { x, y, zArc };
    }
    const x = ball.start.x + (ball.target.x - ball.start.x) * t;
    const y = ball.start.y + (ball.target.y - ball.start.y) * t;
    const zArc = Math.sin(t * Math.PI) * ball.arcHeight;
    return { x, y, zArc };
  }
  return { x: state.court.width / 2, y: state.court.height / 2 };
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function jumpLiftMs(jumpMs: number) {
  if (!jumpMs) return 0;
  const total = 420;
  const progress = 1 - Math.max(0, Math.min(1, jumpMs / total));
  return Math.sin(progress * Math.PI) * 18;
}

function dunkLiftMs(dunkMs: number) {
  if (!dunkMs) return 0;
  const total = 360;
  const progress = 1 - Math.max(0, Math.min(1, dunkMs / total));
  return Math.sin(Math.min(1, progress * 1.08) * Math.PI) * 30;
}

function blockLiftMs(blockMs: number) {
  if (!blockMs) return 0;
  const total = 420;
  const progress = 1 - Math.max(0, Math.min(1, blockMs / total));
  const firstBurst = Math.sin(Math.min(1, progress / 0.44) * Math.PI) * 18;
  const secondBurst = progress > 0.16 ? Math.sin(Math.min(1, (progress - 0.16) / 0.84) * Math.PI) * 36 : 0;
  return Math.max(firstBurst, secondBurst);
}

type HoopSide = 'left' | 'right';
type HoopLayer = 'back' | 'front';

function drawStylizedHoop(
  ctx: CanvasRenderingContext2D,
  basket: { x: number; y: number },
  side: HoopSide,
  palette: { post: string; glow: string },
  layer: HoopLayer,
) {
  const dir = side === 'left' ? 1 : -1;
  const rimCenter = { x: basket.x, y: basket.y };
  const rimX = rimCenter.x + dir * 3;
  const board = { x: rimCenter.x - dir * 20, y: rimCenter.y - 31, w: 16, h: 62 };
  const braceAnchor = { x: rimCenter.x + dir * 48, y: rimCenter.y - 44 };
  const basePad = { x: braceAnchor.x - 11, y: rimCenter.y + 25, w: 22, h: 56 };
  const padFill = side === 'left' ? 'rgba(113,31,31,0.42)' : 'rgba(24,73,135,0.42)';

  ctx.save();

  if (layer === 'back') {
    ctx.fillStyle = 'rgba(2,6,23,0.16)';
    ctx.beginPath();
    ctx.ellipse(rimCenter.x + dir * 2, rimCenter.y + 13, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = padFill;
    drawRoundedRect(ctx, basePad.x, basePad.y, basePad.w, basePad.h, 7);
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.post;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(braceAnchor.x, braceAnchor.y);
    ctx.lineTo(board.x + dir * 7, rimCenter.y - 16);
    ctx.lineTo(board.x + dir * 2, rimCenter.y - 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226,232,240,0.82)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(board.x + dir * 3, rimCenter.y - 4);
    ctx.lineTo(rimX - dir * 10, rimCenter.y - 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15,23,42,0.24)';
    drawRoundedRect(ctx, board.x - 2, board.y + 4, board.w, board.h, 5);
    ctx.fill();

    const boardGradient = ctx.createLinearGradient(board.x, board.y, board.x + board.w, board.y);
    boardGradient.addColorStop(0, 'rgba(255,255,255,0.93)');
    boardGradient.addColorStop(0.5, 'rgba(226,232,240,0.86)');
    boardGradient.addColorStop(1, 'rgba(255,255,255,0.96)');
    ctx.fillStyle = boardGradient;
    drawRoundedRect(ctx, board.x, board.y, board.w, board.h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.5)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, board.x, board.y, board.w, board.h, 5);
    ctx.stroke();

    const squareX = side === 'left' ? board.x + 2 : board.x + 6;
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(squareX, rimCenter.y - 10, 8, 20);
  } else {
    ctx.strokeStyle = 'rgba(255,145,77,0.34)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(rimX, rimCenter.y, 15, 5.4, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(241,245,249,0.76)';
    ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i += 1) {
      const strandX = rimX + i * 4.8;
      ctx.beginPath();
      ctx.moveTo(strandX, rimCenter.y + 2);
      ctx.quadraticCurveTo(
        strandX + dir * (i * 0.9),
        rimCenter.y + 12,
        rimX + i * 2.4,
        rimCenter.y + 22,
      );
      ctx.stroke();
    }

    for (let row = 0; row < 2; row += 1) {
      const y = rimCenter.y + 9 + row * 6;
      ctx.beginPath();
      ctx.moveTo(rimX - 10, y);
      ctx.lineTo(rimX + 10, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ff8d47';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(rimX, rimCenter.y, 15, 5.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,243,224,0.7)';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(rimX, rimCenter.y - 0.5, 12.2, 3.9, 0, 0.16 * Math.PI, 0.84 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function getRenderScale() {
  return Math.min(window.devicePixelRatio || 1, 1.5);
}

function shortenLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(1, maxLength - 3)).trim()}...`;
}

type MovementKeyState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

const CONTROL_CORNER_HINTS = [
  {
    keys: ['WASD', 'ARROWS'],
    title: 'Move and shade',
    detail: 'Hold diagonals to cut driving lanes, recover on defense, and chase rebounds cleanly.',
  },
  {
    keys: ['SPACE'],
    title: 'Jumper / dunk / contest',
    detail: 'Drive deep and hit Space to trigger the dunk window, or use it as your normal shot and defensive contest button.',
  },
  {
    keys: ['CLICK', 'P'],
    title: 'Lead pass',
    detail: 'Pass into open space to start fast breaks instead of forcing the ball straight at a teammate.',
  },
  {
    keys: ['SHIFT'],
    title: 'Burst dodge',
    detail: 'Explode around pressure, change lanes, and slip the first defender.',
  },
  {
    keys: ['E', 'F'],
    title: 'Strip attack',
    detail: 'Use your karate move when you are body-to-body with the ball handler.',
  },
  {
    keys: ['Q'],
    title: 'Manual jump',
    detail: 'Use a separate jump for late blocks, tip rebounds, or a delayed release before you shoot.',
  },
] as const;

const HOW_TO_PLAY_STEPS = [
  {
    title: 'Attack the help defender',
    detail: 'Drive until the second defender stunts at you, then hit the open lane with a lead pass or rise into Space for the jumper.',
  },
  {
    title: 'Contest early at the rim',
    detail: 'Stay between the ball and the hoop, then use Space or Q before the shooter gets fully downhill.',
  },
  {
    title: 'Manage fatigue like a closer',
    detail: 'Fresh legs matter late. Swap tired players during live possessions so your last minute is still explosive.',
  },
] as const;

function syncMovementInput(input: PlayerInput, movement: MovementKeyState) {
  input.moveX = (movement.right ? 1 : 0) - (movement.left ? 1 : 0);
  input.moveY = (movement.down ? 1 : 0) - (movement.up ? 1 : 0);
}

function userOwnsBall(match: MatchState | null) {
  if (!match || match.ball.kind !== 'possession') return false;
  return match.entities.find((entity) => entity.id === match.ball.ownerId)?.team === 'user';
}

function triggerPrimaryAction(match: MatchState | null, input: PlayerInput) {
  input.jumpPressed = true;
  if (userOwnsBall(match)) input.shootPressed = true;
}

function buildHudSnapshot(state: MatchState): HudSnapshot {
  const toHudPlayer = (player: TeamPlayer, slotIndex: 0 | 1): HudPlayer => ({
    id: player.id,
    name: player.prospect.name,
    overall: player.prospect.overall,
    position: player.prospect.position,
    stamina: Math.round(state.staminaByPlayerId[player.id] ?? player.stamina ?? 100),
    slotIndex,
  });

  const userActive = state.user.activePlayerIds
    .map((id, slotIndex) => {
      const player = state.user.roster.find((entry) => entry.id === id);
      return player ? toHudPlayer(player, slotIndex as 0 | 1) : null;
    })
    .filter((player): player is HudPlayer => Boolean(player));

  const aiActive = state.ai.activePlayerIds
    .map((id, slotIndex) => {
      const player = state.ai.roster.find((entry) => entry.id === id);
      return player ? toHudPlayer(player, slotIndex as 0 | 1) : null;
    })
    .filter((player): player is HudPlayer => Boolean(player));

  const userBench = state.user.roster
    .filter((player) => !state.user.activePlayerIds.includes(player.id))
    .sort((a, b) => b.prospect.overall - a.prospect.overall)
    .map((player) => ({
      id: player.id,
      name: player.prospect.name,
      overall: player.prospect.overall,
      position: player.prospect.position,
      stamina: Math.round(state.staminaByPlayerId[player.id] ?? player.stamina ?? 100),
      slotIndex: 0 as 0 | 1,
    }));

  const minutes = Math.floor(state.timeLeftMs / 60000);
  const seconds = Math.floor((state.timeLeftMs % 60000) / 1000)
    .toString()
    .padStart(2, '0');
  const ballOwnerName =
    state.ball.kind === 'possession' ? state.entities.find((entity) => entity.id === state.ball.ownerId)?.name : undefined;
  const controlledName =
    state.ball.kind === 'possession' && state.entities.find((entity) => entity.id === state.ball.ownerId)?.team === 'user'
      ? state.entities.find((entity) => entity.id === state.ball.ownerId)?.name
      : [...state.entities]
          .filter((entity) => entity.team === 'user')
          .sort((a, b) => {
            const ballPos = getBallPos(state);
            const aDist = Math.hypot(a.pos.x - ballPos.x, a.pos.y - ballPos.y);
            const bDist = Math.hypot(b.pos.x - ballPos.x, b.pos.y - ballPos.y);
            return aDist - bDist;
          })[0]?.name;

  return {
    score: state.score,
    timeLabel: `${minutes}:${seconds}`,
    userActive,
    aiActive,
    userBench,
    ballOwnerName,
    controlledName,
    recentEvents: state.events.slice(-4).reverse().map((event) => event.text),
  };
}

function staminaTone(stamina: number) {
  if (stamina >= 72) return 'var(--good)';
  if (stamina >= 48) return 'var(--accent)';
  return 'var(--bad)';
}

function StaminaBar(props: { stamina: number }) {
  return (
    <div className="staminaTrack">
      <div className="staminaFill" style={{ width: `${props.stamina}%`, background: staminaTone(props.stamina) }} />
    </div>
  );
}

function RotationCard(props: {
  title: string;
  player: HudPlayer;
  bench: HudPlayer[];
  canSubstitute: boolean;
  onSubstitute: (playerId: string) => void;
}) {
  return (
    <div className="gameRotationCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.08, textTransform: 'uppercase' }}>
            {props.title}
          </div>
          <div style={{ marginTop: 4, fontSize: 16, fontWeight: 1000 }}>{props.player.name}</div>
          <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>
            {props.player.position} • OVR {props.player.overall}
          </div>
        </div>
        <div style={{ minWidth: 76, textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 1000, color: staminaTone(props.player.stamina) }}>{props.player.stamina}%</div>
          <div className="muted" style={{ fontSize: 11 }}>{fatigueLabel(props.player.stamina)}</div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <StaminaBar stamina={props.player.stamina} />
      </div>

      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: props.bench.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8 }}>
        {props.bench.length ? (
          props.bench.map((benchPlayer) => (
            <button
              key={`${props.player.id}-${benchPlayer.id}`}
              className="btn btnSoft"
              onClick={() => props.onSubstitute(benchPlayer.id)}
              disabled={!props.canSubstitute}
              style={{ padding: '7px 8px', justifyContent: 'space-between', display: 'flex', fontSize: 12 }}
              title={props.canSubstitute ? `Sub ${benchPlayer.name} in` : 'Wait for a live possession to substitute'}
            >
              <span>{benchPlayer.name}</span>
              <span>{benchPlayer.stamina}%</span>
            </button>
          ))
        ) : (
          <div className="muted" style={{ fontSize: 12 }}>No bench players available.</div>
        )}
      </div>
    </div>
  );
}

function ControlKey(props: { label: string }) {
  return <span className="gameKeycap">{props.label}</span>;
}

type GameScreenProps = {
  user: TeamState;
  ai: TeamState;
  settings: GameSettings;
  matchLabel?: string;
  matchMetaLabel?: string;
  userLabel?: string;
  aiLabel?: string;
  onExit: (result: MatchResult) => void;
  onAbandon: () => void;
};

export default function GameScreen(props: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const hudRef = useRef<number>(0);
  const unityImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const crowdAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const lastScoreRef = useRef({ user: 0, ai: 0 });
  const endSoundPlayedRef = useRef(false);

  const [ended, setEnded] = useState<MatchResult | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const inputRef = useRef<PlayerInput>({
    moveX: 0,
    moveY: 0,
    shootPressed: false,
    passPressed: false,
    passTarget: undefined,
    dodgePressed: false,
    jumpPressed: false,
    karatePressed: false,
  });
  const movementKeysRef = useRef<MovementKeyState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const matchRef = useRef<MatchState | null>(null);
  const courtSize = useMemo(() => ({ w: 960, h: 540 }), []);
  const userDisplayName = props.userLabel ?? props.user.name ?? 'Your Team';
  const aiDisplayName = props.aiLabel ?? props.ai.name ?? 'Opponent';
  const userShortLabel = shortenLabel(userDisplayName, 14);
  const aiShortLabel = shortenLabel(aiDisplayName, 14);
  const canvasUserLabel = shortenLabel(userDisplayName.toUpperCase(), 9);
  const canvasAiLabel = shortenLabel(aiDisplayName.toUpperCase(), 9);
  const sfxVolume = getVolumeScale('sfx', props.settings);
  const musicVolume = getVolumeScale('music', props.settings);
  const speedMultiplier = getGameSpeedMultiplier(props.settings);

  const playOneShot = (src: string | readonly string[], volume = 0.55) => {
    if (!audioUnlockedRef.current) return;
    const resolved = Array.isArray(src) ? randomFrom(src) : src;
    const audio = new Audio(resolved);
    audio.volume = Math.max(0, Math.min(1, volume * sfxVolume));
    audio.play().catch(() => undefined);
  };

  const unlockAudio = () => {
    audioUnlockedRef.current = true;
    const crowd = crowdAudioRef.current;
    if (crowd && crowd.paused) {
      crowd.play().catch(() => undefined);
    }
  };

  const processAudio = (state: MatchState) => {
    const currentIds = new Set(state.events.map((event) => event.id));
    const seen = seenEventIdsRef.current;

    for (const event of state.events) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      const text = event.text.toUpperCase();
      if (text.includes('DODGE')) playOneShot(UNITY_AUDIO.shoe, 0.18);
      else if (text.includes('KO') || text.includes('KARATE') || text.includes('STRIP') || text.includes('BLOCKED') || text.includes('DROPPED')) playOneShot(UNITY_AUDIO.hit, 0.38);
      else if (text.includes('POSSESSION') || text.includes('STEAL')) playOneShot(UNITY_AUDIO.possession, 0.3);
      else if (text.includes('BAD PASS')) playOneShot(UNITY_AUDIO.bounce, 0.2);
      else if (text.includes('DUNK!')) playOneShot(UNITY_AUDIO.dunkMake, 0.42);
      else if (text.includes('DUNK MISS')) playOneShot(UNITY_AUDIO.dunkMiss, 0.36);
      else if (text.includes('GREAT SHOT')) playOneShot(UNITY_AUDIO.shotMake, 0.38);
      else if (text.includes('MISS')) playOneShot(UNITY_AUDIO.shotMiss, 0.34);
    }

    for (const seenId of [...seen]) {
      if (!currentIds.has(seenId)) seen.delete(seenId);
    }

    const previousScore = lastScoreRef.current;
    if (state.score.user !== previousScore.user || state.score.ai !== previousScore.ai) {
      playOneShot(UNITY_AUDIO.backboard, 0.16);
      lastScoreRef.current = { ...state.score };
    }

    if (state.status === 'ended' && !endSoundPlayedRef.current) {
      playOneShot(UNITY_AUDIO.gameEnd, 0.4);
      endSoundPlayedRef.current = true;
    }
  };

  useEffect(() => {
    const initial = createMatch(props.user, props.ai, { courtWidth: courtSize.w, courtHeight: courtSize.h });
    matchRef.current = initial;
    setHud(buildHudSnapshot(initial));
    setEnded(null);
    seenEventIdsRef.current = new Set();
    lastScoreRef.current = { user: 0, ai: 0 };
    endSoundPlayedRef.current = false;
    if (audioUnlockedRef.current) {
      playOneShot(UNITY_AUDIO.gameStart, 0.28);
    }
  }, [props.user, props.ai, courtSize.w, courtSize.h]);

  useEffect(() => {
    const cache = unityImagesRef.current;
    for (const src of UNITY_PRELOAD_PATHS) {
      if (cache[src]) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      cache[src] = img;
    }
  }, []);

  useEffect(() => {
    const crowd = new Audio(UNITY_AUDIO.crowd);
    crowd.loop = true;
    crowd.volume = 0.12 * musicVolume;
    crowd.preload = 'auto';
    crowdAudioRef.current = crowd;
    return () => {
      crowd.pause();
      crowdAudioRef.current = null;
    };
  }, [musicVolume]);

  useEffect(() => {
    if (crowdAudioRef.current) {
      crowdAudioRef.current.volume = 0.12 * musicVolume;
    }
  }, [musicVolume]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const setMovementKey = (code: string, pressed: boolean) => {
      const movement = movementKeysRef.current;
      if (code === 'KeyW' || code === 'ArrowUp') movement.up = pressed;
      if (code === 'KeyS' || code === 'ArrowDown') movement.down = pressed;
      if (code === 'KeyA' || code === 'ArrowLeft') movement.left = pressed;
      if (code === 'KeyD' || code === 'ArrowRight') movement.right = pressed;
      syncMovementInput(inputRef.current, movement);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      unlockAudio();
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'ShiftLeft',
          'ShiftRight',
          'KeyQ',
          'KeyE',
          'KeyF',
          'KeyP',
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        setOptionsOpen((prev) => !prev);
        return;
      }
      setMovementKey(e.code, true);
      if (['Space', 'KeyP', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyF'].includes(e.code) && e.repeat) return;
      if (e.code === 'Space') triggerPrimaryAction(matchRef.current, inputRef.current);
      if (e.code === 'KeyP') inputRef.current.passPressed = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputRef.current.dodgePressed = true;
      if (e.code === 'KeyQ') inputRef.current.jumpPressed = true;
      if (e.code === 'KeyE' || e.code === 'KeyF') inputRef.current.karatePressed = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      setMovementKey(e.code, false);
    };
    const onCanvasMouseDown = (e: MouseEvent) => {
      unlockAudio();
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * courtSize.w;
      const y = ((e.clientY - rect.top) / rect.height) * courtSize.h;
      inputRef.current.passTarget = { x, y };
      inputRef.current.passPressed = true;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const canvas = canvasRef.current;
    canvas?.addEventListener('mousedown', onCanvasMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas?.removeEventListener('mousedown', onCanvasMouseDown);
    };
  }, [courtSize.h, courtSize.w]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const scale = getRenderScale();
    canvas.width = Math.round(courtSize.w * scale);
    canvas.height = Math.round(courtSize.h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    lastRef.current = performance.now();
    hudRef.current = 0;

    const loop = (now: number) => {
      const match = matchRef.current;
      if (!match) return;

      const dtMs = clamp(now - lastRef.current, 0, 34);
      lastRef.current = now;

      const input = inputRef.current;
      const shootPressed = input.shootPressed;
      const passPressed = input.passPressed;
      const passTarget = input.passTarget;
      const dodgePressed = input.dodgePressed;
      const jumpPressed = input.jumpPressed;
      const karatePressed = input.karatePressed;
      input.shootPressed = false;
      input.passPressed = false;
      input.passTarget = undefined;
      input.dodgePressed = false;
      input.jumpPressed = false;
      input.karatePressed = false;

      const res = updateMatch(
        match,
        {
          moveX: input.moveX,
          moveY: input.moveY,
          shootPressed,
          passPressed,
          passTarget,
          dodgePressed,
          jumpPressed,
          karatePressed,
        },
        dtMs * speedMultiplier,
      );

      const stateToDraw: MatchState = (res as MatchResult).status === 'ended' ? match : (res as MatchState);
      draw(ctx, stateToDraw);
      processAudio(stateToDraw);

      if (now - hudRef.current >= 120) {
        setHud(buildHudSnapshot(stateToDraw));
        hudRef.current = now;
      }

      if ((res as MatchResult).status === 'ended') {
        const final = res as MatchResult;
        setEnded(final);
        setHud(buildHudSnapshot(match));
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [courtSize.h, courtSize.w, speedMultiplier]);

  function drawOld(ctx: CanvasRenderingContext2D, state: MatchState) {
    ctx.clearRect(0, 0, state.court.width, state.court.height);
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, state.court.width, state.court.height);

    ctx.fillStyle = '#1f7a3a';
    drawRoundedRect(ctx, 36, 36, state.court.width - 72, state.court.height - 72, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(78, 90, state.court.width - 156, state.court.height - 180);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(state.court.width / 2, 90);
    ctx.lineTo(state.court.width / 2, state.court.height - 90);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(state.court.width / 2, state.court.height / 2, 34, 0, Math.PI * 2);
    ctx.stroke();

    const basketLeft = { x: 70, y: state.court.height / 2 };
    const basketRight = { x: state.court.width - 70, y: state.court.height / 2 };
    for (const basket of [basketLeft, basketRight]) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(basket.x, basket.y - 8);
      ctx.lineTo(basket.x + (basket === basketLeft ? 18 : -18), basket.y - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(basket.x, basket.y + 8);
      ctx.lineTo(basket.x + (basket === basketLeft ? 18 : -18), basket.y + 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(basket.x, basket.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const entity of state.entities) {
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.arc(entity.pos.x, entity.pos.y, entity.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.moveTo(entity.pos.x, entity.pos.y);
      const dir = normalize(entity.vel.x === 0 && entity.vel.y === 0 ? { x: 0, y: 1 } : { x: entity.vel.x, y: entity.vel.y });
      ctx.lineTo(entity.pos.x + dir.x * 16, entity.pos.y + dir.y * 16);
      ctx.stroke();

      const stamina = Math.round(state.staminaByPlayerId[entity.id] ?? 100);
      ctx.fillStyle = 'rgba(15,23,42,0.72)';
      ctx.fillRect(entity.pos.x - 18, entity.pos.y - 28, 36, 5);
      ctx.fillStyle = staminaTone(stamina);
      ctx.fillRect(entity.pos.x - 18, entity.pos.y - 28, 36 * (stamina / 100), 5);
    }

    const ball = getBallPos(state);
    ctx.fillStyle = '#e86c2e';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y - (ball.zArc ?? 0) * 0.08, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '18px Arial';
    for (const event of state.events) {
      const age = (performance.now() - event.createdAtMs) / 2500;
      const alpha = clamp(1 - age, 0, 1);
      const y = event.y - age * 22;
      ctx.fillStyle =
        event.tone === 'green'
          ? `rgba(40,167,69,${alpha})`
          : event.tone === 'red'
            ? `rgba(220,53,69,${alpha})`
            : event.tone === 'gold'
              ? `rgba(212,175,55,${alpha})`
              : `rgba(33,150,243,${alpha})`;
      ctx.fillText(event.text, event.x - 34, y);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, 330, 62);
    ctx.fillStyle = '#fff';
    ctx.font = '22px Arial';
    ctx.fillText(`${canvasUserLabel} ${state.score.user} - ${state.score.ai} ${canvasAiLabel}`, 14, 28);
    ctx.font = '15px Arial';
    const seconds = Math.floor((state.timeLeftMs % 60000) / 1000)
      .toString()
      .padStart(2, '0');
    ctx.fillText(`Clock ${Math.floor(state.timeLeftMs / 60000)}:${seconds}`, 14, 48);
    if (state.ball.kind === 'possession') {
      const owner = state.entities.find((entity) => entity.id === state.ball.ownerId);
      if (owner) {
        const stamina = Math.round(state.staminaByPlayerId[owner.id] ?? 100);
        ctx.fillText(`Ball: ${owner.name} • ${stamina}% stamina`, 146, 48);
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, state: MatchState) {
    const { width, height } = state.court;
    const scale = getRenderScale();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const images = unityImagesRef.current;
    const ball = getBallPos(state);
    const nowMs = performance.now();
    const controlledUserId =
      state.ball.kind === 'possession' && state.entities.find((entity) => entity.id === state.ball.ownerId)?.team === 'user'
        ? state.ball.ownerId
        : [...state.entities]
            .filter((entity) => entity.team === 'user')
            .sort((a, b) => Math.hypot(a.pos.x - ball.x, a.pos.y - ball.y) - Math.hypot(b.pos.x - ball.x, b.pos.y - ball.y))[0]?.id;
    const courtLeft = 40;
    const courtTop = 54;
    const courtWidth = width - 80;
    const courtHeight = height - 108;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#07101c');
    bg.addColorStop(0.55, '#132338');
    bg.addColorStop(1, '#1b2f47');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const upperDeck = ctx.createLinearGradient(0, 0, 0, 54);
    upperDeck.addColorStop(0, '#16283c');
    upperDeck.addColorStop(1, '#0c1521');
    ctx.fillStyle = upperDeck;
    ctx.fillRect(0, 0, width, 54);

    const lowerDeck = ctx.createLinearGradient(0, height - 54, 0, height);
    lowerDeck.addColorStop(0, '#0c1521');
    lowerDeck.addColorStop(1, '#16283c');
    ctx.fillStyle = lowerDeck;
    ctx.fillRect(0, height - 54, width, 54);

    const crowdReady = UNITY_CROWD_IMAGES.map((src) => images[src]).filter((img): img is HTMLImageElement => isReadyImage(img));
    if (crowdReady.length) {
      const laneWidth = 54;
      const crowdCount = Math.ceil(width / laneWidth) + 1;
      for (let i = 0; i < crowdCount; i += 1) {
        const x = i * laneWidth - 8;
        const topImg = crowdReady[i % crowdReady.length];
        const bottomImg = crowdReady[(i * 3) % crowdReady.length];
        drawSpriteImage(ctx, topImg, x, 7, 28, 34, false, 0.92);
        drawSpriteImage(ctx, bottomImg, x, height - 43, 28, 34, false, 0.92);
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 22; i += 1) {
      ctx.fillRect(22 + i * 42, 14, 28, 10);
      ctx.fillRect(22 + i * 42, height - 24, 28, 10);
    }

    drawRoundedRect(ctx, courtLeft, courtTop, courtWidth, courtHeight, 24);
    ctx.fillStyle = '#d59a61';
    ctx.fill();

    ctx.save();
    drawRoundedRect(ctx, courtLeft, courtTop, courtWidth, courtHeight, 24);
    ctx.clip();

    const courtTexture = images[UNITY_SHARED_IMAGES.court];
    if (isReadyImage(courtTexture)) {
      ctx.drawImage(courtTexture, courtLeft, courtTop, courtWidth, courtHeight);
    } else {
      const wood = ctx.createLinearGradient(0, courtTop, 0, height - courtTop);
      wood.addColorStop(0, '#efc178');
      wood.addColorStop(0.5, '#d99655');
      wood.addColorStop(1, '#c87f42');
      ctx.fillStyle = wood;
      ctx.fillRect(courtLeft, courtTop, courtWidth, courtHeight);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = courtLeft + 24; x < courtLeft + courtWidth; x += 44) {
      ctx.fillRect(x, courtTop, 3, courtHeight);
    }

    const floorGlow = ctx.createRadialGradient(width / 2, height / 2, 64, width / 2, height / 2, courtWidth * 0.44);
    floorGlow.addColorStop(0, 'rgba(255,255,255,0.12)');
    floorGlow.addColorStop(0.45, 'rgba(255,255,255,0.04)');
    floorGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(courtLeft, courtTop, courtWidth, courtHeight);

    const paintWidth = 114;
    const paintHeight = 188;
    const paintY = height / 2 - paintHeight / 2;
    const leftPaintX = 92;
    const rightPaintX = width - 92 - paintWidth;

    const leftPaint = ctx.createLinearGradient(leftPaintX, paintY, leftPaintX + paintWidth, paintY);
    leftPaint.addColorStop(0, 'rgba(127,29,29,0.24)');
    leftPaint.addColorStop(1, 'rgba(248,113,113,0.08)');
    ctx.fillStyle = leftPaint;
    ctx.fillRect(leftPaintX, paintY, paintWidth, paintHeight);

    const rightPaint = ctx.createLinearGradient(rightPaintX + paintWidth, paintY, rightPaintX, paintY);
    rightPaint.addColorStop(0, 'rgba(30,64,175,0.24)');
    rightPaint.addColorStop(1, 'rgba(96,165,250,0.08)');
    ctx.fillStyle = rightPaint;
    ctx.fillRect(rightPaintX, paintY, paintWidth, paintHeight);

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftPaintX, paintY, paintWidth, paintHeight);
    ctx.strokeRect(rightPaintX, paintY, paintWidth, paintHeight);
    ctx.beginPath();
    ctx.arc(leftPaintX + paintWidth, height / 2, 34, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightPaintX, height / 2, 34, Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 4; i += 1) {
      const markerY = paintY + 24 + i * 36;
      ctx.fillRect(leftPaintX + 10, markerY, 10, 5);
      ctx.fillRect(rightPaintX + paintWidth - 20, markerY, 10, 5);
    }

    const logoBlue = images[UNITY_SHARED_IMAGES.logoBlue];
    const logoRed = images[UNITY_SHARED_IMAGES.logoRed];
    if (isReadyImage(logoRed)) {
      drawSpriteImage(ctx, logoRed, courtLeft + 118, height / 2 - 62, 92, 92, false, 0.13);
    }
    if (isReadyImage(logoBlue)) {
      drawSpriteImage(ctx, logoBlue, width - 210, height / 2 - 62, 92, 92, false, 0.13);
    }

    const gloss = ctx.createLinearGradient(0, courtTop, 0, courtTop + courtHeight);
    gloss.addColorStop(0, 'rgba(255,255,255,0.08)');
    gloss.addColorStop(0.35, 'rgba(255,255,255,0)');
    gloss.addColorStop(1, 'rgba(18,31,45,0.08)');
    ctx.fillStyle = gloss;
    ctx.fillRect(courtLeft, courtTop, courtWidth, courtHeight);

    const sweepX = courtLeft - 160 + ((nowMs * 0.05) % (courtWidth + 280));
    const floorSweep = ctx.createLinearGradient(sweepX, courtTop, sweepX + 170, courtTop);
    floorSweep.addColorStop(0, 'rgba(255,255,255,0)');
    floorSweep.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    floorSweep.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = floorSweep;
    ctx.fillRect(courtLeft, courtTop, courtWidth, courtHeight);
    ctx.restore();

    const barrier = images[UNITY_FX_IMAGES.barrier];
    if (isReadyImage(barrier)) {
      drawSpriteImage(ctx, barrier, courtLeft + 8, courtTop - 18, courtWidth - 16, 18, false, 0.95);
      drawSpriteImage(ctx, barrier, courtLeft + 8, courtTop + courtHeight, courtWidth - 16, 18, false, 0.95);
    }

    const judgeTable = images[UNITY_FX_IMAGES.judgeTable];
    if (isReadyImage(judgeTable)) {
      drawSpriteImage(ctx, judgeTable, width / 2 - 120, 22, 240, 72, false, 0.95);
    }

    const seatBlue = images[UNITY_FX_IMAGES.seatBlue];
    const seatRed = images[UNITY_FX_IMAGES.seatRed];
    if (isReadyImage(seatRed)) {
      drawSpriteImage(ctx, seatRed, 42, height / 2 - 118, 64, 88, false, 0.92);
      drawSpriteImage(ctx, seatRed, 42, height / 2 + 28, 64, 88, false, 0.92);
    }
    if (isReadyImage(seatBlue)) {
      drawSpriteImage(ctx, seatBlue, width - 106, height / 2 - 118, 64, 88, false, 0.92);
      drawSpriteImage(ctx, seatBlue, width - 106, height / 2 + 28, 64, 88, false, 0.92);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.48)';
    ctx.lineWidth = 3;
    ctx.strokeRect(92, 110, width - 184, height - 220);
    ctx.beginPath();
    ctx.moveTo(width / 2, 110);
    ctx.lineTo(width / 2, height - 110);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(104, height / 2, 124, -Math.PI / 2.9, Math.PI / 2.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width - 104, height / 2, 124, Math.PI - Math.PI / 2.9, Math.PI + Math.PI / 2.9);
    ctx.stroke();

    ctx.fillStyle = 'rgba(7,28,56,0.86)';
    ctx.fillRect(width - 154, height / 2 - 88, 62, 176);
    ctx.fillStyle = 'rgba(72,20,20,0.86)';
    ctx.fillRect(92, height / 2 - 88, 62, 176);

    const basketLeft = { x: 104, y: height / 2 };
    const basketRight = { x: width - 104, y: height / 2 };
    drawStylizedHoop(ctx, basketLeft, 'left', {
      post: 'rgba(113,31,31,0.96)',
      glow: 'rgba(248,113,113,0.52)',
    }, 'back');
    drawStylizedHoop(ctx, basketRight, 'right', {
      post: 'rgba(24,73,135,0.96)',
      glow: 'rgba(96,165,250,0.48)',
    }, 'back');

    for (const entity of state.entities) {
      const lift = Math.max(jumpLiftMs(entity.jumpMs ?? 0), dunkLiftMs(entity.dunkMs ?? 0), blockLiftMs(entity.blockMs ?? 0));
      const drawY = entity.pos.y - lift;
      const stamina = Math.round(state.staminaByPlayerId[entity.id] ?? 100);
      const healthRatio = Math.max(0, Math.min(1, (entity.health ?? 10) / (entity.maxHealth ?? 10)));
      const highlight = entity.id === controlledUserId;
      const hasBall = state.ball.kind === 'possession' && state.ball.ownerId === entity.id;
      const look = getUnityLook(entity);
      const pulse = highlight ? 0.74 + Math.sin(nowMs / 120) * 0.12 : 0.5;
      const dunkProgress = entity.dunkMs > 0 ? 1 - Math.max(0, Math.min(1, entity.dunkMs / 360)) : 0;
      const blockProgress = entity.blockMs > 0 ? 1 - Math.max(0, Math.min(1, entity.blockMs / 420)) : 0;

      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(entity.pos.x, entity.pos.y + 12, Math.max(12, 19 - lift * 0.18), Math.max(5, 9.5 - lift * 0.09), 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = hasBall ? '#ffe082' : highlight ? `rgba(255,255,255,${pulse})` : look.ring;
      ctx.lineWidth = hasBall ? 4 : highlight ? 3 : 2;
      ctx.beginPath();
      ctx.arc(entity.pos.x, entity.pos.y + 8, hasBall ? 20 : 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(15,23,42,0.78)';
      ctx.fillRect(entity.pos.x - 24, drawY - 39, 48, 5);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(entity.pos.x - 24, drawY - 39, 48 * healthRatio, 5);

      if (entity.impactMs > 0) {
        ctx.strokeStyle = entity.team === 'user' ? 'rgba(90,174,255,0.42)' : 'rgba(255,107,107,0.42)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(entity.pos.x, drawY, entity.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      const rawFacing = entity.facing ?? { x: entity.team === 'user' ? -1 : 1, y: 0 };
      const faceDir = normalize(rawFacing.x === 0 && rawFacing.y === 0 ? { x: entity.team === 'user' ? -1 : 1, y: 0 } : rawFacing);
      const sprite = images[getUnityFrame(entity, nowMs)];
      if (isReadyImage(sprite)) {
        const airScale =
          entity.dunkMs > 0
            ? 1.12 + Math.sin(dunkProgress * Math.PI) * 0.14
            : entity.blockMs > 0
              ? 1.08 + Math.sin(blockProgress * Math.PI) * 0.18
              : 1;
        const spriteWidth = 90 * airScale;
        const spriteHeight =
          90 *
          (entity.dunkMs > 0
            ? 1.08 + Math.sin(dunkProgress * Math.PI) * 0.2
            : entity.blockMs > 0
              ? 1.1 + Math.sin(blockProgress * Math.PI) * 0.24
              : 1);
        const airDriveX =
          entity.dunkMs > 0
            ? faceDir.x * (8 + Math.sin(dunkProgress * Math.PI) * 12)
            : entity.blockMs > 0
              ? faceDir.x * (2 + Math.sin(blockProgress * Math.PI) * 6)
              : 0;
        const airDriveY =
          entity.dunkMs > 0
            ? -Math.sin(dunkProgress * Math.PI) * 10
            : entity.blockMs > 0
              ? -8 - Math.sin(blockProgress * Math.PI) * 14
              : 0;
        if (entity.dunkMs > 0) {
          ctx.strokeStyle = entity.team === 'user' ? 'rgba(96,165,250,0.34)' : 'rgba(248,113,113,0.34)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(entity.pos.x - faceDir.x * 8, drawY + 8);
          ctx.lineTo(entity.pos.x + faceDir.x * 16, drawY - 18);
          ctx.stroke();

          ctx.fillStyle = entity.team === 'user' ? 'rgba(147,197,253,0.18)' : 'rgba(252,165,165,0.18)';
          ctx.beginPath();
          ctx.ellipse(entity.pos.x + faceDir.x * 8, drawY - 6, 14 + dunkProgress * 10, 6 + dunkProgress * 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (entity.blockMs > 0) {
          const blockGlow = entity.team === 'user' ? 'rgba(125,211,252,0.26)' : 'rgba(252,165,165,0.26)';
          drawSpriteImage(
            ctx,
            sprite,
            entity.pos.x - spriteWidth / 2 - faceDir.x * 10,
            drawY - spriteHeight + 34,
            spriteWidth,
            spriteHeight,
            faceDir.x < 0,
            0.16,
          );
          drawSpriteImage(
            ctx,
            sprite,
            entity.pos.x - spriteWidth / 2 - faceDir.x * 4,
            drawY - spriteHeight + 18,
            spriteWidth,
            spriteHeight,
            faceDir.x < 0,
            0.24,
          );
          ctx.strokeStyle = blockGlow;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(entity.pos.x, drawY + 10);
          ctx.lineTo(entity.pos.x + faceDir.x * 10, drawY - 30);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(entity.pos.x, drawY - 12, entity.radius + 8 + Math.sin(blockProgress * Math.PI) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawSpriteImage(
          ctx,
          sprite,
          entity.pos.x - spriteWidth / 2 + airDriveX,
          drawY - spriteHeight + (entity.dunkMs > 0 || entity.blockMs > 0 ? 24 + airDriveY : 20),
          spriteWidth,
          spriteHeight,
          faceDir.x < 0,
          entity.stunMs > 0 || (entity.koMs ?? 0) > 0 ? 0.8 : 1,
        );
      } else {
        ctx.fillStyle = entity.stunMs > 0 || (entity.koMs ?? 0) > 0 ? '#cbd5e1' : entity.color;
        ctx.beginPath();
        ctx.arc(entity.pos.x, drawY, entity.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(15,23,42,0.62)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.strokeStyle = hasBall ? '#fde68a' : look.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(entity.pos.x - 7, drawY + 17);
      ctx.lineTo(entity.pos.x + 7, drawY + 17);
      ctx.stroke();

      ctx.fillStyle = 'rgba(15,23,42,0.76)';
      ctx.fillRect(entity.pos.x - 20, drawY - 26, 40, 6);
      ctx.fillStyle = staminaTone(stamina);
      ctx.fillRect(entity.pos.x - 20, drawY - 26, 40 * (stamina / 100), 6);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText(`#${entity.jerseyNumber ?? entity.slotIndex + 1}`, entity.pos.x, drawY + 34);
      ctx.textAlign = 'start';
    }

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + 12, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const ballSprite = images[UNITY_SHARED_IMAGES.ball];
    const ballLift = (ball.zArc ?? 0) * 0.08;
    if (state.ball.kind === 'loose' && state.ball.source === 'shot' && Math.hypot(state.ball.vel.x, state.ball.vel.y) > 220) {
      const trailDir = normalize(state.ball.vel);
      ctx.strokeStyle = 'rgba(255,226,138,0.34)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(ball.x - trailDir.x * 10, ball.y - ballLift - trailDir.y * 10);
      ctx.lineTo(ball.x - trailDir.x * 42, ball.y - ballLift - trailDir.y * 42);
      ctx.stroke();
    }
    if (isReadyImage(ballSprite)) {
      const ballSize = 18 + Math.min(10, (ball.zArc ?? 0) * 0.03) + (state.ball.kind === 'shot' && state.ball.isDunk ? 4 : 0);
      ctx.save();
      ctx.translate(ball.x, ball.y - ballLift);
      ctx.rotate(nowMs / 140);
      ctx.drawImage(ballSprite, -ballSize / 2, -ballSize / 2, ballSize, ballSize);
      ctx.restore();
    } else {
      ctx.fillStyle = '#e86c2e';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y - ballLift, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (state.ball.kind === 'shot' && state.ball.isDunk) {
      const dunkFlash = Math.max(0, 1 - Math.abs(1 - Math.min(1, state.ball.t / state.ball.duration) * 1.35));
      ctx.strokeStyle = `rgba(255,244,214,${0.18 + dunkFlash * 0.22})`;
      ctx.lineWidth = 2.4;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(state.ball.target.x + i * 6, state.ball.target.y - 1);
        ctx.lineTo(state.ball.target.x + i * 3, state.ball.target.y + 24 + dunkFlash * 8);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,216,107,${0.18 + dunkFlash * 0.22})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(state.ball.target.x, state.ball.target.y, 18 + dunkFlash * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawStylizedHoop(ctx, basketLeft, 'left', {
      post: 'rgba(113,31,31,0.96)',
      glow: 'rgba(248,113,113,0.52)',
    }, 'front');
    drawStylizedHoop(ctx, basketRight, 'right', {
      post: 'rgba(24,73,135,0.96)',
      glow: 'rgba(96,165,250,0.48)',
    }, 'front');

    ctx.font = '16px Arial';
    for (const event of state.events) {
      const age = (nowMs - event.createdAtMs) / 2500;
      const alpha = clamp(1 - age, 0, 1);
      const y = event.y - age * 22;
      ctx.fillStyle =
        event.tone === 'green'
          ? `rgba(40,167,69,${alpha})`
          : event.tone === 'red'
            ? `rgba(220,53,69,${alpha})`
            : event.tone === 'gold'
              ? `rgba(212,175,55,${alpha})`
              : `rgba(33,150,243,${alpha})`;
      ctx.fillText(event.text, event.x - 34, y);
    }

    const scoreboardX = width / 2 - 194;
    const scoreboardY = 10;
    const scoreboardWidth = 388;
    const scoreboardHeight = 76;
    drawRoundedRect(ctx, scoreboardX, scoreboardY, scoreboardWidth, scoreboardHeight, 20);
    ctx.fillStyle = 'rgba(5,10,18,0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const scoreboardLogoSize = 28;
    if (isReadyImage(logoBlue)) {
      drawSpriteImage(ctx, logoBlue, scoreboardX + 16, scoreboardY + 22, scoreboardLogoSize, scoreboardLogoSize);
    }
    if (isReadyImage(logoRed)) {
      drawSpriteImage(ctx, logoRed, scoreboardX + scoreboardWidth - 44, scoreboardY + 22, scoreboardLogoSize, scoreboardLogoSize);
    }

    const seconds = Math.floor((state.timeLeftMs % 60000) / 1000)
      .toString()
      .padStart(2, '0');
    const owner = state.ball.kind === 'possession' ? state.entities.find((entity) => entity.id === state.ball.ownerId) : null;
    const possessionText = owner ? ` | BALL ${shortenLabel(owner.name.toUpperCase(), 16)}` : '';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(226,232,240,0.72)';
    ctx.font = 'bold 10px Trebuchet MS';
    ctx.fillText(canvasUserLabel, scoreboardX + 88, scoreboardY + 24);
    ctx.fillText(canvasAiLabel, scoreboardX + scoreboardWidth - 88, scoreboardY + 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Trebuchet MS';
    ctx.fillText(`${state.score.user} - ${state.score.ai}`, width / 2, scoreboardY + 44);
    ctx.font = '12px Trebuchet MS';
    ctx.fillStyle = 'rgba(226,232,240,0.88)';
    ctx.fillText(`CLOCK ${Math.floor(state.timeLeftMs / 60000)}:${seconds}${possessionText}`, width / 2, scoreboardY + 63);
    ctx.restore();
    ctx.restore();
  }

  const canSubstitute = Boolean(matchRef.current && matchRef.current.ball.kind === 'possession' && matchRef.current.resetTimerMs === 0 && !ended);

  const handleSubstitute = (slotIndex: 0 | 1, playerId: string) => {
    const match = matchRef.current;
    if (!match) return;
    if (substituteActivePlayer(match, 'user', slotIndex, playerId, 'manual')) {
      setHud(buildHudSnapshot(match));
    }
  };

  const currentMatchLabel = props.matchLabel ?? `${userDisplayName} vs ${aiDisplayName}`;
  const livePrimaryActionText = userOwnsBall(matchRef.current)
    ? 'Primary action is hot: Space gives you a jumper by default, but if you drive all the way to the rim it now turns into a real dunk window while Click or P still throws a lead pass.'
    : 'Primary action is defensive: Space contests shots and attacks rebounds while Click or P stays ready for the outlet pass.';

  const handleSimulateRest = () => {
    const match = matchRef.current;
    if (!match || ended) return;
    const final = simulateRestOfMatch(match);
    setEnded(final);
    setHud(buildHudSnapshot(match));
    setOptionsOpen(false);
    props.onExit(final);
  };

  const handleAbandon = () => {
    setOptionsOpen(false);
    props.onAbandon();
  };

  return (
    <div className="gameFullscreen">
      <div className="gameFullscreenGlow gameFullscreenGlowLeft" aria-hidden="true" />
      <div className="gameFullscreenGlow gameFullscreenGlowRight" aria-hidden="true" />
      <button className="gameOptionsButton" onClick={() => setOptionsOpen((prev) => !prev)}>
        {optionsOpen ? 'Close' : 'Options'}
      </button>
      <div className="gameTopHudBar">
        <div className="gameBroadcastRow">
          <div className="gameBroadcastCard">
            {/* legacy header removed
            <div style={{ fontSize: 14, opacity: 0.92, fontWeight: 900, color: '#f8fafc' }}>
              Arcade Basketball • Depth matters • Fatigue and bench usage now swing close games
            </div>
            {hud && (
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                Score {hud.score.user}-{hud.score.ai} • {hud.timeLabel} • {hud.ballOwnerName ? `Ball: ${hud.ballOwnerName}` : 'Live play'}
              </div>
            )}
            */}
            <div className="gameBroadcastKicker">{props.matchMetaLabel ?? 'Arcade Exhibition'}</div>
            <div className="gameBroadcastTitle">{currentMatchLabel}</div>
            <div className="gameBroadcastMeta">
              <span className="gameBroadcastMetaPill">{userDisplayName}</span>
              <span className="gameBroadcastMetaPill">{aiDisplayName}</span>
              {hud ? (
                <>
                  <span className="gameBroadcastMetaPill">{hud.timeLabel}</span>
                  <span className="gameBroadcastMetaPill">{hud.ballOwnerName ? `Ball: ${hud.ballOwnerName}` : 'Tip-off live'}</span>
                </>
              ) : (
                <span className="gameBroadcastMetaPill">Loading warmups...</span>
              )}
            </div>
          </div>
          <div className="gameScoreStack">
            <div className="gameMiniScore" aria-label="Live score">
              <div className="gameMiniScoreTeam">
                <span className="gameMiniScoreLabel">{userShortLabel}</span>
                <strong>{hud?.score.user ?? 0}</strong>
              </div>
              <div className="gameMiniScoreDivider">-</div>
              <div className="gameMiniScoreTeam">
                <span className="gameMiniScoreLabel">{aiShortLabel}</span>
                <strong>{hud?.score.ai ?? 0}</strong>
              </div>
            </div>
            <button
            onClick={() => {
              if (!ended) return;
              props.onExit(ended);
            }}
            disabled={!ended}
            className={`btn ${ended ? 'btnPrimary' : ''}`}
            style={{
              padding: '10px 14px',
              opacity: ended ? 1 : 0.6,
              cursor: ended ? 'pointer' : 'not-allowed',
              borderColor: 'rgba(255,255,255,0.18)',
              background: ended ? undefined : 'rgba(255,255,255,0.75)',
              color: ended ? '#fff' : 'var(--text)',
            }}
          >
            {ended ? 'Continue' : 'Live Match'}
          </button>
          </div>
        </div>

        <div className="gameHudGrid">
          <div className="card gamePanelCard">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>{userDisplayName} Rotation</b>
              <span className="muted" style={{ fontSize: 12 }}>
                {canSubstitute ? 'Manual substitutions open' : 'Wait for a live possession to swap players'}
              </span>
            </div>
            {hud ? (
              <div className="gameRotationGrid" style={{ marginTop: 12 }}>
                {hud.userActive.map((player) => (
                  <RotationCard
                    key={player.id}
                    title={player.slotIndex === 0 ? 'Ball Handler' : 'Defender'}
                    player={player}
                    bench={hud.userBench}
                    canSubstitute={canSubstitute}
                    onSubstitute={(playerId) => handleSubstitute(player.slotIndex, playerId)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="card gameOpponentCard">
            <b>{aiDisplayName} On Court</b>
            {hud ? (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {hud.aiActive.map((player) => (
                  <div key={player.id} style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{player.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.72 }}>{player.position} • OVR {player.overall}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: staminaTone(player.stamina) }}>{player.stamina}%</div>
                        <div style={{ fontSize: 11, opacity: 0.72 }}>{fatigueLabel(player.stamina)}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <StaminaBar stamina={player.stamina} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="gameFeedHeader" style={{ marginTop: 14 }}>
              <b>Fight Log</b>
              <span className="muted" style={{ fontSize: 12 }}>
                {hud?.controlledName ? `Control: ${hud.controlledName}` : 'Live commentary'}
              </span>
            </div>
            {hud?.recentEvents.length ? (
              <div className="gameFeedList">
                {hud.recentEvents.map((eventText, index) => (
                  <div key={`${eventText}-${index}`} className="gameFeedItem">
                    {eventText}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5 }}>
                The last few steals, hits, and shot swings will stack here once the game gets moving.
              </div>
            )}
          </div>
        </div>

        <div className="gameCanvasShell">
          <canvas ref={canvasRef} className="gameStageCanvas" style={{ width: '100%', height: 'auto', display: 'block', background: '#0b1624' }} />
        </div>

        <div className="gameLowerDeck">
          <div className="gameControlCorner">
            <div className="gameControlHeader">
              <div>
                <div className="gameControlKicker">Control Corner</div>
                <div className="gameControlTitle">Smarter On-Court Inputs</div>
              </div>
              <div className="gameControlStatus">{hud?.controlledName ? `Control: ${hud.controlledName}` : 'Live control swap'}</div>
            </div>
            <div className="gameControlSubtext">{livePrimaryActionText}</div>
            <div className="gameControlGrid">
              {CONTROL_CORNER_HINTS.map((hint) => (
                <div key={hint.title} className="gameControlTile">
                  <div className="gameControlKeys">
                    {hint.keys.map((key) => (
                      <ControlKey key={key} label={key} />
                    ))}
                  </div>
                  <div className="gameControlTileTitle">{hint.title}</div>
                  <div className="gameControlTileDetail">{hint.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="gameHowToCard">
            <div className="gameControlKicker">How To Play</div>
            <div className="gameControlTitle">Win The Floor Battle</div>
            <div className="gameHowToList">
              {HOW_TO_PLAY_STEPS.map((step, index) => (
                <div key={step.title} className="gameHowToStep">
                  <div className="gameHowToIndex">0{index + 1}</div>
                  <div>
                    <div className="gameHowToStepTitle">{step.title}</div>
                    <div className="gameHowToStepDetail">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {optionsOpen && (
          <div className="gameOptionsScrim" onClick={() => setOptionsOpen(false)}>
            <div className="gameOptionsPanel" onClick={(e) => e.stopPropagation()}>
              <div className="gameOptionsTitle">Match Options</div>
              <div className="gameOptionsBody">
                <div className="gameOptionsMeta">
                  <div>{currentMatchLabel}</div>
                  <div>{hud ? `${hud.score.user}-${hud.score.ai} • ${hud.timeLabel}` : 'Loading...'}</div>
                </div>
                {!ended && (
                  <button className="btn btnPrimary" onClick={handleSimulateRest}>
                    Simulate Rest Of Game
                  </button>
                )}
                {ended && (
                  <button className="btn btnPrimary" onClick={() => props.onExit(ended)}>
                    Continue
                  </button>
                )}
                {!ended && (
                  <button className="btn btnGhost" onClick={handleAbandon}>
                    Exit And Reset Match
                  </button>
                )}
                <button className="btn btnSoft" onClick={() => setOptionsOpen(false)}>
                  Return To Match
                </button>
              </div>
            </div>
          </div>
        )}

        {ended && (
          <div className="gameFinalPanel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <b>Match Finished</b>
                <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>{/* legacy summary removed
                  {ended.winner === 'user' ? 'You win' : ended.winner === 'ai' ? 'Rival wins' : 'Draw'} • Score {ended.finalScore.user} - {ended.finalScore.ai}
                */}{ended.winner === 'user' ? `${userDisplayName} win` : ended.winner === 'ai' ? `${aiDisplayName} win` : 'Draw'} - Score {ended.finalScore.user} - {ended.finalScore.ai}</div>
              </div>
              <div className="muted" style={{ fontSize: 13, opacity: 0.8 }}>
                Rotation choices and fatigue now shape the late game
              </div>
            </div>

            <div style={{ marginTop: 12 }} className="grid2">
              <TeamStatPanel title={userDisplayName} roster={props.user.roster} statsById={ended.playerStatsByEntityId} />
              <TeamStatPanel title={aiDisplayName} roster={props.ai.roster} statsById={ended.playerStatsByEntityId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamStatPanel(props: { title: string; roster: TeamPlayer[]; statsById: Record<string, PlayerInGameStats> }) {
  const rows = [...props.roster].sort((a, b) => (props.statsById[b.id]?.points ?? 0) - (props.statsById[a.id]?.points ?? 0));
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 12, padding: 12 }}>
      <b>{props.title}</b>
      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        {rows.map((player) => {
          const stats = props.statsById[player.id];
          return (
            <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 170 }}>
                <div style={{ fontWeight: 700 }}>{player.prospect.name}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>{`Potential ${player.prospect.potential} • ${player.prospect.position}`}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.9 }}>
                <div>PTS {stats?.points ?? 0}</div>
                <div>AST {stats?.assists ?? 0}</div>
                <div>REB {stats?.rebounds ?? 0}</div>
                <div>STL {stats?.steals ?? 0}</div>
                <div>BLK {stats?.blocks ?? 0}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalize(v: { x: number; y: number }) {
  const l = Math.hypot(v.x, v.y);
  if (!l) return { x: 0, y: 1 };
  return { x: v.x / l, y: v.y / l };
}
