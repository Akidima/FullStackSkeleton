import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, TrendingUp, Book, AlertCircle } from "lucide-react";
import type { MeetingInsight } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";

interface MeetingInsightsProps {
  meetingId?: number;
  isNewMeeting?: boolean;
}

export function MeetingInsights({ meetingId, isNewMeeting }: MeetingInsightsProps) {
  const { data: insights, isLoading } = useQuery<MeetingInsight[]>({
    queryKey: meetingId ? [`/api/meetings/${meetingId}/insights`] : ['/api/insights/recommendations'],
    enabled: isNewMeeting || !!meetingId,
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'policy':
        return <Book className="h-4 w-4" />;
      case 'historical':
        return <TrendingUp className="h-4 w-4" />;
      case 'best_practice':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'policy':
        return 'bg-blue-500/10 text-blue-500';
      case 'historical':
        return 'bg-green-500/10 text-green-500';
      case 'best_practice':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Loading Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {isNewMeeting ? "Smart Recommendations" : "Meeting Insights"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {insights?.map((insight) => (
              <div
                key={insight.id}
                className="p-4 rounded-lg border bg-card text-card-foreground"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="secondary"
                        className={`flex items-center gap-1 ${getCategoryColor(insight.category)}`}
                      >
                        {getCategoryIcon(insight.category)}
                        {insight.category.replace('_', ' ')}
                      </Badge>
                      {insight.relevanceScore >= 8 && (
                        <Badge variant="default" className="bg-orange-500">
                          High Impact
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{insight.insight}</p>
                    {insight.source && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Source: {insight.source}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
