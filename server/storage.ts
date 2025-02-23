import { meetings, users, registrationAttempts, securityRecommendations, type Meeting, type InsertMeeting, type User, type InsertUser, type RegistrationAttempt, type InsertRegistrationAttempt, type SecurityRecommendation, type InsertSecurityRecommendation } from "@shared/schema";
import { db, testConnection } from "./db";
import { eq, desc } from "drizzle-orm";

// Test database connection on startup
testConnection().catch(console.error);

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
}

export class DatabaseStorage implements IStorage {
  async getMeetings(): Promise<Meeting[]> {
    try {
      return await db.select().from(meetings);
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
        status: 'implemented'
      });
    } catch (error) {
      console.error(`Error implementing security recommendation ${id}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();