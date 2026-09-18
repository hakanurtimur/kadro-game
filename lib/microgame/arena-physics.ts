import type { ArenaPosition } from "./types";

// World units are percentages of the arena, not device pixels.
export const ARENA_PHYSICS = {
  radius: 5.5,
  moveSpeed: 34,
  maxSpeed: 68,
  recoveryMs: 260,
  knockbackDrag: 2.4,
  steerResponse: 18,
  maxFrameSeconds: .05,
  maxSubstepSeconds: 1 / 120,
  maxPeerAgeMs: 1200,
  maxPredictionSeconds: .1,
} as const;

export type ArenaPoint = { x: number; y: number };
export type ArenaPeer = ArenaPosition & { vx: number; vy: number };
export type ArenaMotion = ArenaPoint & {
  vx: number;
  vy: number;
  knockbackUntil: number;
  lastHitAt: number;
  contacts: Record<string, true>;
};

const diameter = ARENA_PHYSICS.radius * 2;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: number) => Number.isFinite(value);

export function createArenaMotion(point: ArenaPoint): ArenaMotion {
  return {
    x: clamp(finite(point.x) ? point.x : 50, ARENA_PHYSICS.radius, 100 - ARENA_PHYSICS.radius),
    y: clamp(finite(point.y) ? point.y : 50, ARENA_PHYSICS.radius, 100 - ARENA_PHYSICS.radius),
    vx: 0, vy: 0, knockbackUntil: 0, lastHitAt: 0, contacts: {},
  };
}

/** Derive incoming speed from the existing position channel; no remote writes. */
export function sampleArenaPeers(
  previous: Record<string, ArenaPeer>,
  positions: Record<string, ArenaPosition>,
  roundNumber: number,
  members: ReadonlySet<string>,
  out: Readonly<Record<string, number>>,
): Record<string, ArenaPeer> {
  const result: Record<string, ArenaPeer> = {};
  for (const [key, sample] of Object.entries(positions)) {
    if (sample.uid !== key || !members.has(key) || Object.hasOwn(out, key) || sample.roundNumber !== roundNumber) continue;
    if (![sample.x, sample.y, sample.updatedAt].every(finite)) continue;
    const old = previous[key];
    if (old && sample.updatedAt <= old.updatedAt) { result[key] = old; continue; }
    const elapsed = old ? (sample.updatedAt - old.updatedAt) / 1000 : 0;
    let vx = 0, vy = 0;
    // Long gaps are reconnects, not a launch across the arena.
    if (old && elapsed >= .015 && elapsed <= .4) {
      vx = (sample.x - old.x) / elapsed;
      vy = (sample.y - old.y) / elapsed;
      const speed = Math.hypot(vx, vy);
      if (speed > ARENA_PHYSICS.maxSpeed) {
        vx *= ARENA_PHYSICS.maxSpeed / speed;
        vy *= ARENA_PHYSICS.maxSpeed / speed;
      }
    }
    result[key] = { ...sample, vx, vy };
  }
  return result;
}

/**
 * Each client continues to own only its own body. A normal impulse transfers the
 * rival's approach speed; a brief recovery preserves it instead of overwriting
 * it with the pointer target on the following frame.
 */
export function stepArenaMotion(
  current: ArenaMotion,
  target: ArenaPoint,
  peers: readonly ArenaPeer[],
  uid: string,
  now: number,
  elapsedSeconds: number,
): { body: ArenaMotion; hit: boolean } {
  const body: ArenaMotion = { ...current, contacts: { ...current.contacts } };
  const dt = clamp(finite(elapsedSeconds) ? elapsedSeconds : 0, 0, ARENA_PHYSICS.maxFrameSeconds);
  if (!dt || !finite(now)) return { body, hit: false };
  const steps = Math.max(1, Math.ceil(dt / ARENA_PHYSICS.maxSubstepSeconds));
  const h = dt / steps;
  const activePeers = peers.filter(peer =>
    peer.uid !== uid && [peer.x, peer.y, peer.vx, peer.vy, peer.updatedAt].every(finite) &&
    now - peer.updatedAt <= ARENA_PHYSICS.maxPeerAgeMs && peer.updatedAt - now <= 1000
  ).slice().sort((a, b) => a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
  for (const id of Object.keys(body.contacts)) {
    if (!activePeers.some(peer => peer.uid === id)) delete body.contacts[id];
  }
  let hit = false;

  for (let step = 0; step < steps; step++) {
    const at = now - (steps - step - 1) * h * 1000;
    if (at < body.knockbackUntil) {
      const drag = Math.exp(-ARENA_PHYSICS.knockbackDrag * h);
      body.vx *= drag;
      body.vy *= drag;
    } else {
      const dx = (finite(target.x) ? target.x : body.x) - body.x;
      const dy = (finite(target.y) ? target.y : body.y) - body.y;
      const length = Math.hypot(dx, dy);
      const speed = Math.min(ARENA_PHYSICS.moveSpeed, length * 12);
      const response = 1 - Math.exp(-ARENA_PHYSICS.steerResponse * h);
      body.vx += ((length > .001 ? dx / length * speed : 0) - body.vx) * response;
      body.vy += ((length > .001 ? dy / length * speed : 0) - body.vy) * response;
    }
    body.x += body.vx * h;
    body.y += body.vy * h;

    for (const peer of activePeers) {
      const prediction = clamp((at - peer.updatedAt) / 1000, 0, ARENA_PHYSICS.maxPredictionSeconds);
      const px = peer.x + peer.vx * prediction;
      const py = peer.y + peer.vy * prediction;
      const dx = body.x - px, dy = body.y - py;
      const length = Math.hypot(dx, dy);
      if (length > diameter + .8) { delete body.contacts[peer.uid]; continue; }
      if (length > diameter) continue;

      // Perfectly coincident centers still need opposite, deterministic normals.
      const nx = length > .001 ? dx / length : uid < peer.uid ? -1 : 1;
      const ny = length > .001 ? dy / length : 0;
      const correction = Math.max(0, diameter - length) * .6;
      body.x += nx * correction;
      body.y += ny * correction;

      const closingSpeed = (peer.vx - body.vx) * nx + (peer.vy - body.vy) * ny;
      if (!body.contacts[peer.uid] && closingSpeed > 2) {
        const impulse = Math.min(62, closingSpeed * .95 + 8);
        body.vx += nx * impulse;
        body.vy += ny * impulse;
        body.knockbackUntil = at + ARENA_PHYSICS.recoveryMs;
        body.lastHitAt = at;
        hit = true;
      }
      // A held target cannot drive back through a body while contact persists.
      const inwardSpeed = body.vx * nx + body.vy * ny;
      if (inwardSpeed < 0) {
        body.vx -= nx * inwardSpeed;
        body.vy -= ny * inwardSpeed;
      }
      // Rearm only after separation: continuous contact cannot amplify itself.
      body.contacts[peer.uid] = true;
    }

    const speed = Math.hypot(body.vx, body.vy);
    if (speed > ARENA_PHYSICS.maxSpeed) {
      body.vx *= ARENA_PHYSICS.maxSpeed / speed;
      body.vy *= ARENA_PHYSICS.maxSpeed / speed;
    }
    const low = ARENA_PHYSICS.radius, high = 100 - low;
    if (body.x < low) { body.x = low; body.vx = Math.max(0, body.vx); }
    if (body.x > high) { body.x = high; body.vx = Math.min(0, body.vx); }
    if (body.y < low) { body.y = low; body.vy = Math.max(0, body.vy); }
    if (body.y > high) { body.y = high; body.vy = Math.min(0, body.vy); }
  }
  return { body, hit };
}
