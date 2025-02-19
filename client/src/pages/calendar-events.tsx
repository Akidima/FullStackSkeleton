import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    date?: string;
  };
  end: {
    dateTime: string;
    date?: string;
  };
  description?: string;
  location?: string;
}

export default function CalendarEvents() {
  const { data: events, isLoading, error } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ["/api/calendar/events"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-2xl mt-8">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Calendar Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error.message}</p>
          {error.message.includes("not authorized") && (
            <a
              href="/auth/google"
              className="text-primary hover:underline mt-4 inline-block"
            >
              Connect Google Calendar
            </a>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Upcoming Calendar Events</h1>
      <div className="grid gap-4">
        {events?.events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.summary}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(event.start.dateTime || event.start.date!),
                    "PPp"
                  )}
                  {" - "}
                  {format(
                    new Date(event.end.dateTime || event.end.date!),
                    "PPp"
                  )}
                </p>
                {event.description && (
                  <p className="text-sm">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground">
                    📍 {event.location}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
