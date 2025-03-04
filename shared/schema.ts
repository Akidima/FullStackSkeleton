import { pgTable, text, serial, timestamp, boolean, index, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with improved indexing and verification fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for Google OAuth users
  displayName: text("display_name").notNull(),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  googleId: text("google_id"), // Make it nullable for email/password users
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  isAdmin: boolean("is_admin").notNull().default(false),
  accessToken: text("access_token"),  // Added for Google OAuth
  refreshToken: text("refresh_token"), // Added for Google OAuth
  // New fields for user preferences
  dashboardLayout: text("dashboard_layout").array(), // Store widget positions and sizes
  notificationSettings: text("notification_settings"), // JSON string of notification preferences
  theme: text("theme").default("system"), // light, dark, or system
  timeZone: text("time_zone"),
  language: text("language").default("en"),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  googleIdIdx: index("google_id_idx").on(table.googleId),
  verificationTokenIdx: index("verification_token_idx").on(table.verificationToken),
  passwordResetTokenIdx: index("password_reset_token_idx").on(table.passwordResetToken),
}));

// Registration attempts tracking
export const registrationAttempts = pgTable("registration_attempts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  status: text("status").notNull(), // 'success', 'failed', 'blocked'
  reason: text("reason"), // Reason for failure/blocking if applicable
  attemptTime: timestamp("attempt_time").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("reg_attempts_email_idx").on(table.email),
  ipAddressIdx: index("reg_attempts_ip_idx").on(table.ipAddress),
  attemptTimeIdx: index("reg_attempts_time_idx").on(table.attemptTime),
}));

// Add after the registrationAttempts table
export const securityRecommendations = pgTable("security_recommendations", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(), // 'high', 'medium', 'low'
  category: text("category").notNull(), // 'password', 'account', 'access', etc.
  status: text("status").notNull().default('pending'), // 'pending', 'implemented', 'dismissed'
  implementedAt: timestamp("implemented_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("sec_rec_user_id_idx").on(table.userId),
  statusIdx: index("sec_rec_status_idx").on(table.status),
  priorityIdx: index("sec_rec_priority_idx").on(table.priority),
}));

// Add after user schema
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_prefs_user_id_idx").on(table.userId),
  keyIdx: index("user_prefs_key_idx").on(table.key),
}));

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  location: text("location"),
  amenities: text("amenities").array(),
  isAvailable: boolean("is_available").notNull().default(true),
}, (table) => ({
  nameIdx: index("room_name_idx").on(table.name),
}));

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  recurrence: text("recurrence"), // JSON string for recurrence rules
  meetingId: serial("meeting_id").references(() => meetings.id, { onDelete: 'set null' }),
  roomId: serial("room_id").references(() => rooms.id, { onDelete: 'set null' }),
}, (table) => ({
  userIdIdx: index("calendar_events_user_id_idx").on(table.userId),
  timeRangeIdx: index("calendar_events_time_range_idx").on(table.startTime, table.endTime),
}));

export const userAvailability = pgTable("user_availability", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  startTime: text("start_time").notNull(), // HH:mm format
  endTime: text("end_time").notNull(), // HH:mm format
  timezone: text("timezone").notNull(),
}, (table) => ({
  userDayIdx: index("user_availability_user_day_idx").on(table.userId, table.dayOfWeek),
}));

export const meetingPreferences = pgTable("meeting_preferences", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
  preferredDuration: integer("preferred_duration"), // in minutes
  preferredRoomCapacity: integer("preferred_room_capacity"),
  requiredAmenities: text("required_amenities").array(),
  reminderTime: integer("reminder_time"), // minutes before meeting
  bufferTime: integer("buffer_time"), // minutes between meetings
}, (table) => ({
  userIdIdx: index("meeting_preferences_user_id_idx").on(table.userId),
}));

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  participants: text("participants").array(),
  agenda: text("agenda"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  summary: text("summary"),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
  roomId: serial("room_id").references(() => rooms.id, { onDelete: 'set null' }),
}, (table) => ({
  dateIdx: index("date_idx").on(table.date),
  userIdIdx: index("user_id_idx").on(table.userId),
  roomIdIdx: index("room_id_idx").on(table.roomId),
}));

// Add after the meetings table definition
export const meetingInsights = pgTable("meeting_insights", {
  id: serial("id").primaryKey(),
  meetingId: serial("meeting_id").references(() => meetings.id, { onDelete: 'cascade' }),
  insight: text("insight").notNull(),
  category: text("category").notNull(), // 'policy', 'historical', 'best_practice'
  relevanceScore: integer("relevance_score").notNull(),
  source: text("source"), // Where this insight came from
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  meetingIdIdx: index("meeting_insights_meeting_id_idx").on(table.meetingId),
  categoryIdx: index("meeting_insights_category_idx").on(table.category),
}));

export const meetingOutcomes = pgTable("meeting_outcomes", {
  id: serial("id").primaryKey(),
  meetingId: serial("meeting_id").references(() => meetings.id, { onDelete: 'cascade' }),
  outcome: text("outcome").notNull(),
  effectiveness: integer("effectiveness").notNull(), // 1-10 rating
  participantFeedback: text("participant_feedback").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  meetingIdIdx: index("meeting_outcomes_meeting_id_idx").on(table.meetingId),
}));


