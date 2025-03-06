import {
  meetings,
  users,
  tasks,
  rooms,
  meetingInsights,
  meetingMoods,
  meetingOutcomes,
  calendarEvents,
  userIntegrationSettings,
  type Meeting,
  type InsertMeeting,
  type User,
  type InsertUser,
  type Task,
  type InsertTask,
  type Room,
  type InsertRoom,
  type MeetingInsight,
  type InsertMeetingInsight,
  type MeetingMood,
  type InsertMeetingMood,
  type MeetingOutcome,
  type InsertMeetingOutcome,
  type CalendarEvent,
  type InsertCalendarEvent,
  type UserIntegrationSettings,
  type InsertUserIntegrationSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Meeting operations
  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;

  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getUserMeetings(userId: number): Promise<Meeting[]>;

  // Registration attempts operations
  createRegistrationAttempt(attempt: InsertRegistrationAttempt): Promise<RegistrationAttempt>;
  getRegistrationAttempts(limit?: number): Promise<RegistrationAttempt[]>;
  getRegistrationAttemptsByIP(ipAddress: string): Promise<RegistrationAttempt[]>;
  getRegistrationAttemptsByEmail(email: string): Promise<RegistrationAttempt[]>;

  // Security recommendations operations
  createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation>;
  getUserSecurityRecommendations(userId: number): Promise<SecurityRecommendation[]>;
  updateSecurityRecommendation(id: number, update: Partial<InsertSecurityRecommendation>): Promise<SecurityRecommendation>;
  dismissSecurityRecommendation(id: number): Promise<SecurityRecommendation>;
  implementSecurityRecommendation(id: number): Promise<SecurityRecommendation>;

  // Room operations
  getRooms(): Promise<Room[]>;
  getAvailableRooms(startTime: Date, endTime: Date, capacity?: number): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room>;

  // Calendar operations
  getUserCalendarEvents(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<boolean>;

  // Availability operations
  getUserAvailability(userId: number): Promise<UserAvailability[]>;
  setUserAvailability(availability: InsertUserAvailability): Promise<UserAvailability>;

  // Preferences operations
  getMeetingPreferences(userId: number): Promise<MeetingPreference | undefined>;
  setMeetingPreferences(preferences: InsertMeetingPreference): Promise<MeetingPreference>;

  // Meeting insights operations
  getMeetingInsights(meetingId: number): Promise<MeetingInsight[]>;
  createMeetingInsight(insight: InsertMeetingInsight): Promise<MeetingInsight>;
  getRecommendations(): Promise<MeetingInsight[]>;
  getMeetingOutcomes(meetingId: number): Promise<MeetingOutcome[]>;
  createMeetingOutcome(outcome: InsertMeetingOutcome): Promise<MeetingOutcome>;

  // Meeting mood tracking operations
  getMeetingMoods(meetingId: number): Promise<MeetingMood[]>;
  createMeetingMood(mood: InsertMeetingMood): Promise<MeetingMood>;
  getMeetingMoodSummary(meetingId: number): Promise<{
    overallSentiment: string;
    dominantMoods: string[];
    confidenceAvg: number;
  }>;

  // Task operations
  getTasks(filters?: { meetingId?: number; userId?: number }): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<boolean>;

  // Integration settings operations
  getUserIntegrationSettings(userId: number): Promise<UserIntegrationSettings | undefined>;
  updateUserIntegrationSettings(userId: number, settings: Partial<InsertUserIntegrationSettings>): Promise<UserIntegrationSettings>;
}

export class DatabaseStorage implements IStorage {
  async getMeetings(): Promise<Meeting[]> {
    try {
      // First get all meetings
      const allMeetings = await db.select().from(meetings);

      // Then get room info for each meeting
      const meetingsWithRooms = await Promise.all(
        allMeetings.map(async (meeting) => {
          if (meeting.roomId) {
            const [room] = await db
              .select()
              .from(rooms)
              .where(eq(rooms.id, meeting.roomId));
            return {
              ...meeting,
              room: room || null
            };
          }
          return {
            ...meeting,
            room: null
          };
        })
      );

      return meetingsWithRooms;
    } catch (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    try {
      const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
      return meeting;
    } catch (error) {
      console.error(`Error fetching meeting ${id}:`, error);
      throw error;
    }
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    try {
      const [createdMeeting] = await db.insert(meetings).values(meeting).returning();
      return createdMeeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async updateMeeting(id: number, update: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    try {
      const [updatedMeeting] = await db
        .update(meetings)
        .set(update)
        .where(eq(meetings.id, id))
        .returning();
      return updatedMeeting;
    } catch (error) {
      console.error(`Error updating meeting ${id}:`, error);
      throw error;
    }
  }

  async deleteMeeting(id: number): Promise<boolean> {
    try {
      const [deletedMeeting] = await db
        .delete(meetings)
        .where(eq(meetings.id, id))
        .returning();
      return !!deletedMeeting;
    } catch (error) {
      console.error(`Error deleting meeting ${id}:`, error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error fetching user by email ${email}:`, error);
      throw error;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
      return user;
    } catch (error) {
      console.error(`Error fetching user by Google ID ${googleId}:`, error);
      throw error;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
      return user;
    } catch (error) {
      console.error('Error fetching user by verification token:', error);
      throw error;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
      return user;
    } catch (error) {
      console.error('Error fetching user by reset token:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [createdUser] = await db.insert(users).values(user).returning();
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, update: Partial<InsertUser>): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(update)
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        throw new Error('User not found');
      }

      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async getUserMeetings(userId: number): Promise<Meeting[]> {
    try {
      return await db.select().from(meetings).where(eq(meetings.userId, userId));
    } catch (error) {
      console.error(`Error fetching meetings for user ${userId}:`, error);
      throw error;
    }
  }

  async createRegistrationAttempt(attempt: InsertRegistrationAttempt): Promise<RegistrationAttempt> {
    try {
      const [createdAttempt] = await db.insert(registrationAttempts).values(attempt).returning();
      return createdAttempt;
    } catch (error) {
      console.error('Error creating registration attempt:', error);
      throw error;
    }
  }

  async getRegistrationAttempts(limit: number = 100): Promise<RegistrationAttempt[]> {
    try {
      return await db
        .select()
        .from(registrationAttempts)
        .orderBy(desc(registrationAttempts.attemptTime))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching registration attempts:', error);
      throw error;
    }
  }

  async getRegistrationAttemptsByIP(ipAddress: string): Promise<RegistrationAttempt[]> {
    try {
      return await db
        .select()
        .from(registrationAttempts)
        .where(eq(registrationAttempts.ipAddress, ipAddress))
        .orderBy(desc(registrationAttempts.attemptTime));
    } catch (error) {
      console.error(`Error fetching registration attempts for IP ${ipAddress}:`, error);
      throw error;
    }
  }

  async getRegistrationAttemptsByEmail(email: string): Promise<RegistrationAttempt[]> {
    try {
      return await db
        .select()
        .from(registrationAttempts)
        .where(eq(registrationAttempts.email, email))
        .orderBy(desc(registrationAttempts.attemptTime));
    } catch (error) {
      console.error(`Error fetching registration attempts for email ${email}:`, error);
      throw error;
    }
  }

  async createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation> {
    try {
      const [createdRecommendation] = await db
        .insert(securityRecommendations)
        .values(recommendation)
        .returning();
      return createdRecommendation;
    } catch (error) {
      console.error('Error creating security recommendation:', error);
      throw error;
    }
  }

  async getUserSecurityRecommendations(userId: number): Promise<SecurityRecommendation[]> {
    try {
      return await db
        .select()
        .from(securityRecommendations)
        .where(eq(securityRecommendations.userId, userId))
        .orderBy(desc(securityRecommendations.createdAt));
    } catch (error) {
      console.error(`Error fetching security recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  async updateSecurityRecommendation(
    id: number,
    update: Partial<InsertSecurityRecommendation>
  ): Promise<SecurityRecommendation> {
    try {
      const [updatedRecommendation] = await db
        .update(securityRecommendations)
        .set(update)
        .where(eq(securityRecommendations.id, id))
        .returning();

      if (!updatedRecommendation) {
        throw new Error('Security recommendation not found');
      }

      return updatedRecommendation;
    } catch (error) {
      console.error(`Error updating security recommendation ${id}:`, error);
      throw error;
    }
  }

  async dismissSecurityRecommendation(id: number): Promise<SecurityRecommendation> {
    try {
      return await this.updateSecurityRecommendation(id, {
        status: 'dismissed'
      });
    } catch (error) {
      console.error(`Error dismissing security recommendation ${id}:`, error);
      throw error;
    }
  }

  async implementSecurityRecommendation(id: number): Promise<SecurityRecommendation> {
    try {
      const now = new Date();
      return await this.updateSecurityRecommendation(id, {
        status: 'implemented',
        implementedAt: now
      });
    } catch (error) {
      console.error(`Error implementing security recommendation ${id}:`, error);
      throw error;
    }
  }

  async getRooms(): Promise<Room[]> {
    try {
      return await db.select().from(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  async getAvailableRooms(startTime: Date, endTime: Date, capacity?: number): Promise<Room[]> {
    try {
      // Get all rooms that meet capacity requirement
      let availableRooms = await db
        .select()
        .from(rooms)
        .where(
          and(
            eq(rooms.isAvailable, true),
            capacity ? gte(rooms.capacity, capacity) : undefined
          )
        );

      // Filter out rooms with conflicting bookings
      const conflictingEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            lte(calendarEvents.startTime, endTime),
            gte(calendarEvents.endTime, startTime)
          )
        );

      const bookedRoomIds = new Set(
        conflictingEvents
          .filter(event => event.roomId !== null)
          .map(event => event.roomId)
      );

      return availableRooms.filter(room => !bookedRoomIds.has(room.id));
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      throw error;
    }
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    try {
      const [createdRoom] = await db.insert(rooms).values(room).returning();
      return createdRoom;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async updateRoom(id: number, update: Partial<InsertRoom>): Promise<Room> {
    try {
      const [updatedRoom] = await db
        .update(rooms)
        .set(update)
        .where(eq(rooms.id, id))
        .returning();
      return updatedRoom;
    } catch (error) {
      console.error(`Error updating room ${id}:`, error);
      throw error;
    }
  }

  async getUserCalendarEvents(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      return await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            gte(calendarEvents.startTime, startDate),
            lte(calendarEvents.endTime, endDate)
          )
        )
        .orderBy(calendarEvents.startTime);
    } catch (error) {
      console.error('Error fetching user calendar events:', error);
      throw error;
    }
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    try {
      const [createdEvent] = await db.insert(calendarEvents).values(event).returning();
      return createdEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEvent(id: number, update: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    try {
      const [updatedEvent] = await db
        .update(calendarEvents)
        .set(update)
        .where(eq(calendarEvents.id, id))
        .returning();
      return updatedEvent;
    } catch (error) {
      console.error(`Error updating calendar event ${id}:`, error);
      throw error;
    }
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    try {
      const [deletedEvent] = await db
        .delete(calendarEvents)
        .where(eq(calendarEvents.id, id))
        .returning();
      return !!deletedEvent;
    } catch (error) {
      console.error(`Error deleting calendar event ${id}:`, error);
      throw error;
    }
  }

  async getUserAvailability(userId: number): Promise<UserAvailability[]> {
    try {
      return await db
        .select()
        .from(userAvailability)
        .where(eq(userAvailability.userId, userId))
        .orderBy(userAvailability.dayOfWeek);
    } catch (error) {
      console.error(`Error fetching user availability for user ${userId}:`, error);
      throw error;
    }
  }

  async setUserAvailability(availability: InsertUserAvailability): Promise<UserAvailability> {
    try {
      const [created] = await db
        .insert(userAvailability)
        .values(availability)
        .returning();
      return created;
    } catch (error) {
      console.error('Error setting user availability:', error);
      throw error;
    }
  }

  async getMeetingPreferences(userId: number): Promise<MeetingPreference | undefined> {
    try {
      const [preferences] = await db
        .select()
        .from(meetingPreferences)
        .where(eq(meetingPreferences.userId, userId));
      return preferences;
    } catch (error) {
      console.error(`Error fetching meeting preferences for user ${userId}:`, error);
      throw error;
    }
  }

  async setMeetingPreferences(preferences: InsertMeetingPreference): Promise<MeetingPreference> {
    try {
      const [created] = await db
        .insert(meetingPreferences)
        .values(preferences)
        .returning();
      return created;
    } catch (error) {
      console.error('Error setting meeting preferences:', error);
      throw error;
    }
  }

  async getMeetingInsights(meetingId: number): Promise<MeetingInsight[]> {
    try {
      return await db
        .select()
        .from(meetingInsights)
        .where(eq(meetingInsights.meetingId, meetingId))
        .orderBy(desc(meetingInsights.relevanceScore));
    } catch (error) {
      console.error(`Error fetching insights for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  async createMeetingInsight(insight: InsertMeetingInsight): Promise<MeetingInsight> {
    try {
      const [createdInsight] = await db
        .insert(meetingInsights)
        .values(insight)
        .returning();
      return createdInsight;
    } catch (error) {
      console.error('Error creating meeting insight:', error);
      throw error;
    }
  }

  async getRecommendations(): Promise<MeetingInsight[]> {
    try {
      // Get general recommendations and best practices
      return await db
        .select()
        .from(meetingInsights)
        .where(eq(meetingInsights.category, 'best_practice'))
        .orderBy(desc(meetingInsights.relevanceScore))
        .limit(5);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  async getMeetingOutcomes(meetingId: number): Promise<MeetingOutcome[]> {
    try {
      return await db
        .select()
        .from(meetingOutcomes)
        .where(eq(meetingOutcomes.meetingId, meetingId))
        .orderBy(desc(meetingOutcomes.createdAt));
    } catch (error) {
      console.error(`Error fetching outcomes for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  async createMeetingOutcome(outcome: InsertMeetingOutcome): Promise<MeetingOutcome> {
    try {
      const [createdOutcome] = await db
        .insert(meetingOutcomes)
        .values(outcome)
        .returning();
      return createdOutcome;
    } catch (error) {
      console.error('Error creating meeting outcome:', error);
      throw error;
    }
  }

  async getMeetingMoods(meetingId: number): Promise<MeetingMood[]> {
    try {
      return await db
        .select()
        .from(meetingMoods)
        .where(eq(meetingMoods.meetingId, meetingId))
        .orderBy(desc(meetingMoods.timestamp));
    } catch (error) {
      console.error(`Error fetching moods for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  async createMeetingMood(mood: InsertMeetingMood): Promise<MeetingMood> {
    try {
      const [createdMood] = await db
        .insert(meetingMoods)
        .values(mood)
        .returning();
      return createdMood;
    } catch (error) {
      console.error('Error creating meeting mood:', error);
      throw error;
    }
  }

  async getMeetingMoodSummary(meetingId: number): Promise<{
    overallSentiment: string;
    dominantMoods: string[];
    confidenceAvg: number;
  }> {
    try {
      const moods = await this.getMeetingMoods(meetingId);

      if (moods.length === 0) {
        return {
          overallSentiment: 'neutral',
          dominantMoods: [],
          confidenceAvg: 0
        };
      }

      // Calculate sentiment counts
      const sentimentCounts = moods.reduce((acc: Record<string, number>, mood) => {
        acc[mood.sentiment] = (acc[mood.sentiment] || 0) + 1;
        return acc;
      }, {});

      // Get overall sentiment
      const overallSentiment = Object.entries(sentimentCounts)
        .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

      // Calculate average confidence
      const confidenceAvg = Math.round(
        moods.reduce((sum, mood) => sum + mood.confidence, 0) / moods.length
      );

      // Get dominant moods
      const moodCounts = moods.reduce((acc: Record<string, number>, mood) => {
        mood.moodLabels.forEach(label => {
          acc[label] = (acc[label] || 0) + 1;
        });
        return acc;
      }, {});

      const dominantMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([mood]) => mood);

      return {
        overallSentiment,
        dominantMoods,
        confidenceAvg
      };
    } catch (error) {
      console.error(`Error getting mood summary for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  async getTasks(filters: { meetingId?: number; userId?: number } = {}): Promise<Task[]> {
    try {
      let query = db.select().from(tasks);

      if (filters.meetingId) {
        query = query.where(eq(tasks.meetingId, filters.meetingId));
      }

      if (filters.userId) {
        query = query.where(eq(tasks.assigneeId, filters.userId));
      }

      return await query.orderBy(desc(tasks.createdAt));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    try {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
      return task;
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      throw error;
    }
  }

  async createTask(task: InsertTask): Promise<Task> {
    try {
      const [createdTask] = await db.insert(tasks).values(task).returning();
      return createdTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: number, update: Partial<InsertTask>): Promise<Task> {
    try {
      const [updatedTask] = await db
        .update(tasks)
        .set(update)
        .where(eq(tasks.id, id))
        .returning();

      if (!updatedTask) {
        throw new Error('Task not found');
      }

      return updatedTask;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      const [deletedTask] = await db
        .delete(tasks)
        .where(eq(tasks.id, id))
        .returning();
      return !!deletedTask;
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      throw error;
    }
  }

  async getUserIntegrationSettings(userId: number): Promise<UserIntegrationSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(userIntegrationSettings)
        .where(eq(userIntegrationSettings.userId, userId));
      return settings;
    } catch (error) {
      console.error(`Error fetching integration settings for user ${userId}:`, error);
      throw error;
    }
  }

  async updateUserIntegrationSettings(
    userId: number,
    settings: Partial<InsertUserIntegrationSettings>
  ): Promise<UserIntegrationSettings> {
    try {
      // Check if settings exist for this user
      const existingSettings = await this.getUserIntegrationSettings(userId);

      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await db
          .update(userIntegrationSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(userIntegrationSettings.userId, userId))
          .returning();

        return updatedSettings;
      } else {
        // Create new settings
        const [newSettings] = await db
          .insert(userIntegrationSettings)
          .values({
            userId,
            ...settings,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return newSettings;
      }
    } catch (error) {
      console.error(`Error updating integration settings for user ${userId}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();