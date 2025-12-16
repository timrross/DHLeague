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
  team: text("team").notNull(),
  cost: integer("cost").notNull().default(0),
  lastYearStanding: integer("last_year_standing").notNull().default(0),
  image: text("image").notNull().default(""),
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
  userId: varchar("user_id").notNull().references(() => users.id).unique(), // One team per user
  name: text("name").notNull().unique(), // Unique team names
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

// TeamRider junction table
export const teamRiders = pgTable("team_riders", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  riderId: integer("rider_id").notNull().references(() => riders.id),
});

export type TeamRider = typeof teamRiders.$inferSelect;
export type InsertTeamRider = typeof teamRiders.$inferInsert;

// Race model
export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  imageUrl: text("image_url"),
});

export type Race = typeof races.$inferSelect & {
  status?: "upcoming" | "next" | "ongoing" | "completed";
};
export type InsertRace = typeof races.$inferInsert;

// Results model
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  riderId: integer("rider_id").notNull().references(() => riders.id),
  position: integer("position").notNull(),
  points: integer("points").notNull(),
});

export type Result = typeof results.$inferSelect;
export type InsertResult = typeof results.$inferInsert;

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
};

export type RaceWithResults = Race & {
  results: (Result & { rider: Rider })[];
};

export type LeaderboardEntry = {
  rank: number;
  team: Team;
  user: User;
  lastRoundPoints: number;
  totalPoints: number;
};
