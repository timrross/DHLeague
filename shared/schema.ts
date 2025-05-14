import { pgTable, text, serial, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// Rider model
export const riders = pgTable("riders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  gender: text("gender").notNull(), // "male" or "female"
  team: text("team").notNull(),
  cost: integer("cost").notNull(),
  lastYearStanding: integer("last_year_standing"),
  image: text("image"),
  country: text("country"),
  points: integer("points").default(0),
  form: text("form").default("[]"), // JSON array of last 5 results
});

export const insertRiderSchema = createInsertSchema(riders).omit({
  id: true,
});

export type Rider = typeof riders.$inferSelect;
export type InsertRider = z.infer<typeof insertRiderSchema>;

// Team model
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  totalPoints: integer("total_points").default(0),
  swapsUsed: integer("swaps_used").default(0),
  currentRaceId: integer("current_race_id"),
  isLocked: boolean("is_locked").default(false),
  lockedAt: timestamp("locked_at"),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalPoints: true,
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

// TeamRider junction table
export const teamRiders = pgTable("team_riders", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  riderId: integer("rider_id").notNull().references(() => riders.id),
});

export const insertTeamRiderSchema = createInsertSchema(teamRiders).omit({
  id: true,
});

export type TeamRider = typeof teamRiders.$inferSelect;
export type InsertTeamRider = z.infer<typeof insertTeamRiderSchema>;

// Race model
export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull(), // "upcoming", "next", "completed"
  imageUrl: text("image_url"),
});

export const insertRaceSchema = createInsertSchema(races).omit({
  id: true,
});

export type Race = typeof races.$inferSelect;
export type InsertRace = z.infer<typeof insertRaceSchema>;

// Results model
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  raceId: integer("race_id").notNull().references(() => races.id),
  riderId: integer("rider_id").notNull().references(() => riders.id),
  position: integer("position").notNull(),
  points: integer("points").notNull(),
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
});

export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;

// Extended team type with riders
export type TeamWithRiders = Team & {
  riders: Rider[];
  totalCost: number;
};

// Extended race type with results
export type RaceWithResults = Race & {
  results: (Result & { rider: Rider })[];
};

// Leaderboard entry type
// Team swap history
export const teamSwaps = pgTable("team_swaps", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  raceId: integer("race_id").notNull().references(() => races.id),
  removedRiderId: integer("removed_rider_id").notNull().references(() => riders.id),
  addedRiderId: integer("added_rider_id").notNull().references(() => riders.id),
  swappedAt: timestamp("swapped_at").defaultNow(),
});

export const insertTeamSwapSchema = createInsertSchema(teamSwaps).omit({
  id: true,
  swappedAt: true,
});

export type TeamSwap = typeof teamSwaps.$inferSelect;
export type InsertTeamSwap = z.infer<typeof insertTeamSwapSchema>;

export type LeaderboardEntry = {
  rank: number;
  team: Team;
  user: User;
  lastRoundPoints: number;
  totalPoints: number;
};
