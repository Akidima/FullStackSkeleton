import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as tf from '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  onTranscript?: (transcript: string) => void;
  isActive?: boolean;
}

// Global model cache
let modelCache: speechCommands.SpeechCommandRecognizer | null = null;

// Rate limiting configuration
const INITIAL_DELAY = 2000; // 2 seconds
const MAX_DELAY = 32000; // 32 seconds
const MAX_RETRIES = 5;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const retryCount = useRef(0);
  const lastRequestTime = useRef(0);
  const currentDelay = useRef(INITIAL_DELAY);

  useEffect(() => {
    let cleanup = false;
    let retryTimeout: NodeJS.Timeout;

    async function initializeModel() {
      try {
        // Check if we're rate limited
        const now = Date.now();
        if (isRateLimited && now - lastRequestTime.current < currentDelay.current) {
          const remainingTime = Math.ceil((currentDelay.current - (now - lastRequestTime.current)) / 1000);
          setLoadingStatus(`Rate limited. Waiting ${remainingTime} seconds...`);
          return;
        }

        // Step 1: Check for audio capabilities
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
          throw new Error('Microphone access is required for voice recognition');
        }

        // Step 2: Initialize TensorFlow.js
        setLoadingStatus("Initializing voice recognition...");
        await tf.ready();
        console.log("TensorFlow.js initialized with backend:", tf.getBackend());

        // Step 3: Use cached model or create new one
        if (modelCache && !cleanup) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          setIsRateLimited(false);
          currentDelay.current = INITIAL_DELAY;
          return;
        }

        // Step 4: Create and load model
        const recognizer = await speechCommands.create(
          'BROWSER_FFT',
          undefined,
          {
            invokeCallbackOnNoiseAndUnknown: false,
            probabilityThreshold: 0.85
          }
        );

        await recognizer.ensureModelLoaded();
        modelCache = recognizer;

        if (!cleanup) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          setIsRateLimited(false);
          currentDelay.current = INITIAL_DELAY;
          retryCount.current = 0;

          toast({
            title: "Voice Assistant Ready",
            description: "Voice commands are now available.",
          });
        }
      } catch (error) {
        console.error("Voice recognition initialization error:", error);

        if (cleanup) return;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

        if (isRateLimit) {
          setIsRateLimited(true);
          lastRequestTime.current = Date.now();

          if (retryCount.current < MAX_RETRIES) {
            const delay = Math.min(currentDelay.current * 2, MAX_DELAY);
            currentDelay.current = delay;
            retryCount.current++;

            const waitTime = Math.ceil(delay / 1000);
            setInitError(`Rate limited. Retrying in ${waitTime} seconds...`);

            retryTimeout = setTimeout(() => {
              if (!cleanup) {
                setInitError(null);
                initializeModel();
              }
            }, delay);
          } else {
            setInitError("Too many requests. Please try again later.");
            setIsRateLimited(false);
            currentDelay.current = INITIAL_DELAY;
            retryCount.current = 0;
          }
        } else if (errorMessage.includes('getUserMedia')) {
          setInitError('Please allow microphone access to use voice recognition');
        } else {
          setInitError('Could not initialize voice recognition. Please try again');
        }

        setLoadingStatus("");
        setIsModelLoaded(false);
      }
    }

    if (isActive && !isModelLoaded && !initError) {
      initializeModel();
    }

    return () => {
      cleanup = true;
      clearTimeout(retryTimeout);
      if (modelCache && isRecording) {
        modelCache.stopListening();
      }
    };
  }, [isActive, isRateLimited]);

  const toggleRecording = async () => {
    if (!isModelLoaded || !modelCache || isRateLimited) {
      toast({
        title: "Not Ready",
        description: isRateLimited 
          ? "Please wait for rate limit to expire" 
          : "Voice recognition is still initializing.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isRecording) {
        await modelCache.stopListening();
        setIsRecording(false);
        toast({
          title: "Recording Stopped",
          description: "Voice recognition paused.",
        });
      } else {
        await modelCache.listen(
          (result) => {
            const scores = result.scores as Float32Array;
            const maxScore = Math.max(...Array.from(scores));
            const maxScoreIndex = scores.indexOf(maxScore);
            const command = modelCache?.wordLabels()[maxScoreIndex];

            if (command && maxScore > 0.85) {
              console.log(`Recognized command: ${command} with confidence: ${maxScore}`);
              setTranscript(prev => [...prev, command]);
              onTranscript?.(command);
              onCommand?.(command);

              // Announce for screen readers
              const announcement = document.createElement('div');
              announcement.setAttribute('aria-live', 'polite');
              announcement.textContent = `Command recognized: ${command}`;
              document.body.appendChild(announcement);
              setTimeout(() => announcement.remove(), 1000);
            }
          },
          {
            includeSpectrogram: false,
            probabilityThreshold: 0.85,
            invokeCallbackOnNoiseAndUnknown: false,
            overlapFactor: 0.3 // Reduce overlap to decrease request frequency
          }
        );
        setIsRecording(true);
        toast({
          title: "Recording Started",
          description: "Listening for voice commands.",
        });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      setIsRecording(false);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        setIsRateLimited(true);
        lastRequestTime.current = Date.now();
        currentDelay.current = Math.min(currentDelay.current * 2, MAX_DELAY);

        toast({
          title: "Rate Limited",
          description: `Too many requests. Please wait ${Math.ceil(currentDelay.current / 1000)} seconds.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to toggle voice recognition.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card role="region" aria-label="Voice Assistant Controls">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRecording ? (
            <Mic className="h-5 w-5 text-red-500 animate-pulse" aria-hidden="true" />
          ) : (
            <Mic className="h-5 w-5" aria-hidden="true" />
          )}
          Voice Assistant
          {!isModelLoaded && !initError && (
            <Badge variant="secondary" className="ml-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" aria-hidden="true" />
              {loadingStatus || "Initializing"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {initError ? (
            <div 
              className="text-destructive text-sm" 
              role="alert"
              aria-live="assertive"
            >
              {initError}
            </div>
          ) : !isModelLoaded ? (
            <div 
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {loadingStatus || "Initializing..."}
            </div>
          ) : (
            <Button
              onClick={toggleRecording}
              variant={isRecording ? "destructive" : "default"}
              className="w-full"
              disabled={!isModelLoaded || isRateLimited}
              aria-pressed={isRecording}
              aria-label={isRecording ? "Stop voice recognition" : "Start voice recognition"}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" aria-hidden="true" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" aria-hidden="true" />
                  Start Recording
                </>
              )}
            </Button>
          )}

          {transcript.length > 0 && (
            <ScrollArea 
              className="h-[200px] w-full rounded-md border p-4"
              role="log"
              aria-label="Voice command history"
              aria-live="polite"
            >
              <div className="space-y-2">
                {transcript.map((text, index) => (
                  <p 
                    key={index} 
                    className="text-sm"
                    role="listitem"
                  >
                    {text}
                  </p>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}