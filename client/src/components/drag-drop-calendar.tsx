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
    console.log("Event change detected:", changeInfo);
    
    // If we're already processing an update, revert this one
    if (isUpdating) {
      console.log("Already updating, reverting change");
      changeInfo.revert();
      return;
    }

    const meetingId = parseInt(changeInfo.event.id);
    const meeting = meetings.find(m => m.id === meetingId);
    
    console.log("Meeting found:", meeting);

    // Only allow users to modify their own meetings
    if (!meeting || meeting.userId !== user?.id) {
      console.log("Permission denied - not your meeting");
      changeInfo.revert();
      showErrorToast({
        status: 403,
        message: "You can only reschedule meetings you created."
      });
      return;
    }

    // Set updating flag to prevent multiple simultaneous updates
    setIsUpdating(true);

    try {
      await withRetry(async () => {
        const newStart = changeInfo.event.start;
        
        // For resize events, use the provided end time
        let newEnd;
        if (changeInfo.event.end) {
          newEnd = changeInfo.event.end;
        } else {
          // Default to 1 hour duration
          newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        }
        
        console.log("Checking room availability:", { newStart, newEnd });
        
        // Check if rooms are available for this new time
        const isRoomAvailable = await checkRoomAvailability(newStart, newEnd);

        if (!isRoomAvailable) {
          console.error("No rooms available for this time");
          throw new Error('No rooms available for this time slot');
        }

        // Get the list of available rooms
        const availableRoomsResponse = await fetch(
          `/api/rooms/available?startTime=${newStart.toISOString()}&endTime=${newEnd.toISOString()}`
        );
        
        if (!availableRoomsResponse.ok) {
          throw new Error('Failed to check room availability');
        }
        
        const availableRooms = await availableRoomsResponse.json();
        
        if (!availableRooms.length) {
          throw new Error('No rooms available for this time slot');
        }

        console.log("Available rooms:", availableRooms);

        // Update the meeting with the new time and room
        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: newStart.toISOString(),
            roomId: availableRooms[0].id
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update meeting');
        }

        console.log("Meeting updated successfully");
        
        toast({
          title: "Success",
          description: "Meeting rescheduled successfully",
        });
      });
    } catch (error: any) {
      console.error("Error updating meeting:", error);
      showErrorToast(error, () => handleEventChange(changeInfo));
      changeInfo.revert();
    } finally {
      setIsUpdating(false);
    }
  }, [meetings, user, toast, isUpdating, checkRoomAvailability]);

  // Handle new meeting creation through select
  const handleDateSelect = useCallback(async (selectInfo: any) => {
    console.log("Date selection detected:", selectInfo);
    
    // Calculate the actual end time from the selection
    const startTime = selectInfo.start;
    // If the selection has an end time, use it; otherwise default to 1 hour later
    const providedEndTime = selectInfo.end;
    const endTime = providedEndTime || new Date(startTime.getTime() + 60 * 60 * 1000);
    
    // Clear the selection to prevent visual artifacts
    selectInfo.view.calendar.unselect();

    try {
      await withRetry(async () => {
        // First check if rooms are available
        const isRoomAvailable = await checkRoomAvailability(startTime, endTime);

        if (!isRoomAvailable) {
          throw new Error('No rooms available for this time slot');
        }

        const availableRoomsResponse = await fetch(
          `/api/rooms/available?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`
        );
        
        if (!availableRoomsResponse.ok) {
          throw new Error('Failed to check room availability');
        }
        
        const availableRooms = await availableRoomsResponse.json();
        
        if (!availableRooms.length) {
          throw new Error('No rooms available for this time slot');
        }

        // Create the meeting with the first available room
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create meeting');
        }

        const newMeeting = await response.json();
        console.log("Meeting created successfully:", newMeeting);
        
        // Notify parent component
        onEventCreate?.(newMeeting);

        toast({
          title: "Success",
          description: "Meeting created successfully",
        });
      });
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      showErrorToast(error, () => handleDateSelect(selectInfo));
    }
  }, [user, onEventCreate, toast, checkRoomAvailability]);

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