import Matter from "matter-js";
import { PARTS, WORLD, costOf, type Placement, type Level } from "./levels";
const { Engine, Bodies, Body, Composite, Query, Constraint } = Matter;
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
  reason?: string;
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
    if (
      [level.spawn, ...(level.second ? [level.second.spawn] : [])].some(
        (s) => Math.hypot(p.x - s.x, p.y - s.y) < 50,
      )
    )
      throw new Error("Leave space for the ball");
    if (
      [level.goal, ...(level.second ? [level.second.goal] : [])].some(
        (g) =>
          Math.abs(p.x - g.x) < g.width / 2 + 20 && Math.abs(p.y - g.y) < 48,
      )
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
    {
      isStatic: level.id !== 7,
      friction: 0.3,
      density: 0.012,
      frictionAir: 0.03,
    },
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
  const partBodies = parts.map((p) => {
    const options = {
      isStatic: p.kind !== "pivot" && p.kind !== "wheel",
      angle: radians(p.angle),
      friction: p.kind === "rough" ? 1 : p.kind === "smooth" ? 0 : 0.018,
      frictionStatic: p.kind === "rough" ? 2 : 0.1,
      restitution: 0,
      label: p.id,
      frictionAir: 0.015,
    };
    return p.kind === "wheel"
      ? Bodies.circle(p.x, p.y, 22, options)
      : Bodies.rectangle(
          p.x,
          p.y,
          PARTS[p.kind].width,
          PARTS[p.kind].height,
          options,
        );
  });
  const hinges = parts.flatMap((p, i) =>
    p.kind === "pivot" || p.kind === "wheel"
      ? [
          Constraint.create({
            pointA: { x: p.x, y: p.y },
            bodyB: partBodies[i],
            pointB: { x: 0, y: 0 },
            length: 0,
            stiffness: 1,
          }),
        ]
      : [],
  );
  if (level.id === 7)
    hinges.push(
      Constraint.create({
        pointA: { x: level.goal.x, y: level.goal.y + 45 },
        bodyB: goalBase,
        length: 0,
        stiffness: 1,
      }),
    );
  const cargoOptions = {
    density: level.cargo === "box" ? 0.008 : 0.002,
    friction: 0.015,
    frictionAir: 0.0005,
    restitution: 0.12,
    slop: 0.02,
  };
  const ball =
    level.cargo === "box"
      ? Bodies.rectangle(level.spawn.x, level.spawn.y, 30, 30, cargoOptions)
      : Bodies.circle(level.spawn.x, level.spawn.y, 15, cargoOptions);
  const balls = [ball];
  const extraBodies: Matter.Body[] = [];
  if (level.second) {
    const s = level.second;
    balls.push(Bodies.circle(s.spawn.x, s.spawn.y, 15, cargoOptions));
    extraBodies.push(
      Bodies.rectangle(s.goal.x, s.goal.y + 45, s.goal.width, 12, {
        isStatic: true,
        friction: 0.3,
      }),
    );
    for (const side of [-1, 1])
      extraBodies.push(
        Bodies.rectangle(
          s.goal.x + (side * s.goal.width) / 2,
          s.goal.y + 18,
          10,
          60,
          { isStatic: true, restitution: 0.05 },
        ),
      );
  }
  if (level.spawn.vx) Body.setVelocity(ball, { x: level.spawn.vx, y: 0 });
  Composite.add(engine.world, [
    ...fixed,
    goalBase,
    ...goalWalls,
    ...partBodies,
    ...balls,
    ...extraBodies,
    ...hinges,
  ]);
  let ticks = 0,
    settle = 0,
    finished = false,
    won = false;
  let reason: string | undefined;
  const goals = [level.goal, ...(level.second ? [level.second.goal] : [])];
  const springTicks = new Map<string, number>();
  function step() {
    if (finished) return;
    const before = { ...ball.velocity };
    Engine.update(engine, WORLD.dt);
    ticks++;
    for (const moving of balls) {
      const touching = (kind: string) =>
        parts.some(
          (p, i) =>
            p.kind === kind &&
            Query.collides(moving, [partBodies[i]]).length > 0,
        );
      moving.friction = touching("rough")
        ? 0.8
        : touching("smooth")
          ? 0
          : 0.015;
      if (touching("cushion"))
        Body.setVelocity(moving, {
          x: moving.velocity.x * 0.9,
          y: Math.min(0, moving.velocity.y),
        });
    }
    if (level.cargo === "egg") {
      const impacts = Query.collides(ball, [
        ...fixed,
        goalBase,
        ...goalWalls,
        ...partBodies,
      ]);
      const cushioned = impacts.some((c) =>
        parts.some(
          (p, i) =>
            p.kind === "cushion" &&
            (c.bodyA === partBodies[i] || c.bodyB === partBodies[i]),
        ),
      );
      if (
        impacts.length &&
        Math.hypot(before.x - ball.velocity.x, before.y - ball.velocity.y) >
          7 &&
        !cushioned
      ) {
        finished = true;
        reason = "A hard landing! Try a cushion or a gentler slope.";
      }
    }
    parts.forEach((p, i) => {
      if (p.kind !== "spring" || ticks - (springTicks.get(p.id) ?? -100) < 30)
        return;
      for (const moving of balls)
        if (Query.collides(moving, [partBodies[i]]).length) {
          const a = radians(p.angle);
          Body.setVelocity(moving, {
            x: Math.sin(a) * 15,
            y: -Math.cos(a) * 15,
          });
          springTicks.set(p.id, ticks);
        }
    });
    const inGoal =
      (level.id !== 7 ||
        (Math.abs(goalBase.angle) < 0.12 && goalBase.angularSpeed < 0.02)) &&
      balls.every(
        (b, i) =>
          Math.abs(b.position.x - goals[i].x) < goals[i].width / 2 - 17 &&
          b.position.y > goals[i].y - 22 &&
          b.position.y < goals[i].y + 32 &&
          (!level.settleTicks || b.speed < 0.5),
      );
    settle = inGoal ? settle + 1 : 0;
    if (!finished && settle >= (level.settleTicks || 12)) {
      won = true;
      finished = true;
    }
    if (
      ticks >= WORLD.maxTicks ||
      balls.some(
        (b) => b.position.y > 610 || b.position.x < -80 || b.position.x > 1040,
      )
    ) {
      finished = true;
      reason ??=
        ticks >= WORLD.maxTicks
          ? "Not there yet. Try a steeper slope or a shorter route."
          : "Missed the goal. Move a part and try again!";
    }
  }
  function result(): RunResult {
    const cost = costOf(parts),
      time = Math.round(ticks * WORLD.dt) / 1000;
    // Keep original levels' score scale comparable with saved v0.1 personal bests.
    const scoringCost =
      level.id <= 3
        ? parts.reduce(
            (sum, p) =>
              sum +
              (p.kind === "beam"
                ? 15
                : p.kind === "spring"
                  ? 40
                  : PARTS[p.kind].cost),
            0,
          )
        : cost;
    const score = won
      ? Math.max(
          100,
          Math.round(
            10000 -
              scoringCost * (level.id <= 3 ? 60 : 25) -
              parts.length * 100 -
              time * 30,
          ),
        )
      : 0;
    const stars = won
      ? cost <= level.parCost &&
        time <= level.parTime &&
        parts.length <= (level.parParts ?? 8) &&
        (level.id !== 8 || parts.filter((p) => p.kind === "spring").length <= 1)
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
      ...(reason ? { reason } : {}),
    };
  }
  return {
    engine,
    ball,
    balls,
    goalBase,
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
