import { DragDropCalendar } from "@/components/drag-drop-calendar";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function CalendarView() {
  const [, setLocation] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-center"
        >
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold tracking-tight"
          >
            Meeting Calendar
          </motion.h1>
          <motion.p
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground"
          >
            Drag to create meetings or resize existing ones
          </motion.p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <DragDropCalendar
            onEventCreate={(meeting) => {
              setLocation(`/meetings/${meeting.id}`);
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}