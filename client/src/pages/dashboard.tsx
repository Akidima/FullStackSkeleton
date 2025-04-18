import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { VoiceAssistant } from "@/components/voice-assistant";
import { ErrorBoundary } from "@/components/error-boundary";
import { useMockWebSocket } from "@/hooks/mock-websocket-provider";
import { mockMeetings, mockTasks, mockNotes } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";

interface TaskType {
  id: number;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "high" | "medium" | "low";
  progress: number;
  completed: boolean;
  dueDate?: Date | null;
}

interface NoteType {
  id: number;
  meetingTitle: string;
  content: string;
  createdAt: string;
  decisions?: string[];
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<string>("meetings");
  const [isVoiceAssistantEnabled, setIsVoiceAssistantEnabled] = useState(false);
  const { isConnected } = useMockWebSocket();
  const { toast } = useToast();

  const { data: meetings = mockMeetings, isLoading: meetingsLoading } = useQuery({ 
    queryKey: ['meetings'],
    queryFn: () => fetch('/api/meetings').then(res => res.json())
  });

  const { data: tasks = mockTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then(res => res.json())
  });

  const { data: recentNotes = mockNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => fetch('/api/notes').then(res => res.json())
  });

  // Use the loading states from the queries directly
  const isLoading = meetingsLoading || tasksLoading || notesLoading;

  // Log connection status
  useEffect(() => {
    if (isConnected) {
      console.log('WebSocket connected in Dashboard');
    }
  }, [isConnected]);

  // Ensure meetings is an array before filtering
  const upcomingMeetings = Array.isArray(meetings) 
    ? meetings
        .filter(m => new Date(m.date) > new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)
    : [];

  // Ensure tasks is an array before filtering
  const tasksArray = Array.isArray(tasks) ? tasks : [];
  const completedTasks = tasksArray.filter(t => t.completed).length;
  const completionRate = tasksArray.length ? (completedTasks / tasksArray.length) * 100 : 0;

  const priorityColors: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    switch (command) {
      case 'meetings':
        setActiveSection('meetings');
        toast({ title: "Navigated to Meetings" });
        break;
      case 'tasks':
        setActiveSection('tasks');
        toast({ title: "Navigated to Tasks" });
        break;
      case 'notes':
        setActiveSection('notes');
        toast({ title: "Navigated to Notes" });
        break;
      case 'new':
        window.location.href = '/meetings/new';
        break;
      case 'summary':
        setActiveSection('summary');
        toast({ title: "Showing Task Summary" });
        break;
    }
  };

  const testCalendarSync = async () => {
    try {
      // Use the direct API endpoint
      const response = await fetch('/api/test/calendar-sync');
      const data = await response.json();
      
      console.log('API response for calendar sync test:', data);
      
      // Show success toast
      toast({
        title: "Calendar Sync Test Sent",
        description: `API call successful: ${data.message}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error sending calendar sync test via API:', error);
      
      // Show error toast
      toast({
        title: "Calendar Sync Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            Welcome to MeetMate! Here's what's happening today.
            {isConnected ? (
              <span className="inline-flex items-center text-sm text-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                <span className="sr-only md:not-sr-only md:inline">Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center text-sm text-amber-500">
                <WifiOff className="h-3 w-3 mr-1" />
                <span className="sr-only md:not-sr-only md:inline">Offline</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Button 
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={testCalendarSync}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Test Calendar Sync
          </Button>
          
          <ErrorBoundary>
            {!isVoiceAssistantEnabled ? (
              <Button
                variant="outline"
                onClick={() => setIsVoiceAssistantEnabled(true)}
              >
                Enable Voice Assistant
              </Button>
            ) : (
              <VoiceAssistant
                isActive={true}
                onCommand={handleVoiceCommand}
                userId={1} // Replace with actual user ID from auth context
                currentPage="dashboard"
              />
            )}
          </ErrorBoundary>
          <Link href="/meetings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Meetings Widget */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : upcomingMeetings.length > 0 ? (
              <div className="space-y-4">
                {upcomingMeetings.map(meeting => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{meeting.title || "Untitled Meeting"}</h3>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(meeting.date), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {meeting.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No upcoming meetings scheduled
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Items Progress Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-2 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{completedTasks}/{tasksArray.length}</span>
                  <span className="text-muted-foreground">completed</span>
                </div>
                <Progress value={completionRate} className="mb-4" />
                <div className="space-y-2">
                  {tasksArray.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                      <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Notes & Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : Array.isArray(recentNotes) && recentNotes.length > 0 ? (
              <div className="space-y-4">
                {recentNotes.map(note => (
                  <div key={note.id} className="space-y-2 border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <Link href={`/meetings/${note.id}`}>
                        <span className="font-medium hover:text-primary">{note.meetingTitle}</span>
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{note.content}</p>
                    {note.decisions && note.decisions.length > 0 && (
                      <div className="mt-1">
                        <h4 className="text-sm font-medium text-primary">Key Decisions:</h4>
                        <ul className="list-disc pl-4 text-sm text-muted-foreground">
                          {note.decisions.map((decision: string, idx: number) => (
                            <li key={idx}>{decision}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No recent notes available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Items Summary Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Action Items Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                tasksArray.reduce<Record<string, number>>((acc, task) => {
                  acc[task.priority] = (acc[task.priority] || 0) + 1;
                  return acc;
                }, {})
              ).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${priorityColors[priority]}`} />
                    <span className="capitalize">{priority}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}