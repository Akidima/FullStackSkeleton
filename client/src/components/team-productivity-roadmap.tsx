import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/loading-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { showErrorToast, withRetry } from '@/lib/error-toast';

interface Milestone {
  id: number;
  title: string;
  dueDate: string;
  progress: number;
  status: 'pending' | 'in-progress' | 'completed';
}

const progressColors = {
  pending: '#94a3b8',
  'in-progress': '#3b82f6',
  completed: '#22c55e',
};

export function TeamProductivityRoadmap() {
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  // Query with enhanced caching and retry logic
  const { data: milestones = [], isLoading, error } = useQuery<Milestone[]>({
    queryKey: ['/api/team/productivity/milestones'],
    queryFn: async () => {
      return await withRetry(async () => {
        const response = await fetch('/api/team/productivity/milestones', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded');
          }
          throw new Error('Failed to fetch milestones');
        }
        return response.json();
      }, 5, 1000); // 5 retries, starting with 1s delay
    },
    staleTime: 60000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      // Don't retry on 404s
      if (error?.status === 404) return false;
      // Retry up to 5 times
      return failureCount < 5;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    const isRateLimit = error instanceof Error && error.message === 'Rate limit exceeded';

    return (
      <Alert variant={isRateLimit ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isRateLimit
            ? 'Too many requests. Please wait a moment before trying again.'
            : 'Failed to load productivity data. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Productivity Roadmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Main roadmap line */}
          <motion.div
            className="absolute left-1/2 top-0 w-1 h-full bg-muted"
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 1 }}
          />

          {/* Milestones */}
          <div className="space-y-12 relative">
            <AnimatePresence mode="wait">
              {milestones.map((milestone: Milestone, index: number) => (
                <motion.div
                  key={milestone.id}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  layout
                >
                  {/* Left side content */}
                  <div className="flex-1 text-right">
                    <h3 className="font-medium">{milestone.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Milestone marker */}
                  <motion.div
                    className="relative z-10 w-6 h-6 rounded-full cursor-pointer"
                    style={{ backgroundColor: progressColors[milestone.status] }}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => setSelectedMilestone(milestone.id)}
                  >
                    {/* Progress indicator */}
                    <motion.div
                      className="absolute bottom-full left-1/2 w-1 bg-primary"
                      style={{ 
                        height: `${milestone.progress}%`,
                        transformOrigin: 'bottom' 
                      }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 1, delay: index * 0.3 }}
                    />
                  </motion.div>

                  {/* Right side content */}
                  <div className="flex-1">
                    <motion.div
                      className="h-2 bg-muted rounded-full overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1, delay: index * 0.3 }}
                    >
                      <motion.div
                        className="h-full"
                        style={{ 
                          backgroundColor: progressColors[milestone.status],
                          width: `${milestone.progress}%`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${milestone.progress}%` }}
                        transition={{ duration: 1, delay: index * 0.4 }}
                      />
                    </motion.div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {milestone.progress}% Complete
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}