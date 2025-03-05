import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Smile,
  Frown,
  Meh,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2
} from "lucide-react";

interface MoodTrackerProps {
  meetingId: number;
}

export function MoodTracker({ meetingId }: MoodTrackerProps) {
  const [overallSentiment, setOverallSentiment] = useState<string>("neutral");
  const [confidenceScore, setConfidenceScore] = useState(0);

  const { data: moods = [], isLoading } = useQuery({
    queryKey: [`/api/meetings/${meetingId}/moods`],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  useEffect(() => {
    if (moods.length > 0) {
      // Calculate overall sentiment based on most recent moods
      const recentMoods = moods.slice(-5);
      const sentimentCounts = recentMoods.reduce((acc, mood) => {
        acc[mood.sentiment] = (acc[mood.sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dominantSentiment = Object.entries(sentimentCounts)
        .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

      setOverallSentiment(dominantSentiment);

      // Calculate average confidence
      const avgConfidence = recentMoods.reduce((sum, mood) => sum + mood.confidence, 0) / recentMoods.length;
      setConfidenceScore(avgConfidence);
    }
  }, [moods]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <Smile className="h-6 w-6 text-green-500" />;
      case "negative":
        return <Frown className="h-6 w-6 text-red-500" />;
      default:
        return <Meh className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getTrendIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getEmotionLabels = () => {
    if (!moods.length) return [];
    return Array.from(new Set(moods.flatMap(mood => mood.moodLabels))).slice(0, 5);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-32 w-full bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-normal">
          Meeting Mood Tracker
        </CardTitle>
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Current Mood Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSentimentIcon(overallSentiment)}
              <span className="font-medium capitalize">{overallSentiment} Mood</span>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              {getTrendIcon(overallSentiment)}
              <span>{Math.round(confidenceScore)}% confidence</span>
            </Badge>
          </div>

          {/* Confidence Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence Score</span>
              <span className="font-medium">{Math.round(confidenceScore)}%</span>
            </div>
            <Progress value={confidenceScore} className="h-2" />
          </div>

          {/* Detected Emotions */}
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Detected Emotions</span>
            <div className="flex flex-wrap gap-2">
              {getEmotionLabels().map((emotion, index) => (
                <Badge key={index} variant="outline">
                  {emotion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Recent Mood Timeline */}
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Recent Updates</span>
            <div className="space-y-2">
              {moods.slice(-3).map((mood, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(mood.sentiment)}
                    <span className="capitalize">{mood.sentiment}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(mood.timestamp), "HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
