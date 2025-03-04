import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, Users, ArrowLeft, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function MeetingDetails() {
  const [, params] = useRoute("/meetings/:id");
  const meetingId = params?.id;
  const queryClient = useQueryClient();

  const { data: meeting, isLoading, error } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${meetingId}`],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!meetingId,
  });

  const generateSummary = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/summarize`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      toast({
        title: "Summary Generated",
        description: "Meeting summary has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate meeting summary.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold mb-2">Meeting not found</h2>
            <p className="text-muted-foreground mb-4">
              The meeting you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/meetings">
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
          <Link href="/meetings">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Meetings
            </Button>
          </Link>
          {meeting.notes && !meeting.summary && (
            <Button 
              onClick={() => generateSummary.mutate()}
              disabled={generateSummary.isPending}
              className="gap-2"
            >
              {generateSummary.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generate Summary
            </Button>
          )}
        </div>

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

              {meeting.notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{meeting.notes}</p>
                </div>
              )}

              {meeting.summary && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Summary</h3>
                  <p className="text-muted-foreground">{meeting.summary}</p>
                </div>
              )}

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