export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
  securityRecommendations: many(securityRecommendations),
  preferences: many(userPreferences),
  calendarEvents: many(calendarEvents),
  userAvailability: many(userAvailability),
  meetingPreferences: many(meetingPreferences),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [meetings.roomId],
    references: [rooms.id],
  }),
}));

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  completed: boolean("completed").notNull().default(false),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  userIdIdx: index("tasks_user_id_idx").on(table.userId),
  completedIdx: index("completed_idx").on(table.completed),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const securityRecommendationsRelations = relations(securityRecommendations, ({ one }) => ({
  user: one(users, {
    fields: [securityRecommendations.userId],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  calendarEvents: many(calendarEvents),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  meeting: one(meetings, {
    fields: [calendarEvents.meetingId],
    references: [meetings.id],
  }),
  room: one(rooms, {
    fields: [calendarEvents.roomId],
    references: [rooms.id],
  }),
}));

// Add to existing relations
export const meetingInsightsRelations = relations(meetingInsights, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingInsights.meetingId],
    references: [meetings.id],
  }),
}));

export const meetingOutcomesRelations = relations(meetingOutcomes, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingOutcomes.meetingId],
    references: [meetings.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users)
  .extend({
    email: z.string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")
      .refine((password) => {
        // Check for common patterns
        const commonPatterns = [
          /^password/i,
          /^12345/,
          /^qwerty/i,
          /^admin/i,
          /(.)\1{2,}/ // Check for 3 or more repeated characters
        ];
        return !commonPatterns.some(pattern => pattern.test(password));
      }, "Password cannot contain common patterns or repeated characters")
      .optional(),
    displayName: z.string()
      .min(2, "Display name must be at least 2 characters long")
      .max(50, "Display name cannot exceed 50 characters"),
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    profilePicture: z.string().url("Profile picture must be a valid URL").optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    timeZone: z.string().optional(),
    language: z.string().optional(),
    dashboardLayout: z.array(z.string()).optional(),
    notificationSettings: z.string().optional(),
    isVerified: z.boolean().optional(),
    verificationToken: z.string().nullable().optional(),
    verificationExpires: z.date().nullable().optional(),
    isAdmin: z.boolean().optional(),
  })
  .omit({ id: true, createdAt: true });

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateUserSchema = createInsertSchema(users).partial();

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const updateTaskSchema = createInsertSchema(tasks).partial();
export const insertMeetingSchema = createInsertSchema(meetings)
  .extend({
    date: z.string()
      .transform((str) => new Date(str)),
    participants: z.array(z.string()).optional(),
    roomId: z.number().optional(),
  })
  .omit({ id: true });
export const updateMeetingSchema = createInsertSchema(meetings)
  .partial()
  .extend({
    date: z.string()
      .transform((str) => new Date(str))
      .optional(),
    participants: z.array(z.string()).optional(),
  });

// Add new schema for registration attempts
export const insertRegistrationAttemptSchema = createInsertSchema(registrationAttempts).omit({
  id: true,
  attemptTime: true,
});

// Add after other insert schemas
export const insertSecurityRecommendationSchema = createInsertSchema(securityRecommendations)
  .omit({
    id: true,
    implementedAt: true,
    createdAt: true,
  })
  .extend({
    priority: z.enum(['high', 'medium', 'low']),
    status: z.enum(['pending', 'implemented', 'dismissed']),
    category: z.enum(['password', 'account', 'access', 'device', 'general']),
  });

export const updateSecurityRecommendationSchema = createInsertSchema(securityRecommendations)
  .partial()
  .extend({
    priority: z.enum(['high', 'medium', 'low']).optional(),
    status: z.enum(['pending', 'implemented', 'dismissed']).optional(),
    category: z.enum(['password', 'account', 'access', 'device', 'general']).optional(),
  });

// Add new schema for user preferences
export const insertUserPreferenceSchema = createInsertSchema(userPreferences)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export const insertCalendarEventSchema = createInsertSchema(calendarEvents)
  .extend({
    startTime: z.string().transform((str) => new Date(str)),
    endTime: z.string().transform((str) => new Date(str)),
  })
  .omit({ id: true });
export const insertUserAvailabilitySchema = createInsertSchema(userAvailability).omit({ id: true });
export const insertMeetingPreferenceSchema = createInsertSchema(meetingPreferences).omit({ id: true });

// Add after existing schemas
export const insertMeetingInsightSchema = createInsertSchema(meetingInsights)
  .omit({ id: true, createdAt: true, appliedAt: true });

export const insertMeetingOutcomeSchema = createInsertSchema(meetingOutcomes)
  .omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertRegistrationAttempt = z.infer<typeof insertRegistrationAttemptSchema>;
export type RegistrationAttempt = typeof registrationAttempts.$inferSelect;

// Add to existing type exports
export type InsertSecurityRecommendation = z.infer<typeof insertSecurityRecommendationSchema>;
export type SecurityRecommendation = typeof securityRecommendations.$inferSelect;
export type UpdateSecurityRecommendation = z.infer<typeof updateSecurityRecommendationSchema>;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type UserAvailability = typeof userAvailability.$inferSelect;
export type InsertUserAvailability = z.infer<typeof insertUserAvailabilitySchema>;
export type MeetingPreference = typeof meetingPreferences.$inferSelect;
export type InsertMeetingPreference = z.infer<typeof insertMeetingPreferenceSchema>;
export type MeetingInsight = typeof meetingInsights.$inferSelect;
export type InsertMeetingInsight = z.infer<typeof insertMeetingInsightSchema>;
export type MeetingOutcome = typeof meetingOutcomes.$inferSelect;
export type InsertMeetingOutcome = z.infer<typeof insertMeetingOutcomeSchema>;