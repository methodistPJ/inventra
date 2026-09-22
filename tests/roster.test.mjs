import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV, validateRoster } from "../scripts/roster.mjs";
const header = ["student_id", "fullname", "year", "class", "active"];
test("quoted names, BOM, Unicode and explicit inactive state survive CSV", () => {
  const plan = validateRoster(
    parseCSV(
      '\uFEFFstudent_id,fullname,year,class,active\r\nDEMO-1,"DOE, ALEX",2,2 DISCOVERY,TRUE\r\nDEMO-2,玛雅,6,6 DISCOVERY,FALSE',
    ),
  );
  assert.equal(plan.rows[0].fullname, "DOE, ALEX");
  assert.equal(plan.rows[1].active, false);
  assert.equal(plan.summary.pupils, 2);
});
test("duplicate IDs and ambiguous flags fail before any writes", () => {
  assert.throws(() =>
    validateRoster([
      header,
      ["X", "Ada", "2", "2 DISCOVERY", "TRUE"],
      ["X", "Ben", "2", "2 DISCOVERY", "TRUE"],
    ]),
  );
  assert.throws(() =>
    validateRoster([header, ["X", "Ada", "2", "2 DISCOVERY", "YES"]]),
  );
  assert.throws(() =>
    validateRoster([header, ["X", "Ada", "2", "4 DISCOVERY", "TRUE"]]),
  );
});
test("reordered rows have the same approval digest; changes do not", () => {
  const a = ["X", "Ada", "2", "2 DISCOVERY", "TRUE"],
    b = ["Y", "Ben", "4", "4 DISCOVERY", "TRUE"];
  assert.equal(
    validateRoster([header, a, b]).hash,
    validateRoster([header, b, a]).hash,
  );
  assert.notEqual(
    validateRoster([header, a]).hash,
    validateRoster([header, b]).hash,
  );
});
