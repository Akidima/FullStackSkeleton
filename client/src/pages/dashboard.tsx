import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, Users, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Meeting } from "@shared/schema";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MeetingCardSkeleton } from "@/components/ui/loading-skeleton";

interface ActionItem {
  text: string;
  status: 'completed' | 'pending';
  meeting: Meeting;
}

export default function Dashboard() {
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data || [];
    },
  });

  // Sort meetings by date
  const upcomingMeetings = meetings
    .filter(meeting => new Date(meeting.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Extract action items from meetings
  const actionItems = meetings.flatMap(meeting => {
    if (!meeting.notes) return [];
    return meeting.notes
      .split('\n')
      .filter(line => line.toLowerCase().includes('action:'))
      .map(line => ({
        text: line.replace(/^action:/i, '').trim(),
        status: Math.random() > 0.5 ? 'completed' : 'pending', // This should come from your backend
        meeting: meeting
      }));
  }).slice(0, 5);

  // Calculate completion metrics
  const completedMeetings = meetings.filter(m => m.isCompleted).length;
  const completionRate = meetings.length ? (completedMeetings / meetings.length) * 100 : 0;

  if (meetingsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <MeetingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Link href="/meetings/new">
            <Button>Schedule Meeting</Button>
          </Link>
        </div>

        {/* Metrics Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{meetings.length}</div>
              <Progress value={completionRate} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {completedMeetings} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{actionItems.length}</div>
              <Progress 
                value={actionItems.filter(item => item.status === 'completed').length / actionItems.length * 100} 
                className="mt-2" 
              />
              <p className="text-sm text-muted-foreground mt-2">
                {actionItems.filter(item => item.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{upcomingMeetings.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Next meeting in {upcomingMeetings[0] ? 
                  format(new Date(upcomingMeetings[0].date), 'dd MMM') : 
                  'No upcoming meetings'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Meetings Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your next scheduled meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{meeting.title || "Untitled Meeting"}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4" />
                          {format(new Date(meeting.date), "PPP 'at' p")}
                        </div>
                      </div>
                      <Link href={`/meetings/${meeting.id}`}>
                        <Button variant="ghost" size="sm">
                          View <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming meetings scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Items Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Track your meeting action items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {actionItems.length > 0 ? (
                  actionItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <p className="font-medium">{item.text}</p>
                        </div>
                        <Link href={`/meetings/${item.meeting.id}`}>
                          <p className="text-sm text-muted-foreground hover:underline">
                            From: {item.meeting.title || "Untitled Meeting"}
                          </p>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No action items found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}