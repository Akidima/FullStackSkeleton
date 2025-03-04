import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Meeting } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { MeetingCardSkeleton } from "@/components/ui/loading-skeleton";

export default function Dashboard() {
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
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

  // Calculate completion metrics
  const completedMeetings = meetings.filter(m => m.isCompleted).length;
  const completionRate = meetings.length ? (completedMeetings / meetings.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <Link href="/meetings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
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
              <div className="text-3xl font-bold">0</div>
              <Progress value={0} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-2">
                0 completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-sm text-muted-foreground mt-2">
                No upcoming meetings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}