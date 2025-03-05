import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Users, ArrowLeft, FileText, CheckCircle2, Mic, Share2 } from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { useWebSocket } from "@/hooks/use-websocket";
import { TaskManager } from "@/components/task-manager";
import { VoiceAssistant } from "@/components/voice-assistant";
import { ShareButtons } from "@/components/share-buttons";

// Rate limiting configuration
const RETRY_DELAY = 1000; // Start with 1 second
const MAX_RETRIES = 3;

export default function MeetingDetails() {
  const [, params] = useRoute("/meetings/:id");
  const meetingId = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const socket = useWebSocket();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isVoiceAssistantActive, setIsVoiceAssistantActive] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Query for meeting details
  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${meetingId}`],
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: newNotes }),
          });

          if (response.status === 429) {
            const delay = RETRY_DELAY * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }

          if (!response.ok) throw new Error('Failed to save notes');
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
      setIsSummarizing(true);
      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
          });

          if (response.status === 429) {
            const delay = RETRY_DELAY * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }

          if (!response.ok) throw new Error('Failed to generate summary');
          return response.json();
        } catch (error) {
          if (retries === MAX_RETRIES - 1) throw error;
          retries++;
        }
      }
      throw new Error('Failed to generate summary after retries');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      toast({
        title: "Summary Generated",
        description: "Meeting summary has been generated successfully.",
      });
      // Broadcast summary update to other participants
      if (socket?.socket?.readyState === WebSocket.OPEN) {
        socket.socket.send(JSON.stringify({
          type: 'meeting:summary',
          meetingId,
          summary: data.summary
        }));
      }
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
    onSettled: () => {
      setIsSummarizing(false);
    }
  });

  // Handle real-time note changes
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

  // WebSocket effect for real-time collaboration
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
      } else if (data.type === 'meeting:summary' && data.meetingId === meetingId) {
        queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
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
  }, [socket?.socket, meetingId, queryClient]);

  if (isLoading || !meeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="large" />
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
                disabled={generateSummary.isPending || isSummarizing}
                className="gap-2"
              >
                {isSummarizing ? (
                  <LoadingSpinner size="small" className="text-white" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {isSummarizing ? "Generating..." : "Generate Summary"}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  {meeting.title || "Untitled Meeting"}
                </CardTitle>
                {meeting.description && (
                  <CardDescription className="mt-2">
                    {meeting.description}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {meeting.isCompleted && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Meeting Details */}
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

              {/* Agenda Section */}
              {meeting.agenda && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Agenda</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {meeting.agenda}
                  </p>
                </div>
              )}

              {/* Collaborative Notes Section */}
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

              {/* Summary Section */}
              {meeting.summary && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Summary</h3>
                    <ShareButtons
                      title={meeting.title}
                      summary={meeting.summary}
                      notes={notes}
                      url={window.location.href}
                    />
                  </div>
                  <p className="text-muted-foreground">{meeting.summary}</p>
                </div>
              )}

              {/* Action Items */}
              <div className="space-y-2">
                <h3 className="font-semibold">Action Items</h3>
                <TaskManager meetingId={meetingId} />
              </div>

              {/* Meeting Controls */}
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