import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Plus, Users, CheckCircle2, Clock, Search, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MeetingCardSkeleton } from "@/components/ui/loading-skeleton";
import { toast } from "@/hooks/use-toast";

export default function MeetingList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading, error } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data || [];
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Meeting Deleted",
        description: "The meeting has been successfully deleted.",
      });
      setMeetingToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredMeetings = meetings.filter(meeting => 
    meeting.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary animate-pulse" />
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <MeetingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4">
        <p className="text-red-500">Error loading meetings</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
            </div>
            <Link href="/meetings/new">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" /> New Meeting
              </Button>
            </Link>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredMeetings.length > 0 ? (
            filteredMeetings.map((meeting) => (
              <Card 
                key={meeting.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-lg border-l-4",
                  meeting.isCompleted ? "border-l-green-500" : "border-l-primary"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className={cn(
                        "text-xl",
                        meeting.isCompleted && "text-muted-foreground"
                      )}>
                        {meeting.title || "Untitled Meeting"}
                      </CardTitle>
                      {meeting.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {meeting.description}
                        </CardDescription>
                      )}
                    </div>
                    {meeting.isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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

                    <div className="flex justify-end gap-2">
                      <Link href={`/meetings/${meeting.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/meetings/${meeting.id}/edit`}>
                        <Button variant="secondary" size="sm">
                          Edit Meeting
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="gap-2"
                        onClick={() => setMeetingToDelete(meeting)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-muted/10 rounded-lg border-2 border-dashed">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meetings Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? "No meetings match your search" : "Get started by creating your first meeting"}
              </p>
              <Link href="/meetings/new">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" /> Schedule Meeting
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting 
              {meetingToDelete?.title && ` "${meetingToDelete.title}"`} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (meetingToDelete) {
                  deleteMutation.mutate(meetingToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}