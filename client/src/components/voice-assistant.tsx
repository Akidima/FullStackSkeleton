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
const INITIAL_DELAY = 5000; // 5 seconds
const MAX_DELAY = 60000; // 1 minute
const MAX_RETRIES = 3;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const lastAttemptTime = useRef(0);

  useEffect(() => {
    let cleanup = false;
    let retryTimeout: NodeJS.Timeout;

    async function initializeModel() {
      try {
        // Check if we're rate limited
        const now = Date.now();
        const timeSinceLastAttempt = now - lastAttemptTime.current;
        const currentDelay = Math.min(INITIAL_DELAY * Math.pow(2, retryCount.current), MAX_DELAY);

        if (timeSinceLastAttempt < currentDelay) {
          const waitTime = Math.ceil((currentDelay - timeSinceLastAttempt) / 1000);
          setLoadingStatus(`Waiting ${waitTime} seconds before retrying...`);
          if (!cleanup) {
            retryTimeout = setTimeout(() => initializeModel(), currentDelay - timeSinceLastAttempt);
          }
          return;
        }

        lastAttemptTime.current = now;
        setLoadingStatus("Initializing TensorFlow.js...");

        // Initialize TensorFlow with minimal configuration
        await tf.ready();
        console.log("TensorFlow.js initialized with backend:", tf.getBackend());

        // Use cached model if available
        if (modelCache) {
          console.log("Using cached model");
          if (!cleanup) {
            setIsModelLoaded(true);
            setLoadingStatus("");
            setInitError(null);
            retryCount.current = 0;
          }
          return;
        }

        // Create new model with minimal configuration
        setLoadingStatus("Creating speech model...");
        const recognizer = await speechCommands.create(
          'BROWSER_FFT',
          undefined,
          {
            probabilityThreshold: 0.85,
            invokeCallbackOnNoiseAndUnknown: false
          }
        );

        await recognizer.ensureModelLoaded();
        modelCache = recognizer;

        if (!cleanup) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
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
        const isRateLimit = errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many requests');

        if (isRateLimit && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          const delay = Math.min(INITIAL_DELAY * Math.pow(2, retryCount.current), MAX_DELAY);
          const waitTime = Math.ceil(delay / 1000);

          setInitError(`Rate limited. Retrying in ${waitTime} seconds...`);
          setLoadingStatus("");

          if (!cleanup) {
            retryTimeout = setTimeout(() => {
              setInitError(null);
              initializeModel();
            }, delay);
          }
        } else {
          setInitError("Could not initialize voice recognition. Please try again later.");
          setLoadingStatus("");
          retryCount.current = 0;
        }
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
  }, [isActive]);

  const toggleRecording = async () => {
    if (!isModelLoaded || !modelCache) {
      toast({
        title: "Not Ready",
        description: "Voice recognition is still initializing.",
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
            probabilityThreshold: 0.85,
            invokeCallbackOnNoiseAndUnknown: false,
            overlapFactor: 0.5
          }
        );
        setIsRecording(true);
        toast({
          title: "Recording Started",
          description: "Listening for voice commands.",
        });
      }
    } catch (error) {
      console.error("Failed to toggle recording:", error);
      setIsRecording(false);
      toast({
        title: "Error",
        description: "Failed to toggle voice recognition.",
        variant: "destructive",
      });
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
              {loadingStatus}
            </div>
          ) : (
            <Button
              onClick={toggleRecording}
              variant={isRecording ? "destructive" : "default"}
              className="w-full"
              disabled={!isModelLoaded}
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