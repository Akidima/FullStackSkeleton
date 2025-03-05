import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { InsertMeeting, Meeting } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DragDropCalendarProps {
  onEventCreate?: (meeting: Meeting) => void;
}

export function DragDropCalendar({ onEventCreate }: DragDropCalendarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<any>(null);

  // Fetch existing meetings
  const { data: meetings = [], isLoading: isLoadingMeetings } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch available rooms
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<any[]>({
    queryKey: ['/api/rooms'],
    staleTime: 60000, // Cache for 1 minute
  });

  // Convert meetings to calendar events
  const events = useMemo(() => 
    meetings.map(meeting => ({
      id: meeting.id.toString(),
      title: meeting.title || 'Untitled Meeting',
      start: meeting.date,
      end: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000), // Default 1 hour
      description: meeting.description,
      editable: true, // Make all events editable
      backgroundColor: meeting.userId === user?.id ? '#3b82f6' : '#6b7280',
      borderColor: meeting.userId === user?.id ? '#2563eb' : '#4b5563',
      extendedProps: {
        isOwner: meeting.userId === user?.id,
      }
    })), [meetings, user]
  );

  // Handle event change (drag/resize)
  const handleEventChange = useCallback(async (changeInfo: any) => {
    const meetingId = parseInt(changeInfo.event.id);
    const meeting = meetings.find(m => m.id === meetingId);

    // Only allow if user owns the meeting
    if (!meeting || meeting.userId !== user?.id) {
      changeInfo.revert();
      toast({
        title: "Permission Denied",
        description: "You can only reschedule meetings you created.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check room availability for new time
      const newStart = changeInfo.event.start;
      const endTime = new Date(newStart.getTime() + 60 * 60 * 1000);
      const response = await fetch(
        `/api/rooms/available?startTime=${newStart.toISOString()}&endTime=${endTime.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to check room availability');
      }

      const availableRooms = await response.json();

      if (availableRooms.length === 0) {
        throw new Error('No rooms available');
      }

      // Update meeting
      const updateResponse = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: newStart,
          roomId: availableRooms[0].id,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update meeting');
      }

      // Success handling
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Success",
        description: "Meeting rescheduled successfully",
      });
    } catch (error: any) {
      const errorMessage = error.message === 'No rooms available'
        ? "No rooms available for this time slot"
        : "Failed to reschedule meeting. Please try again.";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Revert the calendar event
      changeInfo.revert();
    }
  }, [meetings, user, queryClient, toast]);

  if (isLoadingMeetings || isLoadingRooms) {
    return <div className="h-[700px] bg-background rounded-lg border p-4 flex items-center justify-center">
      Loading calendar...
    </div>;
  }

  return (
    <div className="h-[700px] bg-background rounded-lg border p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        editable={true}
        selectable={true}
        dayMaxEvents={true}
        events={events}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        expandRows={true}
        stickyHeaderDates={true}
        dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }}
        eventDidMount={(info) => {
          // Add tooltip with meeting details
          info.el.title = `${info.event.title}\n${format(info.event.start!, 'PPp')}`;
        }}
      />
    </div>
  );
}