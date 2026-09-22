import Matter from "matter-js";
import { PARTS, WORLD, costOf, type Placement, type Level } from "./levels";
const { Engine, Bodies, Body, Composite, Query } = Matter;
const radians = (a: number) => (a * Math.PI) / 180;
export type RunResult = {
  won: boolean;
  ticks: number;
  time: number;
  score: number;
  stars: number;
  cost: number;
  parts: number;
  version: string;
};
export function validateBuild(level: Level, input: unknown): Placement[] {
  if (!Array.isArray(input) || input.length > 8)
    throw new Error("Too many parts");
  const counts: Record<string, number> = {};
  const ids = new Set<string>();
  const parts = input.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid part");
    const p = raw as Placement;
    if (
      typeof p.id !== "string" ||
      !p.id ||
      p.id.length > 50 ||
      ids.has(p.id) ||
      !Object.hasOwn(PARTS, p.kind)
    )
      throw new Error("Invalid part");
    ids.add(p.id);
    counts[p.kind] = (counts[p.kind] || 0) + 1;
    if (counts[p.kind] > (level.inventory[p.kind] || 0))
      throw new Error("Part limit reached");
    if (
      ![p.x, p.y, p.angle].every(Number.isFinite) ||
      p.x < 35 ||
      p.x > 925 ||
      p.y < 160 ||
      p.y > 495 ||
      p.angle < -75 ||
      p.angle > 75 ||
      p.angle % 5 !== 0
    )
      throw new Error("Part outside build area");
    if (Math.hypot(p.x - level.spawn.x, p.y - level.spawn.y) < 50)
      throw new Error("Leave space for the ball");
    if (
      Math.abs(p.x - level.goal.x) < level.goal.width / 2 + 20 &&
      Math.abs(p.y - level.goal.y) < 48
    )
      throw new Error("Keep the goal clear");
    return {
      id: p.id,
      kind: p.kind,
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: p.angle,
    };
  });
  if (costOf(parts) > level.budget) throw new Error("Over budget");
  return parts;
}
export function createSimulation(level: Level, parts: Placement[]) {
  const engine = Engine.create({
    enableSleeping: false,
    positionIterations: 8,
    velocityIterations: 8,
  });
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  // All bodies are created in a stable order. No wall-clock runner, randomness, or Phaser-specific physics.
  const fixed = level.platforms.map((p) =>
    Bodies.rectangle(p.x, p.y, p.width, p.height, {
      isStatic: true,
      angle: radians(p.angle || 0),
      friction: 0.025,
      restitution: 0,
    }),
  );
  const goalBase = Bodies.rectangle(
    level.goal.x,
    level.goal.y + 45,
    level.goal.width,
    12,
    { isStatic: true, friction: 0.3 },
  );
  const goalWalls = [-1, 1].map((s) =>
    Bodies.rectangle(
      level.goal.x + (s * level.goal.width) / 2,
      level.goal.y + 18,
      10,
      60,
      { isStatic: true, restitution: 0.05 },
    ),
  );
  const partBodies = parts.map((p) =>
    Bodies.rectangle(p.x, p.y, PARTS[p.kind].width, PARTS[p.kind].height, {
      isStatic: true,
      angle: radians(p.angle),
      friction: 0.018,
      restitution: 0,
      label: p.id,
    }),
  );
  const ball = Bodies.circle(level.spawn.x, level.spawn.y, 15, {
    density: 0.002,
    friction: 0.015,
    frictionAir: 0.0005,
    restitution: 0.12,
    slop: 0.02,
  });
  if (level.spawn.vx) Body.setVelocity(ball, { x: level.spawn.vx, y: 0 });
  Composite.add(engine.world, [
    ...fixed,
    goalBase,
    ...goalWalls,
    ...partBodies,
    ball,
  ]);
  let ticks = 0,
    settle = 0,
    finished = false,
    won = false;
  const springTicks = new Map<string, number>();
  function step() {
    if (finished) return;
    Engine.update(engine, WORLD.dt);
    ticks++;
    parts.forEach((p, i) => {
      if (p.kind !== "spring" || ticks - (springTicks.get(p.id) ?? -100) < 30)
        return;
      if (Query.collides(ball, [partBodies[i]]).length) {
        const a = radians(p.angle);
        Body.setVelocity(ball, { x: Math.sin(a) * 15, y: -Math.cos(a) * 15 });
        springTicks.set(p.id, ticks);
      }
    });
    const inGoal =
      Math.abs(ball.position.x - level.goal.x) < level.goal.width / 2 - 17 &&
      ball.position.y > level.goal.y - 22 &&
      ball.position.y < level.goal.y + 32;
    settle = inGoal ? settle + 1 : 0;
    if (settle >= 12) {
      won = true;
      finished = true;
    }
    if (
      ticks >= WORLD.maxTicks ||
      ball.position.y > 610 ||
      ball.position.x < -80 ||
      ball.position.x > 1040
    )
      finished = true;
  }
  function result(): RunResult {
    const cost = costOf(parts),
      time = Math.round(ticks * WORLD.dt) / 1000;
    const score = won
      ? Math.max(
          100,
          Math.round(10000 - cost * 60 - parts.length * 100 - time * 30),
        )
      : 0;
    const stars = won
      ? cost <= level.parCost && time <= level.parTime
        ? 3
        : cost <= level.parCost
          ? 2
          : 1
      : 0;
    return {
      won,
      ticks,
      time,
      score,
      stars,
      cost,
      parts: parts.length,
      version: WORLD.version,
    };
  }
  return {
    engine,
    ball,
    partBodies,
    fixed,
    step,
    result,
    get ticks() {
      return ticks;
    },
    get finished() {
      return finished;
    },
    get won() {
      return won;
    },
    dispose() {
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },
  };
}
export function replay(level: Level, build: unknown): RunResult {
  const parts = validateBuild(level, build);
  const sim = createSimulation(level, parts);
  while (!sim.finished) sim.step();
  const result = sim.result();
  sim.dispose();
  return result;
}
