import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Users,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Share2,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { useWebSocket } from "@/hooks/use-websocket";
import { TaskManager } from "@/components/task-manager";
import { ShareButtons } from "@/components/share-buttons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showErrorToast } from "@/lib/error-toast";
import { EmojiFeedback } from "@/components/emoji-feedback"; // Updated import with correct casing

// Rate limiting configuration
const RETRY_DELAY = 1000; // Start with 1 second
const MAX_RETRIES = 3;

// Assumed withRetry function (replace with actual implementation if available)
const withRetry = async (fn, retries = 3, delay = 1000) => {
  let attempts = 0;
  while (attempts < retries) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (attempts === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * (attempts + 1)));
      attempts++;
    }
  }
};

export default function MeetingDetails() {
  const [, params] = useRoute("/meetings/:id");
  const [, setLocation] = useLocation();
  const meetingId = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const socket = useWebSocket();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);

  // Query for meeting details with retry logic
  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${meetingId}`],
    enabled: !!meetingId && !isNaN(meetingId),
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
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

  // Update the deleteMeeting mutation to use the enhanced error handling
  const deleteMeeting = useMutation({
    mutationFn: async () => {
      return await withRetry(async () => {
        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete meeting');
        }

        return response.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });
      setLocation("/"); // Redirect to meetings list
    },
    onError: (error: any) => {
      showErrorToast(error, () => deleteMeeting.mutate());
    },
  });

  // Handle real-time collaborative note changes
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    setIsCollaborating(true);

    // Broadcast note changes to other participants
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
        if (!isCollaborating) {
          setNotes(data.notes);
        }
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
  }, [socket?.socket, meetingId, queryClient, isCollaborating]);

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete Meeting
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the meeting
                  and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMeeting.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMeeting.isPending ? (
                    <>
                      <LoadingSpinner size="small" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Meeting"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

              {/* Emoji Feedback Section */}
              {meetingId && (
                <div className="mt-6">
                  <EmojiFeedback meetingId={meetingId} />
                </div>
              )}

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