import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Settings } from "lucide-react";
import { TeamProductivityRoadmap } from "@/components/team-productivity-roadmap";
import { MeetingOptimizer } from "@/components/meeting-optimizer";
import { DashboardWidgetConfig } from "@/components/dashboard-widget-config";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// existing interfaces remain unchanged
interface WeeklyMeeting {
  week: string;
  count: number;
}

interface ParticipationData {
  name: string;
  value: number;
}

interface RoomUtilization {
  name: string;
  utilization: number;
}

interface AnalyticsData {
  weeklyMeetings: WeeklyMeeting[];
  totalMeetings: number;
  completedMeetings: number;
}

interface ParticipationResponse {
  participation: ParticipationData[];
}

interface RoomResponse {
  rooms: RoomUtilization[];
}

// Query configuration with improved caching and retry logic
const STALE_TIME = 10 * 60 * 1000; // 10 minutes
const GC_TIME = 60 * 60 * 1000; // 1 hour
const RETRY_DELAY = 10000; // 10 seconds between retries
const MAX_RETRIES = 5;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
  const [showConfig, setShowConfig] = useState(false);

  // Get widget preferences
  const { data: preferences } = useQuery({
    queryKey: ['/api/users/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/users/preferences');
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }
      return response.json();
    }
  });

  const enabledWidgets = preferences?.widgets || [];

  const { data: meetingStats, isLoading: isLoadingStats, error: statsError } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/meetings'],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 60000), // Exponential backoff
    refetchOnWindowFocus: false,
  });

  const { data: participationData, isLoading: isLoadingParticipation, error: participationError } = useQuery<ParticipationResponse>({
    queryKey: ['/api/analytics/participation'],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 60000),
    refetchOnWindowFocus: false,
  });

  const { data: roomUtilization, isLoading: isLoadingRooms, error: roomsError } = useQuery<RoomResponse>({
    queryKey: ['/api/analytics/rooms'],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 60000),
    refetchOnWindowFocus: false,
  });

  const isLoading = isLoadingStats || isLoadingParticipation || isLoadingRooms;
  const hasError = statsError || participationError || roomsError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="large" />
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    const errorMessage = hasError instanceof Error && hasError.message === "Too many requests"
      ? "Analytics data is temporarily unavailable. Please try again in a few minutes."
      : "Failed to load analytics data. Please try again later.";

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isWidgetEnabled = (widgetId: string) => {
    return !enabledWidgets.length || enabledWidgets.find(w => w.id === widgetId)?.enabled;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Meeting Analytics Dashboard</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Customize Dashboard</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <DashboardWidgetConfig />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isWidgetEnabled('meetings-stats') && (
            <Card>
              <CardHeader>
                <CardTitle>Meeting Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={meetingStats?.weeklyMeetings || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {isWidgetEnabled('participation') && (
            <Card>
              <CardHeader>
                <CardTitle>Participation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={participationData?.participation || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(participationData?.participation || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {isWidgetEnabled('room-utilization') && (
            <Card>
              <CardHeader>
                <CardTitle>Room Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomUtilization?.rooms || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="utilization" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {isWidgetEnabled('ai-optimizer') && (
            <div className="col-span-full">
              <MeetingOptimizer />
            </div>
          )}

          {isWidgetEnabled('productivity') && (
            <div className="col-span-full">
              <TeamProductivityRoadmap />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}