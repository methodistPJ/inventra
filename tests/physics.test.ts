import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../lib/game/levels";
import { replay, validateBuild } from "../lib/game/physics";
for (const level of LEVELS) {
  test(`level ${level.id} has a reachable goal`, () => {
    const result = replay(level, level.solution);
    console.log(level.name, result);
    assert.equal(result.won, true);
  });
  test(`level ${level.id} is repeatable`, () =>
    assert.deepEqual(
      replay(level, level.solution),
      replay(level, level.solution),
    ));
  test(`level ${level.id} does not complete without building`, () =>
    assert.equal(replay(level, []).won, false));
}
test("tampered and oversized builds are rejected", () => {
  assert.throws(() =>
    validateBuild(LEVELS[0], [
      { id: "x", kind: "spring", x: 400, y: 400, angle: 0 },
    ]),
  );
  assert.throws(() =>
    validateBuild(LEVELS[0], [
      { id: "x", kind: "ramp", x: NaN, y: 400, angle: 0 },
    ]),
  );
  assert.throws(() => validateBuild(LEVELS[0], Array(20).fill({})));
});
