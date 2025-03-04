import { DragDropCalendar } from "@/components/drag-drop-calendar";
import { useLocation } from "wouter";

export default function CalendarView() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Meeting Calendar</h1>
          <p className="text-muted-foreground">
            Drag to create meetings or resize existing ones
          </p>
        </div>
        <DragDropCalendar
          onEventCreate={(meeting) => {
            setLocation(`/meetings/${meeting.id}`);
          }}
        />
      </div>
    </div>
  );
}