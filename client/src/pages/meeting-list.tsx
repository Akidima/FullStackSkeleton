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
  const [searchResults, setSearchResults] = useState<Meeting[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: meetings, isLoading } = useQuery<Meeting[]>({ 
    queryKey: ["/api/meetings"]
  });

  const displayedMeetings = searchResults || meetings;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Meeting Assistant</h1>
          </div>
          <OnboardingTooltip id="new-meeting-button">
            <Link href="/meetings/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Meeting
              </Button>
            </Link>
          </OnboardingTooltip>
        </div>

        <div className="mb-6">
          <OnboardingTooltip id="search-meetings">
            <SearchBar 
              onSearchResults={setSearchResults}
              onSearching={setIsSearching}
            />
          </OnboardingTooltip>
        </div>

        {(isLoading || isSearching) ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <OnboardingTooltip id="calendar-view">
            <div className="grid gap-4">
              {displayedMeetings?.map((meeting) => (
                <Card key={meeting.id}>
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
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="inline-block w-4 h-4 mr-1" />
                        {format(new Date(meeting.date), "PPP")}
                      </p>
                      {meeting.participants && meeting.participants.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          <Users className="inline-block w-4 h-4 mr-1" />
                          {meeting.participants.join(", ")}
                        </p>
                      )}
                      {meeting.description && (
                        <p className="text-sm mt-2">{meeting.description}</p>
                      )}
                      <div className="flex justify-end mt-4">
                        <Link href={`/meetings/${meeting.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit Meeting
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {displayedMeetings?.length === 0 && (
                <p className="text-center text-muted-foreground">
                  {searchResults ? "No matching meetings found" : "No meetings yet"}
                </p>
              )}
            </div>
          </OnboardingTooltip>
        )}
      </div>
    </div>
  );
}