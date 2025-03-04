import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Plus, Loader2, Users, CheckCircle2, Clock, Search } from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function MeetingList() {
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredMeetings = meetings.filter(meeting => 
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Meeting list error:", error);
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
    </div>
  );
}