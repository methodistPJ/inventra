import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("Supabase migration, roster transaction, RLS, progression and personal bests", async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202609210001_motion_lab.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const roster = [
    {
      student_id: "TEST-1",
      fullname: "TEST INVENTOR",
      year: 2,
      class: "2 TEST",
      active: true,
    },
    {
      student_id: "TEST-2",
      fullname: "SECOND INVENTOR",
      year: 4,
      class: "4 TEST",
      active: true,
    },
  ];
  await db.query("select inventra_import_roster($1::jsonb)", [
    JSON.stringify(roster),
  ]);
  await db.query("select inventra_import_roster($1::jsonb)", [
    JSON.stringify(roster.slice(0, 1)),
  ]);
  assert.equal((await db.query("select * from students")).rows.length, 2);
  await assert.rejects(() =>
    db.query("select inventra_import_roster($1::jsonb)", [
      JSON.stringify([
        { ...roster[0], student_id: "NEW-1" },
        { ...roster[0], student_id: "BAD ID" },
      ]),
    ]),
  );
  assert.equal(
    (await db.query("select * from students where student_id='NEW-1'")).rows
      .length,
    0,
  );
  const save = (uuid, level, score, stars = 3) =>
    db.query(
      "select inventra_save_attempt($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        "TEST-1",
        uuid,
        level,
        "[]",
        true,
        score,
        stars,
        50,
        223,
        3.717,
        2,
        "motion-1.0.0",
      ],
    );
  await assert.rejects(() =>
    save("00000000-0000-4000-8000-000000000003", 3, 5000),
  );
  await save("00000000-0000-4000-8000-000000000001", 1, 6688);
  await save("00000000-0000-4000-8000-000000000001", 1, 6688);
  await save("00000000-0000-4000-8000-000000000002", 1, 4000, 1);
  assert.equal((await db.query("select * from level_attempts")).rows.length, 2);
  assert.equal(
    (await db.query("select best_score from player_progress")).rows[0]
      .best_score,
    6688,
  );
  assert.equal(
    (await db.query("select score from leaderboard_records")).rows[0].score,
    6688,
  );
  await save("00000000-0000-4000-8000-000000000004", 2, 6000);
  const rates = await Promise.all(
    [1, 2, 3].map(() =>
      db.query("select inventra_rate_limit('test',2,9999999999999) as allowed"),
    ),
  );
  assert.deepEqual(
    rates.map((r) => r.rows[0].allowed),
    [true, true, false],
  );
  await db.exec("set role anon");
  await assert.rejects(() => db.query("select * from students"));
  await assert.rejects(() =>
    db.query("select inventra_import_roster('[]'::jsonb)"),
  );
  await assert.rejects(() =>
    db.query("select inventra_rate_limit('evil',99,9999999999999)"),
  );
  await db.exec("reset role");
  await db.close();
});
