import { pgTable, text, serial, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";
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

export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
  securityRecommendations: many(securityRecommendations),
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
}, (table) => ({
  dateIdx: index("date_idx").on(table.date),
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
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
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true });
export const updateMeetingSchema = createInsertSchema(meetings).partial();

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