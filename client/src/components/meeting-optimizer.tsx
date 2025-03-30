import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Users, Calendar, Zap, Brain } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { withRetry } from '@/lib/error-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface OptimizationSuggestion {
  type: 'duration' | 'schedule' | 'participants' | 'efficiency';
  suggestion: string;
  confidence: number;
  reasoning: string;
}

interface OptimizationResponse {
  suggestions: OptimizationSuggestion[];
}

const suggestionIcons = {
  duration: Clock,
  schedule: Calendar,
  participants: Users,
  efficiency: Zap,
};

const loadingSteps = [
  { id: 1, text: "Initializing AI model..." },
  { id: 2, text: "Analyzing meeting patterns..." },
  { id: 3, text: "Processing participant data..." },
  { id: 4, text: "Generating optimization insights..." }
];

export function MeetingOptimizer() {
  const { data, isLoading, error } = useQuery<OptimizationResponse>({
    queryKey: ['/api/meetings/optimization-suggestions'],
    queryFn: async () => {
      console.log('Fetching optimization suggestions...');
      return await withRetry(async () => {
        try {
          const response = await fetch('/api/meetings/optimization-suggestions', {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          console.log('Optimization API response status:', response.status);

          if (!response.ok) {
            if (response.status === 429) {
              console.error('Rate limit exceeded for optimization API');
              throw new Error('Rate limit exceeded');
            }
            if (response.status === 503) {
              console.error('AI service unavailable for optimization API');
              throw new Error('AI service unavailable');
            }
            console.error('Failed optimization API request with status:', response.status);
            throw new Error('Failed to load optimization suggestions');
          }

          const data = await response.json();
          console.log('Optimization API response data:', data);
          return data;
        } catch (err) {
          console.error('Error in optimization API request:', err);
          throw err;
        }
      }, 5, 2000); // Increased initial retry delay to 2s
    },
    staleTime: 15 * 60 * 1000, // Consider data fresh for 15 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      // Don't retry on certain errors
      if (error?.status === 404) return false;
      if (error?.status === 503) return false; // Don't retry on AI service unavailable
      return failureCount < 7; // Increased max retries
    },
    retryDelay: (attemptIndex) => Math.min(2000 * Math.pow(2, attemptIndex), 60000), // Exponential backoff with higher initial delay
  });

  const suggestions = data?.suggestions || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            AI Analysis in Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {loadingSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: index * 0.5 } 
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center gap-4"
                >
                  <div className="relative">
                    <motion.div
                      className="h-4 w-4 rounded-full bg-primary"
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    {index < loadingSteps.length - 1 && (
                      <motion.div
                        className="absolute top-full left-1/2 w-0.5 bg-primary/50"
                        initial={{ height: 0 }}
                        animate={{ height: 24 }}
                        transition={{ duration: 0.5, delay: index * 0.5 }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.text}</p>
                    <motion.div
                      className="h-1 bg-muted rounded-full mt-2 overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, delay: index * 0.5 }}
                    >
                      <motion.div
                        className="h-full bg-primary"
                        animate={{
                          x: ["-100%", "100%"],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const isRateLimit = error instanceof Error && error.message === 'Rate limit exceeded';
    const isAIUnavailable = error instanceof Error && error.message === 'AI service unavailable';

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isRateLimit
            ? 'Please wait a moment, our AI is processing multiple requests. Try again in a few minutes.'
            : isAIUnavailable
            ? 'AI service is temporarily unavailable. Please try again in a few moments.'
            : 'Failed to load AI optimization suggestions. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Meeting Optimization Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {suggestions.map((suggestion: OptimizationSuggestion, index: number) => {
              const Icon = suggestionIcons[suggestion.type];
              return (
                <motion.div
                  key={index}
                  className="border rounded-lg p-4 space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  layout
                >
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
                </motion.div>
              );
            })}
          </AnimatePresence>

          {suggestions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No optimization suggestions at this time. Keep scheduling meetings to receive personalized AI recommendations.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}