import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Users, ArrowLeft, FileText, CheckCircle2, Mic } from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner, MeetingCardSkeleton } from "@/components/ui/loading-skeleton";
import { MeetingInsights } from "@/components/meeting-insights";
import { useWebSocket } from "@/hooks/use-websocket";
import { TaskManager } from "@/components/task-manager";
import { VoiceAssistant } from "@/components/voice-assistant";
import { ShareButtons } from "@/components/share-buttons";
import { MoodTracker } from "@/components/mood-tracker"; // Assuming MoodTracker is imported


// Rate limiting configuration
const RETRY_DELAY = 1000; // Start with 1 second
const MAX_RETRIES = 3;

export default function MeetingDetails() {
  const [, params] = useRoute("/meetings/:id");
  const meetingId = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const socket = useWebSocket();
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isVoiceAssistantActive, setIsVoiceAssistantActive] = useState(false);

  // Only fetch if we have a valid meetingId
  const { data: meeting, isLoading, error } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${meetingId}`],
    queryFn: async ({ signal }) => {
      if (!meetingId || isNaN(meetingId)) {
        throw new Error('Invalid meeting ID');
      }

      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          const response = await fetch(`/api/meetings/${meetingId}`, { signal });
          if (response.status === 429) { // Too Many Requests
            const delay = RETRY_DELAY * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setNotes(data.notes || "");
          return data;
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          if (retries === MAX_RETRIES - 1) throw error;
          retries++;
        }
      }
      throw new Error('Failed to fetch meeting details after retries');
    },
    enabled: !!meetingId && !isNaN(meetingId),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  // Save notes mutation with retry logic
  const saveNotes = useMutation({
    mutationFn: async (newNotes: string) => {
      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          const response = await fetch(`/api/meetings/${meetingId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notes: newNotes }),
          });
          if (response.status === 429) {
            const delay = RETRY_DELAY * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          if (!response.ok) {
            throw new Error('Failed to save notes');
          }
          return response.json();
        } catch (error) {
          if (retries === MAX_RETRIES - 1) throw error;
          retries++;
        }
      }
      throw new Error('Failed to save notes after retries');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      toast({
        title: "Notes Saved",
        description: "Your notes have been saved successfully.",
      });
      setIsEditingNotes(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message === 'Failed to save notes after retries'
          ? "Too many requests. Please try again in a moment."
          : "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate summary mutation with retry logic
  const generateSummary = useMutation({
    mutationFn: async () => {
      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
            method: 'POST',
          });
          if (response.status === 429) {
            const delay = RETRY_DELAY * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }
          if (!response.ok) {
            throw new Error('Failed to generate summary');
          }
          return response.json();
        } catch (error) {
          if (retries === MAX_RETRIES - 1) throw error;
          retries++;
        }
      }
      throw new Error('Failed to generate summary after retries');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      toast({
        title: "Summary Generated",
        description: "Meeting summary has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message === 'Failed to generate summary after retries'
          ? "Too many requests. Please try again in a moment."
          : "Failed to generate meeting summary.",
        variant: "destructive",
      });
    },
  });

  // Update the WebSocket usage in the component
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    if (socket?.socket?.readyState === WebSocket.OPEN) {
      socket.socket.send(JSON.stringify({
        type: 'meeting:notes',
        meetingId,
        notes: newNotes
      }));
    }
  };

  const handleVoiceCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('create task') || lowerCommand.includes('add action item')) {
      // Extract task details from voice command
      const taskTitle = command.replace(/create task|add action item/i, '').trim();
      if (taskTitle) {
        try {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: taskTitle,
              meetingId: parseInt(meetingId!),
              status: 'pending',
              priority: 'medium',
            }),
          });

          if (!response.ok) throw new Error('Failed to create task');

          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          toast({
            title: "Task Created",
            description: `New task added: ${taskTitle}`,
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to create task. Please try again.",
            variant: "destructive",
          });
        }
      }
    } else if (lowerCommand.includes('generate summary')) {
      generateSummary.mutate();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (!isEditingNotes) setIsEditingNotes(true);
    setNotes(prev => prev + (prev ? '\n' : '') + transcript);

    if (socket?.socket?.readyState === WebSocket.OPEN) {
      socket.socket.send(JSON.stringify({
        type: 'meeting:notes',
        meetingId,
        notes: notes + (notes ? '\n' : '') + transcript
      }));
    }
  };

  // Update the WebSocket effect
  useEffect(() => {
    if (!socket?.socket || !meetingId) return;

    const ws = socket.socket;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'meeting:join',
        meetingId
      }));
    }

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'meeting:notes' && data.meetingId === meetingId) {
        setNotes(data.notes);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'meeting:leave',
          meetingId
        }));
      }
      ws.removeEventListener('message', handleMessage);
    };
  }, [socket?.socket, meetingId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-40 bg-muted animate-pulse rounded" />
          </div>
          <MeetingCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error && error.message.includes('Too many requests')
      ? "Too many requests. Please try again in a moment."
      : error.message === 'Invalid meeting ID' ? "Invalid Meeting ID" : "The meeting you're looking for doesn't exist or has been deleted.";

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold mb-2">Error loading meeting</h2>
            <p className="text-muted-foreground mb-4">
              {errorMessage}
            </p>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Meetings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold mb-2">Meeting not found</h2>
            <p className="text-muted-foreground mb-4">
              The meeting you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Meetings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!meetingId || isNaN(meetingId)) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold mb-2">Invalid Meeting ID</h2>
            <p className="text-muted-foreground mb-4">
              The meeting ID provided is invalid.
            </p>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Meetings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Meetings
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsVoiceAssistantActive(!isVoiceAssistantActive)}
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              {isVoiceAssistantActive ? "Disable" : "Enable"} Voice Assistant
            </Button>
            {isEditingNotes ? (
              <Button
                onClick={() => saveNotes.mutate(notes)}
                disabled={saveNotes.isPending}
                variant="default"
              >
                {saveNotes.isPending ? (
                  <LoadingSpinner size="small" className="text-white" />
                ) : (
                  "Save Notes"
                )}
              </Button>
            ) : notes && !meeting.summary && (
              <Button
                onClick={() => generateSummary.mutate()}
                disabled={generateSummary.isPending}
                className="gap-2"
              >
                {generateSummary.isPending ? (
                  <LoadingSpinner size="small" className="text-white" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {generateSummary.isPending ? "Generating..." : "Generate Summary"}
              </Button>
            )}
          </div>
        </div>

        {isVoiceAssistantActive && (
          <VoiceAssistant
            isActive={true}
            onCommand={handleVoiceCommand}
            onTranscript={handleVoiceTranscript}
          />
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{meeting.title || "Untitled Meeting"}</CardTitle>
                {meeting.description && (
                  <CardDescription className="mt-2">{meeting.description}</CardDescription>
                )}
              </div>
              {meeting.isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(meeting.date), "PPP 'at' p")}
                </div>
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {meeting.agenda && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Agenda</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{meeting.agenda}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Notes</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(!isEditingNotes)}
                  >
                    {isEditingNotes ? "Preview" : "Edit"}
                  </Button>
                </div>
                {isEditingNotes ? (
                  <Textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="Take meeting notes here..."
                    className="min-h-[200px]"
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {notes || "No notes taken yet."}
                  </p>
                )}
              </div>

              {meeting.summary && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Summary</h3>
                    <ShareButtons
                      title={meeting.title}
                      summary={meeting.summary}
                      notes={meeting.notes}
                      url={window.location.href}
                    />
                  </div>
                  <p className="text-muted-foreground">{meeting.summary}</p>
                </div>
              )}

              {/* Add MoodTracker component here */}
              <div className="space-y-2">
                <h3 className="font-semibold">Meeting Mood Analysis</h3>
                <MoodTracker meetingId={meetingId!} />
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Action Items</h3>
                <TaskManager meetingId={parseInt(meetingId!)} />
              </div>

              <MeetingInsights meetingId={parseInt(meetingId!)} />

              <div className="flex justify-end gap-2">
                <Link href={`/meetings/${meeting.id}/edit`}>
                  <Button variant="outline">Edit Meeting</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}