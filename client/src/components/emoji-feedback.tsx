import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiOption {
  emoji: string;
  label: string;
  value: string;
}

const emojiOptions: EmojiOption[] = [
  { emoji: '😊', label: 'Very Happy', value: 'very_happy' },
  { emoji: '🙂', label: 'Happy', value: 'happy' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😕', label: 'Unhappy', value: 'unhappy' },
  { emoji: '😢', label: 'Very Unhappy', value: 'very_unhappy' }
];

interface EmojiFeedbackProps {
  meetingId: number;
}

export function EmojiFeedback({ meetingId }: EmojiFeedbackProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation({
    mutationFn: async (sentiment: string) => {
      const response = await fetch(`/api/meetings/${meetingId}/sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentiment }),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter || 'a few'} seconds.`);
      }

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings', meetingId] });
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback!',
      });
    },
    onError: (error: Error) => {
      const isRateLimit = error.message.includes('Rate limit exceeded');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: isRateLimit 
          ? error.message 
          : 'Failed to submit feedback. Please try again.',
      });
    },
    retry: (failureCount, error: any) => {
      // Don't retry on rate limit errors
      if (error.message.includes('Rate limit exceeded')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000), // Exponential backoff
  });

  const handleEmojiSelect = (value: string) => {
    setSelectedEmoji(value);
    feedbackMutation.mutate(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">How was this meeting?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-4">
          <AnimatePresence>
            {emojiOptions.map((option) => (
              <motion.div
                key={option.value}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  className={`text-4xl p-2 ${
                    selectedEmoji === option.value ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleEmojiSelect(option.value)}
                  title={option.label}
                  disabled={feedbackMutation.isPending}
                >
                  {option.emoji}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}