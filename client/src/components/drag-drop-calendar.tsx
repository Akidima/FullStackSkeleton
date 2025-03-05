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

export function DragDropCalendar({ onEventCreate }: DragDropCalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Query meetings
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
    staleTime: 30000,
  });

  // Convert meetings to calendar events
  const events = useMemo(() => 
    meetings.map(meeting => {
      const isOwner = meeting.userId === user?.id;
      return {
        id: meeting.id.toString(),
        title: meeting.title || 'Untitled Meeting',
        start: meeting.date,
        end: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000),
        description: meeting.description,
        editable: isOwner,
        durationEditable: isOwner,
        startEditable: isOwner,
        backgroundColor: isOwner ? '#3b82f6' : '#6b7280',
        borderColor: isOwner ? '#2563eb' : '#4b5563',
      };
    }), [meetings, user]
  );

  // Handle event changes
  const handleEventChange = useCallback(async (changeInfo: any) => {
    if (isUpdating) {
      changeInfo.revert();
      return;
    }

    const meetingId = parseInt(changeInfo.event.id);
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting || meeting.userId !== user?.id) {
      changeInfo.revert();
      toast({
        title: "Permission Denied",
        description: "You can only reschedule meetings you created.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: changeInfo.event.start.toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meeting');
      }

      toast({
        title: "Success",
        description: "Meeting rescheduled successfully",
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule meeting. Please try again.",
        variant: "destructive",
      });
      changeInfo.revert();
    } finally {
      setIsUpdating(false);
    }
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