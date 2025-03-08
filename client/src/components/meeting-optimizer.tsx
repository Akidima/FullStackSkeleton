import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Users, Calendar, Zap } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OptimizationSuggestion {
  type: 'duration' | 'schedule' | 'participants' | 'efficiency';
  suggestion: string;
  confidence: number;
  reasoning: string;
}

const suggestionIcons = {
  duration: Clock,
  schedule: Calendar,
  participants: Users,
  efficiency: Zap,
};

export function MeetingOptimizer() {
  const { data: suggestions = [], isLoading, error } = useQuery({
    queryKey: ['/api/meetings/optimization-suggestions'],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing Meetings...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <LoadingSpinner size="large" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load optimization suggestions. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Meeting Optimization Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion: OptimizationSuggestion, index: number) => {
            const Icon = suggestionIcons[suggestion.type];
            return (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{suggestion.suggestion}</h3>
                  </div>
                  <Badge variant="outline">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {suggestion.reasoning}
                </p>
              </div>
            );
          })}

          {suggestions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No optimization suggestions at this time. Keep scheduling meetings to receive personalized recommendations.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
