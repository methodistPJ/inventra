import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, PARTS } from "../lib/game/levels";
import { replay, createSimulation } from "../lib/game/physics";
import { makerProfile, weeklyChallenge } from "../lib/game/progression";
for (const level of LEVELS.slice(3))
  test(`${level.name} accepts at least three distinct successful builds`, () => {
    let wins = 0;
    if (level.alternatives) {
      for (const build of [level.solution, ...level.alternatives])
        assert.equal(replay(level, build).won, true);
      return;
    }
    for (const dx of [-30, -20, -10, 0, 10, 20, 30]) {
      const build = level.solution.map((p, i) =>
        i === 0 ? { ...p, x: p.x + dx } : p,
      );
      if (replay(level, build).won) wins++;
    }
    assert.ok(wins >= 3, `${wins} valid alternatives`);
  });
test("component prices match v0.2", () =>
  assert.deepEqual(
    Object.fromEntries(Object.entries(PARTS).map(([k, v]) => [k, v.cost])),
    {
      ramp: 25,
      beam: 20,
      wheel: 15,
      pivot: 30,
      rough: 10,
      smooth: 10,
      cushion: 20,
      platform: 25,
      spring: 35,
    },
  ));
test("original physics and scoring remains comparable with saved personal bests", () =>
  assert.deepEqual(
    LEVELS.slice(0, 3).map((l) => {
      const r = replay(l, l.solution);
      return [r.ticks, r.score];
    }),
    [
      [223, 6688],
      [368, 6816],
      [222, 5789],
    ],
  ));
test("egg needs a safe landing", () => {
  assert.equal(
    replay(
      LEVELS[8],
      LEVELS[8].solution.filter((p) => p.kind !== "cushion"),
    ).won,
    false,
  );
  assert.equal(replay(LEVELS[8], LEVELS[8].solution).won, true);
});
test("Faster Route three-star target is attainable", () =>
  assert.equal(replay(LEVELS[3], LEVELS[3].alternatives![0]).stars, 3));
test("finale requires both targets", () =>
  assert.equal(replay(LEVELS[9], LEVELS[9].solution.slice(0, 1)).won, false));
test("balancing goal has a moving hinge and requires three steady seconds", () => {
  const sim = createSimulation(LEVELS[6], LEVELS[6].solution);
  assert.equal(sim.goalBase.isStatic, false);
  while (!sim.finished) sim.step();
  assert.equal(sim.won, true);
  assert.ok(sim.ticks > 180);
  sim.dispose();
});
test("replays cannot farm XP, coins or badges", () => {
  const p = LEVELS.map((l) => ({ level_id: l.id, stars: 3 }));
  assert.deepEqual(makerProfile(p), makerProfile([...p, ...p]));
  assert.equal(makerProfile(p).xp, 1750);
  assert.equal(makerProfile(p).coins, 350);
  assert.ok(makerProfile(p).badges.includes("Motion Master"));
});
test("weekly challenge resets at Monday midnight in Malaysia", () => {
  assert.equal(weeklyChallenge(new Date("2026-09-20T15:59:59Z")).level, 3);
  assert.equal(weeklyChallenge(new Date("2026-09-20T16:00:00Z")).level, 1);
  assert.equal(weeklyChallenge(new Date("2026-09-27T16:00:00Z")).level, 2);
});
