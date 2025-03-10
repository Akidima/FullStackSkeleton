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
import { showErrorToast, withRetry } from '@/lib/error-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface DragDropCalendarProps {
  onEventCreate?: (meeting: Meeting) => void;
}

export function DragDropCalendar({ onEventCreate }: DragDropCalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [view, setView] = useState('timeGridWeek');

  // Query meetings
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
    staleTime: 30000,
  });

  // Query rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['/api/rooms'],
    staleTime: 60000,
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

  // Check room availability
  const checkRoomAvailability = async (startTime: Date, endTime: Date): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/rooms/available?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to check room availability');
      }

      const availableRooms = await response.json();
      return availableRooms.length > 0;
    } catch (error) {
      console.error('Error checking room availability:', error);
      return false;
    }
  };

  // Handle event changes (drag & drop or resize)
  const handleEventChange = useCallback(async (changeInfo: any) => {
    if (isUpdating) {
      changeInfo.revert();
      return;
    }

    const meetingId = parseInt(changeInfo.event.id);
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting || meeting.userId !== user?.id) {
      changeInfo.revert();
      showErrorToast({
        status: 403,
        message: "You can only reschedule meetings you created."
      });
      return;
    }

    setIsUpdating(true);

    try {
      await withRetry(async () => {
        const newStart = changeInfo.event.start;
        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        const isRoomAvailable = await checkRoomAvailability(newStart, newEnd);

        if (!isRoomAvailable) {
          throw new Error('No rooms available');
        }

        const availableRoomsResponse = await fetch(
          `/api/rooms/available?startTime=${newStart.toISOString()}&endTime=${newEnd.toISOString()}`
        );
        const availableRooms = await availableRoomsResponse.json();

        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: newStart.toISOString(),
            roomId: availableRooms[0].id
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update meeting');
        }

        toast({
          title: "Success",
          description: "Meeting rescheduled successfully",
        });
      });
    } catch (error: any) {
      showErrorToast(error, () => handleEventChange(changeInfo));
      changeInfo.revert();
    } finally {
      setIsUpdating(false);
    }
  }, [meetings, user, toast, isUpdating]);

  // Handle new meeting creation through select
  const handleDateSelect = useCallback(async (selectInfo: any) => {
    const startTime = selectInfo.start;
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    try {
      await withRetry(async () => {
        const isRoomAvailable = await checkRoomAvailability(startTime, endTime);

        if (!isRoomAvailable) {
          throw new Error('No rooms available for this time slot');
        }

        const availableRoomsResponse = await fetch(
          `/api/rooms/available?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`
        );
        const availableRooms = await availableRoomsResponse.json();

        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Meeting',
            date: startTime.toISOString(),
            roomId: availableRooms[0].id,
            userId: user?.id
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create meeting');
        }

        const newMeeting = await response.json();
        onEventCreate?.(newMeeting);

        toast({
          title: "Success",
          description: "Meeting created successfully",
        });
      });
    } catch (error: any) {
      showErrorToast(error, () => handleDateSelect(selectInfo));
    }
  }, [user, onEventCreate, toast]);

  // Handle view changes
  const handleViewChange = (newView: any) => {
    setView(newView.view.type);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-[700px] bg-background rounded-lg border p-4 flex items-center justify-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          Loading calendar...
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-[700px] bg-background rounded-lg border p-4"
      >
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
          events={events}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          select={handleDateSelect}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          expandRows={true}
          stickyHeaderDates={true}
          viewDidMount={handleViewChange}
          dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }}
          eventDidMount={(info) => {
            info.el.title = `${info.event.title}\n${format(info.event.start!, 'PPp')}`;

            // Add animation classes to events
            info.el.classList.add('transition-transform', 'duration-200', 'hover:scale-[1.02]');

            // Add hover effect styles
            info.el.style.transition = 'all 0.2s ease-in-out';
            info.el.addEventListener('mouseenter', () => {
              info.el.style.transform = 'scale(1.02)';
              info.el.style.zIndex = '1';
              info.el.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
            });
            info.el.addEventListener('mouseleave', () => {
              info.el.style.transform = 'scale(1)';
              info.el.style.zIndex = 'auto';
              info.el.style.boxShadow = 'none';
            });
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}