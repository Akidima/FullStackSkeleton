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

  // Create meeting mutation
  const createMeeting = useMutation({
    mutationFn: async (newMeeting: InsertMeeting) => {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMeeting),
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }

      if (!response.ok) {
        throw new Error('Failed to create meeting');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Meeting Scheduled",
        description: "Your meeting has been successfully scheduled.",
      });
      onEventCreate?.(data);
    },
    onError: (error: Error) => {
      const isRateLimit = error.message === 'Rate limit exceeded';
      toast({
        title: "Error",
        description: isRateLimit 
          ? "Too many requests. Please wait a moment and try again."
          : "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update meeting mutation
  const updateMeeting = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertMeeting> }) => {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }

      if (!response.ok) {
        throw new Error('Failed to update meeting');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Meeting Updated",
        description: "Meeting has been successfully rescheduled.",
      });
    },
    onError: (error: Error) => {
      const isRateLimit = error.message === 'Rate limit exceeded';
      toast({
        title: "Error",
        description: isRateLimit 
          ? "Too many requests. Please wait a moment and try again."
          : "Failed to reschedule meeting. Please try again.",
        variant: "destructive",
      });

      // Revert the calendar event
      if (pendingChange) {
        pendingChange.revert();
      }
    },
  });

  // Convert meetings to calendar events
  const events = useMemo(() => 
    meetings.map(meeting => ({
      id: meeting.id.toString(),
      title: meeting.title || 'Untitled Meeting',
      start: meeting.date,
      end: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000), // Default 1 hour
      description: meeting.description,
      editable: meeting.userId === user?.id, // Only allow editing if user is the owner
    })), [meetings, user]
  );

  // Handle date select (drag create)
  const handleDateSelect = useCallback(async (selectInfo: any) => {
    const title = prompt('Please enter a title for your meeting:');
    if (!title) return;

    // Check room availability
    const response = await fetch(`/api/rooms/available?startTime=${selectInfo.startStr}&endTime=${selectInfo.endStr}`);
    const availableRooms = await response.json();

    if (availableRooms.length === 0) {
      toast({
        title: "No Rooms Available",
        description: "There are no rooms available for this time slot.",
        variant: "destructive",
      });
      return;
    }

    const newMeeting: InsertMeeting = {
      title,
      date: new Date(selectInfo.start),
      description: '',
      participants: [],
      agenda: '',
      notes: '',
      isCompleted: false,
      userId: user?.id || 0,
      roomId: availableRooms[0].id,
    };

    createMeeting.mutate(newMeeting);
  }, [user, createMeeting, toast]);

  // Handle event change (drag/resize)
  const handleEventChange = useCallback(async (changeInfo: any) => {
    setPendingChange(changeInfo);
    setIsConfirmOpen(true);
  }, []);

  // Handle confirmation of event change
  const handleConfirmChange = useCallback(async () => {
    if (!pendingChange) return;

    const meetingId = parseInt(pendingChange.event.id);
    const newStart = pendingChange.event.start;

    // Check room availability for new time
    const endTime = new Date(newStart.getTime() + 60 * 60 * 1000);
    const response = await fetch(
      `/api/rooms/available?startTime=${newStart.toISOString()}&endTime=${endTime.toISOString()}`
    );
    const availableRooms = await response.json();

    if (availableRooms.length === 0) {
      toast({
        title: "No Rooms Available",
        description: "Cannot reschedule - no rooms available for this time slot.",
        variant: "destructive",
      });
      pendingChange.revert();
      return;
    }

    updateMeeting.mutate({
      id: meetingId,
      updates: {
        date: newStart,
        roomId: availableRooms[0].id,
      },
    });

    setIsConfirmOpen(false);
    setPendingChange(null);
  }, [pendingChange, updateMeeting, toast]);

  const handleCancelChange = useCallback(() => {
    if (pendingChange) {
      pendingChange.revert();
    }
    setIsConfirmOpen(false);
    setPendingChange(null);
  }, [pendingChange]);

  if (isLoadingMeetings || isLoadingRooms) {
    return <div className="h-[700px] bg-background rounded-lg border p-4 flex items-center justify-center">
      Loading calendar...
    </div>;
  }

  return (
    <>
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
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
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

      <AlertDialog open={isConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Meeting Reschedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reschedule this meeting? This will notify all participants of the change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}