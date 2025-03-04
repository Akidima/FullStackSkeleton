import { storage } from '../storage';
import { type Meeting, type Room, type CalendarEvent, type UserAvailability } from '@shared/schema';
import { addMinutes, format, parse, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  room?: Room;
  score: number; // Higher score means better slot
}

interface SchedulingSuggestion {
  timeSlots: TimeSlot[];
  participants: {
    userId: number;
    conflicts?: CalendarEvent[];
  }[];
}

export class SchedulerService {
  private static async getUserAvailableTime(
    userId: number,
    startTime: Date,
    endTime: Date,
    userTimezone: string
  ): Promise<boolean> {
    const availability = await storage.getUserAvailability(userId);
    const dayOfWeek = startTime.getDay();

    const userAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);
    if (!userAvailability) return false;

    // Convert the time strings to Date objects in user's timezone
    const availStart = parse(userAvailability.startTime, 'HH:mm', startTime);
    const availEnd = parse(userAvailability.endTime, 'HH:mm', endTime);

    // Format the meeting times in user's timezone for comparison
    const zonedStartTime = formatInTimeZone(startTime, userTimezone, 'HH:mm');
    const zonedEndTime = formatInTimeZone(endTime, userTimezone, 'HH:mm');

    // Compare the times
    const meetingStart = parse(zonedStartTime, 'HH:mm', startTime);
    const meetingEnd = parse(zonedEndTime, 'HH:mm', endTime);

    return !isBefore(meetingStart, availStart) && !isAfter(meetingEnd, availEnd);
  }

  private static async getConflictingEvents(
    userId: number,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEvent[]> {
    return await storage.getUserCalendarEvents(userId, startTime, endTime);
  }

  private static async findAvailableRooms(
    startTime: Date,
    endTime: Date,
    requiredCapacity: number
  ): Promise<Room[]> {
    return await storage.getAvailableRooms(startTime, endTime, requiredCapacity);
  }

  static async suggestMeetingTimes(
    participantIds: number[],
    duration: number, // in minutes
    earliestStartTime: Date,
    latestStartTime: Date,
    requiredCapacity: number
  ): Promise<SchedulingSuggestion> {
    const suggestions: TimeSlot[] = [];
    const participantConflicts: Record<number, CalendarEvent[]> = {};

    // Get all participants' calendar events and preferences
    const participantEvents = await Promise.all(
      participantIds.map(async (userId) => ({
        userId,
        events: await this.getConflictingEvents(userId, earliestStartTime, latestStartTime),
        preferences: await storage.getMeetingPreferences(userId),
      }))
    );

    // Generate time slots in 30-minute increments
    let currentSlotStart = new Date(earliestStartTime);
    while (isBefore(currentSlotStart, latestStartTime)) {
      const slotEnd = addMinutes(currentSlotStart, duration);

      // Check room availability
      const availableRooms = await this.findAvailableRooms(
        currentSlotStart,
        slotEnd,
        requiredCapacity
      );

      if (availableRooms.length > 0) {
        // Check participant availability
        let slotScore = 0;
        let isSlotViable = true;

        for (const { userId, events, preferences } of participantEvents) {
          // Check working hours
          const userTimezone = preferences?.timezone || 'UTC';
          const isWithinWorkingHours = await this.getUserAvailableTime(
            userId,
            currentSlotStart,
            slotEnd,
            userTimezone
          );

          if (!isWithinWorkingHours) {
            isSlotViable = false;
            break;
          }

          // Check conflicts
          const conflicts = events.filter(event =>
            areIntervalsOverlapping(
              { start: currentSlotStart, end: slotEnd },
              { start: event.startTime, end: event.endTime }
            )
          );

          if (conflicts.length > 0) {
            isSlotViable = false;
            participantConflicts[userId] = conflicts;
            break;
          }

          // Add to score based on preferences
          if (preferences) {
            if (preferences.preferredDuration === duration) slotScore += 2;
            if (preferences.bufferTime) {
              const hasBuffer = !events.some(event =>
                areIntervalsOverlapping(
                  { 
                    start: addMinutes(currentSlotStart, -preferences.bufferTime), 
                    end: addMinutes(slotEnd, preferences.bufferTime) 
                  },
                  { start: event.startTime, end: event.endTime }
                )
              );
              if (hasBuffer) slotScore += 1;
            }
          }
        }

        if (isSlotViable) {
          suggestions.push({
            startTime: currentSlotStart,
            endTime: slotEnd,
            room: availableRooms[0], // Suggest the first available room
            score: slotScore
          });
        }
      }

      currentSlotStart = addMinutes(currentSlotStart, 30);
    }

    // Sort suggestions by score (highest first)
    suggestions.sort((a, b) => b.score - a.score);

    return {
      timeSlots: suggestions.slice(0, 5), // Return top 5 suggestions
      participants: participantIds.map(userId => ({
        userId,
        conflicts: participantConflicts[userId]
      }))
    };
  }

  static async scheduleNewMeeting(
    meeting: Meeting,
    timeSlot: TimeSlot,
    participantIds: number[]
  ): Promise<Meeting> {
    const updatedMeeting = await storage.updateMeeting(meeting.id, {
      ...meeting,
      date: timeSlot.startTime,
    });

    // Create calendar events for all participants
    await Promise.all(
      participantIds.map(userId =>
        storage.createCalendarEvent({
          userId,
          title: meeting.title,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          meetingId: meeting.id,
          roomId: timeSlot.room?.id
        })
      )
    );

    return updatedMeeting;
  }
}