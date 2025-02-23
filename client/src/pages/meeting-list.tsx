import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Loader2, Users, CheckCircle2 } from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { SearchBar } from "@/components/SearchBar";
import { OnboardingTooltip } from "@/components/ui/onboarding";

export default function MeetingList() {
  const { data: meetings, isLoading, error } = useQuery<Meeting[]>({ 
    queryKey: ["/api/meetings"],
    retry: 1, // Only retry once on failure
    onError: (error) => {
      console.error("Failed to fetch meetings:", error);
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Meeting Dashboard</h1>
          </div>
          <Link href="/meetings/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Meeting
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {meetings && meetings.length > 0 ? (
            meetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span className={meeting.isCompleted ? "text-muted-foreground" : ""}>
                      {meeting.title}
                    </span>
                    {meeting.isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="inline-block w-4 h-4 mr-2" />
                      {format(new Date(meeting.date), "PPP 'at' p")}
                    </p>
                    {meeting.participants && meeting.participants.length > 0 && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Users className="inline-block w-4 h-4 mr-2" />
                        {meeting.participants.join(", ")}
                      </p>
                    )}
                    {meeting.description && (
                      <p className="text-sm mt-2 text-foreground/80">{meeting.description}</p>
                    )}
                    <div className="flex justify-end space-x-2 mt-4">
                      <Link href={`/meetings/${meeting.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit Meeting
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meetings Yet</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first meeting</p>
              <Link href="/meetings/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Schedule Meeting
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}