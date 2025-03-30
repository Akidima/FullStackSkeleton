import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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

// Utility function to debounce function calls
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface DragDropCalendarProps {
  onEventCreate?: (meeting: Meeting) => void;
}

export function DragDropCalendar({ onEventCreate }: DragDropCalendarProps) {
  const { user, getUserId } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [view, setView] = useState('timeGridWeek');
  const calendarRef = useRef<any>(null);
  
  // Check room availability - defined early to avoid reference before declaration
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
  
  // Manual event creation for cases where select doesn't work
  const createManualEvent = useCallback(async (date: Date) => {
    console.log("Creating manual event at:", date);
    // Default to a 1-hour meeting
    const startTime = date;
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    
    try {
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
          userId: getUserId()
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
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      showErrorToast(error, () => createManualEvent(date));
    }
  }, [getUserId, onEventCreate, toast, checkRoomAvailability]);

  // Effect to handle direct calendar API access when needed
  useEffect(() => {
    if (!calendarRef.current) return;
    
    console.log("Calendar API initialized");
    
    // Track last click time to prevent rapid clicking
    let lastClickTime = 0;
    const MIN_CLICK_INTERVAL = 2000; // 2 seconds between clicks
    
    // Function to handle a click on a time slot
    const handleTimeSlotClick = (e: MouseEvent) => {
      e.stopPropagation(); // Prevent other handlers from firing
      
      // Rate limit clicks to prevent "Too many requests" errors
      const now = Date.now();
      if (now - lastClickTime < MIN_CLICK_INTERVAL) {
        console.log("Click rate limited - please wait");
        toast({
          title: "Please wait",
          description: "Processing previous request...",
          variant: "destructive"
        });
        return;
      }
      
      // Update last click time
      lastClickTime = now;
      
      // Get a reference to the calendar API
      const calendarApi = calendarRef.current?.getApi();
      if (!calendarApi) return;
      
      // Get the clicked element and find the cell
      const target = e.target as HTMLElement;
      const cell = target.closest('.fc-timegrid-slot-lane') as HTMLElement;
      if (!cell) return;
      
      // Extract the date information
      const day = cell.closest('.fc-day');
      if (!day) return;
      
      const dateAttr = day.getAttribute('data-date');
      if (!dateAttr) return;
      
      // Extract the time information
      const timeRow = cell.closest('tr');
      if (!timeRow) return;
      
      const timeAttr = timeRow.getAttribute('data-time');
      if (!timeAttr) return;
      
      // Parse the date and time
      const [year, month, dayNum] = dateAttr.split('-').map(n => parseInt(n));
      const [hours, minutes] = timeAttr.split(':').map(n => parseInt(n));
      
      // Create the date object
      const clickDate = new Date(year, month - 1, dayNum, hours, minutes);
      console.log("Direct cell click detected:", clickDate);
      
      // Visual feedback that the click was registered
      cell.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      setTimeout(() => {
        cell.style.backgroundColor = '';
      }, 300);
      
      // Create the event - use debounced version to prevent multiple calls
      debouncedCreateEvent(clickDate);
    };
    
    // Create a debounced version of the createManualEvent function
    const debouncedCreateEvent = debounce((date: Date) => {
      createManualEvent(date);
    }, 500);
    
    // Apply handlers to all the time cells
    const calendarEl = calendarRef.current.elRef.current;
    if (calendarEl) {
      // First, remove any existing handlers
      const container = calendarEl.querySelector('.fc-timegrid-slots');
      if (container) {
        container.removeEventListener('click', handleTimeSlotClick as EventListener);
        
        // Add the event listener to the container to use event delegation
        container.addEventListener('click', handleTimeSlotClick as EventListener);
        
        // Make the slots look clickable
        const cells = calendarEl.querySelectorAll('.fc-timegrid-slot-lane');
        cells.forEach((cell: HTMLElement) => {
          cell.style.cursor = 'pointer';
        });
        
        // Add a helper message
        const header = calendarEl.querySelector('.fc-header-toolbar');
        if (header) {
          const helpText = document.createElement('div');
          helpText.textContent = 'Click on a time slot to create a meeting';
          helpText.style.fontSize = '0.8rem';
          helpText.style.color = 'var(--muted-foreground)';
          helpText.style.textAlign = 'center';
          helpText.style.marginTop = '0.5rem';
          header.appendChild(helpText);
        }
      }
    }
    
    // Cleanup function to remove event listeners when component unmounts
    return () => {
      if (calendarEl) {
        const container = calendarEl.querySelector('.fc-timegrid-slots');
        if (container) {
          container.removeEventListener('click', handleTimeSlotClick as EventListener);
        }
      }
    };
  }, [calendarRef.current, createManualEvent]);

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
      const isOwner = meeting.userId === getUserId();
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
    }), [meetings, getUserId]
  );

  // The checkRoomAvailability function is already defined at the top of the component

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
    if (!meeting || meeting.userId !== getUserId()) {
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
  }, [meetings, getUserId, toast, isUpdating, checkRoomAvailability]);

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
            userId: getUserId()
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
  }, [getUserId, onEventCreate, toast, checkRoomAvailability]);

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
          ref={calendarRef}
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
          // Ensure interaction plugin is properly initialized
          droppable={true}
          fixedWeekCount={false}
          handleWindowResize={true}
          selectLongPressDelay={500}
          // Make sure we allow selection from any part of the calendar
          selectAllow={() => true}
          // Explicitly enable editing features
          eventStartEditable={true}
          eventDurationEditable={true}
          // Make time slots more obvious
          slotEventOverlap={false}
          nowIndicator={true}
          // Help users understand where they can drag
          eventDragMinDistance={10}
          // Fix for touch devices
          longPressDelay={100}
          eventLongPressDelay={100}
          selectMinDistance={3}
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