import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { InsertMeeting, Meeting } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

interface DragDropCalendarProps {
  onEventCreate?: (meeting: Meeting) => void;
}

export function DragDropCalendar({ onEventCreate }: DragDropCalendarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing meetings
  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
  });

  // Fetch available rooms
  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ['/api/rooms'],
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
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
    })), [meetings]
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
  }, [user, createMeeting]);

  // Handle event resize/drag
  const handleEventChange = useCallback(async (changeInfo: any) => {
    const meetingId = parseInt(changeInfo.event.id);
    const newStart = changeInfo.event.start;

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: newStart,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meeting');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Meeting Updated",
        description: "Meeting time has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update meeting time. Please try again.",
        variant: "destructive",
      });
      // Revert the change
      changeInfo.revert();
    }
  }, [queryClient]);

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
      />
    </div>
  );
}
