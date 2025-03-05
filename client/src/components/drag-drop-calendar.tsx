import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Meeting } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

interface DragDropCalendarProps {
  onEventCreate?: (meeting: Meeting) => void;
}

// Rate limiting configuration
const INITIAL_RETRY_DELAY = 1000; // Start with 1 second
const MAX_RETRIES = 3;

export function DragDropCalendar({ onEventCreate }: DragDropCalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Query meetings with optimized caching and retry logic
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
    staleTime: 30000,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
  });

  // Convert meetings to calendar events with proper drag-and-drop configuration
  const events = useMemo(() => 
    meetings.map(meeting => ({
      id: meeting.id.toString(),
      title: meeting.title || 'Untitled Meeting',
      start: meeting.date,
      end: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000),
      description: meeting.description,
      editable: true,
      startEditable: true,
      durationEditable: true,
      resourceEditable: true,
      backgroundColor: meeting.userId === user?.id ? '#3b82f6' : '#6b7280',
      borderColor: meeting.userId === user?.id ? '#2563eb' : '#4b5563',
      extendedProps: {
        isOwner: meeting.userId === user?.id
      }
    })), [meetings, user]
  );

  // Handle event changes with rate limiting and retry logic
  const handleEventChange = useCallback(async (changeInfo: any) => {
    if (isUpdating) {
      changeInfo.revert();
      return;
    }

    const meetingId = parseInt(changeInfo.event.id);
    const meeting = meetings.find(m => m.id === meetingId);

    // Verify ownership
    if (!meeting?.userId || meeting.userId !== user?.id) {
      changeInfo.revert();
      toast({
        title: "Permission Denied",
        description: "You can only reschedule meetings you created.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        // Update the event with retry logic
        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: changeInfo.event.start
          }),
        });

        if (response.status === 429) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retries);
          toast({
            title: "Rate Limited",
            description: `Too many requests. Retrying in ${delay/1000} seconds...`,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error('Failed to update meeting');
        }

        success = true;
        toast({
          title: "Success",
          description: "Meeting rescheduled successfully",
        });
      } catch (error) {
        if (retries === MAX_RETRIES - 1) {
          toast({
            title: "Error",
            description: "Failed to reschedule meeting. Please try again later.",
            variant: "destructive",
          });
          changeInfo.revert();
        }
        retries++;
      }
    }

    setIsUpdating(false);
  }, [meetings, user, toast, isUpdating]);

  if (isLoading) {
    return (
      <div className="h-[700px] bg-background rounded-lg border p-4 flex items-center justify-center">
        Loading calendar...
      </div>
    );
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
        droppable={true}
        eventDraggable={true}
        eventResizeable={true}
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
          info.el.title = `${info.event.title}\n${format(info.event.start!, 'PPp')}`;
        }}
      />
    </div>
  );
}