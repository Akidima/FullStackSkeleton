import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// Query configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes
const RETRY_DELAY = 5000; // 5 seconds between retries
const MAX_RETRIES = 3;

export default function AnalyticsDashboard() {
  // Configure queries with caching and retry logic
  const { data: meetingStats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['/api/analytics/meetings'],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
    refetchOnWindowFocus: false,
  });

  const { data: participationData, isLoading: isLoadingParticipation, error: participationError } = useQuery({
    queryKey: ['/api/analytics/participation'],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
    refetchOnWindowFocus: false,
  });

  const { data: roomUtilization, isLoading: isLoadingRooms, error: roomsError } = useQuery({
    queryKey: ['/api/analytics/rooms'],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
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
      ? "Too many requests. Please wait a moment and try again."
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Meeting Analytics Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Meeting Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meetingStats?.weeklyMeetings}>
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

          {/* Participation Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Participation Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={participationData?.participation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(participationData?.participation || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Room Utilization */}
          <Card>
            <CardHeader>
              <CardTitle>Room Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roomUtilization?.rooms}>
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
        </div>
      </div>
    </div>
  );
}