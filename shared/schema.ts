import { pgTable, text, serial, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

// User model
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  jokerCardUsed: boolean("joker_card_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Session storage table for OIDC auth
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Season model
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

// Race model
export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  name: text("name").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  imageUrl: text("image_url"),
  discipline: text("discipline").notNull().default("DHI"),
  lockAt: timestamp("lock_at").notNull(),
  gameStatus: text("game_status").notNull().default("scheduled"),
  needsResettle: boolean("needs_resettle").notNull().default(false),
});

export type Race = typeof races.$inferSelect & {
  status?: "upcoming" | "next" | "ongoing" | "completed";
};
export type InsertRace = typeof races.$inferInsert;

// Rider model
export const riders = pgTable("riders", {
  id: serial("id").primaryKey(),
  riderId: text("rider_id").notNull().unique(), // Consistent ID across APIs based on name
  uciId: text("uci_id").notNull().unique(), // Canonical rider identity from UCI Dataride
  datarideObjectId: text("dataride_object_id"), // Optional unstable Dataride object identifier
  datarideTeamCode: text("dataride_team_code"),
  name: text("name").notNull(),
  firstName: text("first_name"), // First name
  lastName: text("last_name"), // Last/family name
  gender: text("gender").notNull(), // "male" or "female"
  category: text("category").notNull().default("elite"), // "elite" or "junior"
  team: text("team").notNull(),
  cost: integer("cost").notNull().default(0),
  lastYearStanding: integer("last_year_standing").notNull().default(0),
  image: text("image").notNull().default(""),
  imageSource: text("image_source").notNull().default("placeholder"),
  imageOriginalUrl: text("image_original_url"),
  imageUpdatedAt: timestamp("image_updated_at"),
  imageContentHash: text("image_content_hash"),
  imageMimeType: text("image_mime_type"),
  country: text("country"),
  points: integer("points").notNull().default(0),
  form: text("form").notNull().default("[]"), // JSON array of last 5 results
  injured: boolean("injured").notNull().default(false)
});

export type Rider = typeof riders.$inferSelect;
export type InsertRider = typeof riders.$inferInsert;

// Team model
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  userId: varchar("user_id").notNull().references(() => users.id), // Teams are scoped by (user_id, team_type)
  teamType: text("team_type").notNull().default("elite"), // "elite" or "junior"
  name: text("name").notNull().unique(), // Unique team names
  budgetCap: integer("budget_cap").notNull().default(2000000),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  totalPoints: integer("total_points").default(0),
  swapsUsed: integer("swaps_used").default(0),
  swapsRemaining: integer("swaps_remaining").default(2), // Default 2 swaps per race
  currentRaceId: integer("current_race_id"),
  isLocked: boolean("is_locked").default(false),
  lockedAt: timestamp("locked_at"),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Team member (roster) model
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  uciId: text("uci_id").notNull().references(() => riders.uciId),
  role: text("role").notNull(), // "STARTER" | "BENCH"
  starterIndex: integer("starter_index"),
  gender: text("gender").notNull(), // "male" | "female" snapshot-at-save
  costAtSave: integer("cost_at_save"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// TeamRider junction table
export const teamRiders = pgTable("team_riders", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  riderId: integer("rider_id").notNull().references(() => riders.id),
});

export type TeamRider = typeof teamRiders.$inferSelect;
export type InsertTeamRider = typeof teamRiders.$inferInsert;

// Team snapshot (immutable per race)
export const raceSnapshots = pgTable("race_snapshots", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamType: text("team_type").notNull(), // "ELITE" | "JUNIOR"
  startersJson: jsonb("starters_json").notNull(),
  benchJson: jsonb("bench_json"),
  totalCostAtLock: integer("total_cost_at_lock").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RaceSnapshot = typeof raceSnapshots.$inferSelect;
export type InsertRaceSnapshot = typeof raceSnapshots.$inferInsert;

// Race results (raw)
export const raceResults = pgTable("race_results", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  uciId: text("uci_id").notNull(),
  status: text("status").notNull(), // FIN | DNF | DNS | DSQ
  position: integer("position"),
  qualificationPosition: integer("qualification_position"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RaceResult = typeof raceResults.$inferSelect;
export type InsertRaceResult = typeof raceResults.$inferInsert;

// Race result set hash + metadata
export const raceResultSets = pgTable("race_result_sets", {
  raceId: integer("race_id").primaryKey().references(() => races.id),
  resultsHash: text("results_hash").notNull(),
  source: text("source"),
  isFinal: boolean("is_final").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RaceResultSet = typeof raceResultSets.$inferSelect;
export type InsertRaceResultSet = typeof raceResultSets.$inferInsert;

// Race scores (settlement output)
export const raceScores = pgTable("race_scores", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamType: text("team_type").notNull(), // "ELITE" | "JUNIOR"
  totalPoints: integer("total_points").notNull(),
  breakdownJson: jsonb("breakdown_json").notNull(),
  snapshotHashUsed: text("snapshot_hash_used").notNull(),
  resultsHashUsed: text("results_hash_used").notNull(),
  settledAt: timestamp("settled_at").notNull().defaultNow(),
});

export type RaceScore = typeof raceScores.$inferSelect;
export type InsertRaceScore = typeof raceScores.$inferInsert;

// Team swap history
export const teamSwaps = pgTable("team_swaps", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  raceId: integer("race_id").notNull().references(() => races.id),
  removedRiderId: integer("removed_rider_id").notNull().references(() => riders.id),
  addedRiderId: integer("added_rider_id").notNull().references(() => riders.id),
  swappedAt: timestamp("swapped_at").defaultNow(),
});

export type TeamSwap = typeof teamSwaps.$inferSelect;
export type InsertTeamSwap = typeof teamSwaps.$inferInsert;

// Extended types for related data
export type TeamWithRiders = Team & {
  riders: Rider[];
  totalCost: number;
  benchRider?: Rider | null;
};

export type RaceWithResults = Race & {
  results: (RaceResult & { rider: Rider; points: number })[];
};

export type LeaderboardEntry = {
  rank: number;
  user: User;
  totalPoints: number;
  raceWins: number;
  highestSingleRaceScore: number;
  podiumFinishes: number;
};

export type RiderImageSource =
  | "placeholder"
  | "manual_url"
  | "manual_copied"
  | "scraped"
  | "unknown";
