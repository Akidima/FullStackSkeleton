import { meetings, users, registrationAttempts, securityRecommendations, type Meeting, type InsertMeeting, type User, type InsertUser, type RegistrationAttempt, type InsertRegistrationAttempt, type SecurityRecommendation, type InsertSecurityRecommendation } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
    return await db.select().from(meetings);
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [createdMeeting] = await db.insert(meetings).values(meeting).returning();
    return createdMeeting;
  }

  async updateMeeting(id: number, update: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updatedMeeting] = await db
      .update(meetings)
      .set(update)
      .where(eq(meetings.id, id))
      .returning();
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    const [deletedMeeting] = await db
      .delete(meetings)
      .where(eq(meetings.id, id))
      .returning();
    return !!deletedMeeting;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, update: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async getUserMeetings(userId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.userId, userId));
  }

  async createRegistrationAttempt(attempt: InsertRegistrationAttempt): Promise<RegistrationAttempt> {
    const [createdAttempt] = await db.insert(registrationAttempts).values(attempt).returning();
    return createdAttempt;
  }

  async getRegistrationAttempts(limit: number = 100): Promise<RegistrationAttempt[]> {
    return await db
      .select()
      .from(registrationAttempts)
      .orderBy(desc(registrationAttempts.attemptTime))
      .limit(limit);
  }

  async getRegistrationAttemptsByIP(ipAddress: string): Promise<RegistrationAttempt[]> {
    return await db
      .select()
      .from(registrationAttempts)
      .where(eq(registrationAttempts.ipAddress, ipAddress))
      .orderBy(desc(registrationAttempts.attemptTime));
  }

  async getRegistrationAttemptsByEmail(email: string): Promise<RegistrationAttempt[]> {
    return await db
      .select()
      .from(registrationAttempts)
      .where(eq(registrationAttempts.email, email))
      .orderBy(desc(registrationAttempts.attemptTime));
  }

  async createSecurityRecommendation(recommendation: InsertSecurityRecommendation): Promise<SecurityRecommendation> {
    const [createdRecommendation] = await db
      .insert(securityRecommendations)
      .values(recommendation)
      .returning();
    return createdRecommendation;
  }

  async getUserSecurityRecommendations(userId: number): Promise<SecurityRecommendation[]> {
    return await db
      .select()
      .from(securityRecommendations)
      .where(eq(securityRecommendations.userId, userId))
      .orderBy(desc(securityRecommendations.createdAt));
  }

  async updateSecurityRecommendation(
    id: number,
    update: Partial<InsertSecurityRecommendation>
  ): Promise<SecurityRecommendation> {
    const [updatedRecommendation] = await db
      .update(securityRecommendations)
      .set(update)
      .where(eq(securityRecommendations.id, id))
      .returning();

    if (!updatedRecommendation) {
      throw new Error('Security recommendation not found');
    }

    return updatedRecommendation;
  }

  async dismissSecurityRecommendation(id: number): Promise<SecurityRecommendation> {
    return this.updateSecurityRecommendation(id, {
      status: 'dismissed'
    });
  }

  async implementSecurityRecommendation(id: number): Promise<SecurityRecommendation> {
    return this.updateSecurityRecommendation(id, {
      status: 'implemented',
      implementedAt: new Date()
    });
  }
}

export const storage = new DatabaseStorage();