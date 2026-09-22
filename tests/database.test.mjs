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
  // Upgrade a populated v0.1 database, not just a fresh empty installation.
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202609220002_motion_expansion.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    (await db.query("select count(*)::int n from levels")).rows[0].n,
    10,
  );
  assert.equal(
    (await db.query("select best_score from player_progress where level_id=1"))
      .rows[0].best_score,
    6688,
  );
  await save("00000000-0000-4000-8000-000000000005", 1, 4000); // Old server can still save during rollout.
  for (let level = 3; level <= 10; level++)
    await db.query(
      "select inventra_save_attempt($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        "TEST-1",
        `00000000-0000-4000-8000-${String(level + 10).padStart(12, "0")}`,
        level,
        "[]",
        true,
        7000,
        3,
        50,
        223,
        3.717,
        2,
        "motion-2.0.0",
      ],
    );
  const weeklyLevel = (
    await db.query(
      "select 1+((floor(extract(epoch from (now()-timestamptz '2026-09-20 16:00:00+00'))/604800)::int%3+3)%3) n",
    )
  ).rows[0].n;
  const weeklySave = (uuid, cost, time) =>
    db.query(
      "select inventra_save_attempt($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        "TEST-1",
        uuid,
        weeklyLevel,
        "[]",
        true,
        7000,
        3,
        cost,
        223,
        time,
        2,
        "motion-2.0.0",
      ],
    );
  await weeklySave("00000000-0000-4000-8000-000000000030", 70, 3.5);
  await weeklySave("00000000-0000-4000-8000-000000000031", 50, 4);
  await weeklySave("00000000-0000-4000-8000-000000000031", 1, 1); // Retry must not rewrite metrics.
  const weekly = (await db.query("select cost,time from weekly_records")).rows;
  assert.deepEqual(weekly, [{ cost: 50, time: 3.5 }]);
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
  await assert.rejects(() => db.query("select * from weekly_records"));
  await assert.rejects(() =>
    db.query("select inventra_import_roster('[]'::jsonb)"),
  );
  await assert.rejects(() =>
    db.query("select inventra_rate_limit('evil',99,9999999999999)"),
  );
  await db.exec("reset role");
  await db.close();
});
