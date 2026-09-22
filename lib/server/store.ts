import "server-only";
import { createClient } from "@supabase/supabase-js";
import { LEVELS, WORLD, type Placement } from "@/lib/game/levels";
import type { RunResult } from "@/lib/game/physics";
export type Student = {
  student_id: string;
  fullname: string;
  class_name: string;
};
export type Progress = {
  level_id: number;
  best_score: number;
  stars: number;
  cost: number;
  time: number;
  parts: number;
  best_build: Placement[];
};
export type Ranking = {
  fullname: string;
  class_name: string;
  score: number;
  cost: number;
  time: number;
  parts: number;
  is_you: boolean;
};
export const isDemo = () => process.env.INVENTRA_MODE !== "supabase";
function supabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("School database is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function checked<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw new Error("School database unavailable");
  return r.data;
}
async function demoDB() {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as { DB: D1Database }).DB;
  if (!db) throw new Error("Preview database unavailable");
  return db;
}
const DEMO_STUDENTS = [
  {
    student_id: "DEMO-ADA",
    fullname: "ADA INVENTOR",
    class_name: "2 DISCOVERY",
  },
  {
    student_id: "DEMO-BEN",
    fullname: "BEN BUILDER",
    class_name: "4 DISCOVERY",
  },
  {
    student_id: "DEMO-MAYA",
    fullname: "MAYA MAKER",
    class_name: "6 DISCOVERY",
  },
];
export async function seedDemo() {
  if (!isDemo()) return;
  const db = await demoDB();
  const now = new Date().toISOString();
  await db.batch([
    ...DEMO_STUDENTS.map((s) =>
      db
        .prepare("INSERT OR IGNORE INTO classes (id,name,year) VALUES (?,?,?)")
        .bind(s.class_name, s.class_name, Number(s.class_name[0])),
    ),
    ...DEMO_STUDENTS.map((s) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO students (student_id,fullname,class_id,active) VALUES (?,?,?,1)",
        )
        .bind(s.student_id, s.fullname, s.class_name),
    ),
    ...DEMO_STUDENTS.map((s) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO player_profiles (student_id,created_at) VALUES (?,?)",
        )
        .bind(s.student_id, now),
    ),
    ...LEVELS.map((l) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO levels (id,name,season,physics_version) VALUES (?,?,1,?)",
        )
        .bind(l.id, l.name, WORLD.version),
    ),
  ]);
}
export async function searchStudents(query: string): Promise<Student[]> {
  if (isDemo()) {
    await seedDemo();
    return DEMO_STUDENTS.filter((s) =>
      s.fullname.toLowerCase().includes(query.toLowerCase()),
    );
  }
  const rows = checked(
    await supabase()
      .from("students")
      .select("student_id,fullname,classes(name)")
      .eq("active", true)
      .ilike("fullname", `%${query}%`)
      .order("fullname")
      .limit(8),
  );
  return (rows || []).map((r) => ({
    student_id: r.student_id,
    fullname: r.fullname,
    class_name: (r.classes as unknown as { name: string })?.name || "",
  }));
}
export async function student(id: string): Promise<Student | null> {
  if (isDemo()) return DEMO_STUDENTS.find((s) => s.student_id === id) || null;
  const row = checked(
    await supabase()
      .from("students")
      .select("student_id,fullname,classes(name)")
      .eq("student_id", id)
      .eq("active", true)
      .maybeSingle(),
  );
  return row
    ? {
        student_id: row.student_id,
        fullname: row.fullname,
        class_name: (row.classes as unknown as { name: string })?.name || "",
      }
    : null;
}
export async function putSession(hash: string, id: string, expires: number) {
  if (isDemo()) {
    const db = await demoDB();
    await db.batch([
      db
        .prepare("DELETE FROM player_sessions WHERE expires_at < ?")
        .bind(Date.now()),
      db
        .prepare(
          "INSERT INTO player_sessions (token_hash,student_id,expires_at) VALUES (?,?,?)",
        )
        .bind(hash, id, expires),
    ]);
    return;
  }
  checked(
    await supabase()
      .from("player_sessions")
      .insert({ token_hash: hash, student_id: id, expires_at: expires }),
  );
}
export async function getSession(hash: string): Promise<string | null> {
  if (isDemo()) {
    const r = await (
      await demoDB()
    )
      .prepare(
        "SELECT student_id FROM player_sessions WHERE token_hash=? AND expires_at>?",
      )
      .bind(hash, Date.now())
      .first<{ student_id: string }>();
    return r?.student_id || null;
  }
  const r = checked(
    await supabase()
      .from("player_sessions")
      .select("student_id")
      .eq("token_hash", hash)
      .gt("expires_at", Date.now())
      .maybeSingle(),
  );
  return r?.student_id || null;
}
export async function deleteSession(hash: string) {
  if (isDemo()) {
    await (
      await demoDB()
    )
      .prepare("DELETE FROM player_sessions WHERE token_hash=?")
      .bind(hash)
      .run();
    return;
  }
  checked(
    await supabase().from("player_sessions").delete().eq("token_hash", hash),
  );
}
export async function rateLimit(key: string, max: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const bucketKey = `${key}:${bucket}`;
  if (isDemo()) {
    const db = await demoDB();
    const r = await db
      .prepare(
        "INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
      )
      .bind(bucketKey, Date.now() + seconds * 2000)
      .first<{ count: number }>();
    await db
      .prepare("DELETE FROM request_limits WHERE expires_at < ?")
      .bind(Date.now())
      .run();
    return (r?.count || 0) <= max;
  }
  return checked(
    await supabase().rpc("inventra_rate_limit", {
      p_key: bucketKey,
      p_max: max,
      p_expires: Date.now() + seconds * 2000,
    }),
  );
}
export async function getProgress(id: string): Promise<Progress[]> {
  if (isDemo()) {
    const rows = await (
      await demoDB()
    )
      .prepare(
        "SELECT level_id,best_score,stars,cost,time,parts,best_build FROM player_progress WHERE student_id=? ORDER BY level_id",
      )
      .bind(id)
      .all<Progress & { best_build: string }>();
    return rows.results.map((r) => ({
      ...r,
      best_build: JSON.parse(r.best_build),
    }));
  }
  return (
    checked(
      await supabase()
        .from("player_progress")
        .select("level_id,best_score,stars,cost,time,parts,best_build")
        .eq("student_id", id)
        .order("level_id"),
    ) || []
  );
}
export async function saveAttempt(
  id: string,
  attemptId: string,
  level: number,
  build: Placement[],
  r: RunResult,
) {
  const now = new Date().toISOString();
  if (!isDemo()) {
    checked(
      await supabase().rpc("inventra_save_attempt", {
        p_student: id,
        p_attempt: attemptId,
        p_level: level,
        p_build: build,
        p_won: r.won,
        p_score: r.score,
        p_stars: r.stars,
        p_cost: r.cost,
        p_ticks: r.ticks,
        p_time: r.time,
        p_parts: r.parts,
        p_version: r.version,
      }),
    );
    return;
  }
  const db = await demoDB();
  const queries = [
    db
      .prepare(
        "INSERT OR IGNORE INTO level_attempts (id,student_id,level_id,won,score,stars,cost,ticks,build,physics_version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        attemptId,
        id,
        level,
        r.won ? 1 : 0,
        r.score,
        r.stars,
        r.cost,
        r.ticks,
        JSON.stringify(build),
        r.version,
        now,
      ),
  ];
  if (r.won) {
    queries.push(
      db
        .prepare(
          "INSERT INTO player_progress (student_id,level_id,best_score,stars,cost,time,parts,best_build,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(student_id,level_id) DO UPDATE SET best_score=excluded.best_score,stars=MAX(player_progress.stars,excluded.stars),cost=excluded.cost,time=excluded.time,parts=excluded.parts,best_build=excluded.best_build,updated_at=excluded.updated_at WHERE excluded.best_score>player_progress.best_score",
        )
        .bind(
          id,
          level,
          r.score,
          r.stars,
          r.cost,
          r.time,
          r.parts,
          JSON.stringify(build),
          now,
        ),
    );
    queries.push(
      db
        .prepare(
          "UPDATE player_progress SET stars=MAX(stars,?) WHERE student_id=? AND level_id=?",
        )
        .bind(r.stars, id, level),
    );
    queries.push(
      db
        .prepare(
          "INSERT INTO leaderboard_records (student_id,level_id,score,cost,time,parts,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(student_id,level_id) DO UPDATE SET score=excluded.score,cost=excluded.cost,time=excluded.time,parts=excluded.parts,updated_at=excluded.updated_at WHERE excluded.score>leaderboard_records.score",
        )
        .bind(id, level, r.score, r.cost, r.time, r.parts, now),
    );
  }
  await db.batch(queries);
}
export async function getLeaderboard(
  id: string,
  level: number,
): Promise<Ranking[]> {
  if (isDemo()) {
    const r = await (
      await demoDB()
    )
      .prepare(
        "SELECT s.fullname,c.name AS class_name,l.score,l.cost,l.time,l.parts,(l.student_id=?) AS is_you FROM leaderboard_records l JOIN students s ON s.student_id=l.student_id JOIN classes c ON c.id=s.class_id WHERE l.level_id=? AND s.active=1 ORDER BY l.score DESC,l.updated_at,l.student_id LIMIT 20",
      )
      .bind(id, level)
      .all<Ranking>();
    return r.results.map((row) => ({ ...row, is_you: !!row.is_you }));
  }
  const rows = checked(
    await supabase()
      .from("leaderboard_records")
      .select(
        "student_id,score,cost,time,parts,students!inner(fullname,active,classes(name))",
      )
      .eq("level_id", level)
      .eq("students.active", true)
      .order("score", { ascending: false })
      .order("updated_at")
      .order("student_id")
      .limit(20),
  );
  return (rows || []).map((r) => {
    const s = r.students as unknown as {
      fullname: string;
      classes: { name: string };
    };
    return {
      fullname: s.fullname,
      class_name: s.classes.name,
      score: r.score,
      cost: r.cost,
      time: r.time,
      parts: r.parts,
      is_you: r.student_id === id,
    };
  });
}
