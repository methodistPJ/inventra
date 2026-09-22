import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
export const classes = sqliteTable("classes", {
  id: text().primaryKey(),
  name: text().notNull(),
  year: integer().notNull(),
});
export const students = sqliteTable("students", {
  student_id: text().primaryKey(),
  fullname: text().notNull(),
  class_id: text()
    .notNull()
    .references(() => classes.id),
  active: integer().notNull().default(1),
});
export const playerProfiles = sqliteTable("player_profiles", {
  student_id: text()
    .primaryKey()
    .references(() => students.student_id),
  created_at: text().notNull(),
});
export const levels = sqliteTable("levels", {
  id: integer().primaryKey(),
  name: text().notNull(),
  season: integer().notNull().default(1),
  physics_version: text().notNull(),
});
export const attempts = sqliteTable("level_attempts", {
  id: text().primaryKey(),
  student_id: text()
    .notNull()
    .references(() => students.student_id),
  level_id: integer()
    .notNull()
    .references(() => levels.id),
  won: integer().notNull(),
  score: integer().notNull(),
  stars: integer().notNull(),
  cost: integer().notNull(),
  ticks: integer().notNull(),
  build: text().notNull(),
  physics_version: text().notNull(),
  created_at: text().notNull(),
});
export const progress = sqliteTable(
  "player_progress",
  {
    student_id: text()
      .notNull()
      .references(() => students.student_id),
    level_id: integer()
      .notNull()
      .references(() => levels.id),
    best_score: integer().notNull(),
    stars: integer().notNull(),
    cost: integer().notNull(),
    time: real().notNull(),
    parts: integer().notNull(),
    best_build: text().notNull(),
    updated_at: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.student_id, t.level_id] })],
);
export const leaderboard = sqliteTable(
  "leaderboard_records",
  {
    student_id: text()
      .notNull()
      .references(() => students.student_id),
    level_id: integer()
      .notNull()
      .references(() => levels.id),
    score: integer().notNull(),
    cost: integer().notNull(),
    time: real().notNull(),
    parts: integer().notNull(),
    updated_at: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.student_id, t.level_id] }),
    index("leaderboard_rank").on(t.level_id, t.score),
  ],
);
export const sessions = sqliteTable("player_sessions", {
  token_hash: text().primaryKey(),
  student_id: text()
    .notNull()
    .references(() => students.student_id),
  expires_at: integer().notNull(),
});
export const limits = sqliteTable("request_limits", {
  key: text().primaryKey(),
  count: integer().notNull(),
  expires_at: integer().notNull(),
});
