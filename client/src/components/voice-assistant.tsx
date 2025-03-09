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

let recognizer: speechCommands.SpeechCommandRecognizer | null = null;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const lastRequestTime = useRef<number>(0);
  const rateLimitBackoff = useRef<number>(1000); // Start with 1 second
  const MAX_BACKOFF = 60000; // Maximum backoff of 60 seconds

  useEffect(() => {
    let cleanup = false;
    let backoffTimeout: NodeJS.Timeout;

    async function initializeVoiceRecognition() {
      try {
        // Check rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime.current;

        if (isRateLimited && timeSinceLastRequest < rateLimitBackoff.current) {
          const waitTime = Math.ceil((rateLimitBackoff.current - timeSinceLastRequest) / 1000);
          setLoadingStatus(`Rate limited. Waiting ${waitTime} seconds...`);
          return;
        }

        lastRequestTime.current = now;
        setIsRateLimited(false);
        rateLimitBackoff.current = 1000; // Reset backoff on successful request

        console.log("Starting voice recognition initialization");
        setLoadingStatus("Initializing TensorFlow.js");

        await tf.ready();
        console.log("TensorFlow.js initialized with backend:", tf.getBackend());

        if (!recognizer) {
          setLoadingStatus("Creating speech recognition model");
          console.log("Creating speech commands recognizer");

          recognizer = await speechCommands.create(
            'BROWSER_FFT',
            undefined,
            {
              vocabulary: '18w',
              includeSpectogram: false,
              invokeCallbackOnNoiseAndUnknown: false
            }
          );
        }

        setLoadingStatus("Loading speech model");
        await recognizer.ensureModelLoaded();

        if (!cleanup) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);

          toast({
            title: "Voice Assistant Ready",
            description: "Voice commands are now available.",
          });
        }
      } catch (error) {
        console.error("Voice recognition initialization error:", error);

        // Handle rate limiting
        if (error instanceof Error && error.message.includes('429')) {
          setIsRateLimited(true);
          rateLimitBackoff.current = Math.min(rateLimitBackoff.current * 2, MAX_BACKOFF);
          const waitTime = Math.ceil(rateLimitBackoff.current / 1000);

          setInitError(`Too many requests. Retrying in ${waitTime} seconds...`);

          if (!cleanup) {
            backoffTimeout = setTimeout(() => {
              setInitError(null);
              setIsModelLoaded(false);
              initializeVoiceRecognition();
            }, rateLimitBackoff.current);
          }

          return;
        }

        // Handle other errors
        let errorMessage = "Failed to initialize voice recognition. ";
        if (error instanceof Error) {
          if (error.message.includes('WebGL')) {
            errorMessage += "Your browser may not support WebGL. Try using a different browser.";
          } else if (error.message.includes('Audio')) {
            errorMessage += "Could not access microphone. Please check your browser permissions.";
          } else {
            errorMessage += "Please check console for details and try refreshing.";
          }
        }

        setInitError(errorMessage);
        setLoadingStatus("");

        toast({
          title: "Voice Assistant Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }

    if (isActive && !isModelLoaded && !initError) {
      initializeVoiceRecognition();
    }

    return () => {
      cleanup = true;
      clearTimeout(backoffTimeout);
      if (recognizer) {
        recognizer.stopListening();
      }
    };
  }, [isActive, isModelLoaded, initError, isRateLimited]);

  const toggleRecording = async () => {
    if (!isModelLoaded || !recognizer) {
      toast({
        title: "Not Ready",
        description: "Voice recognition is still initializing.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isRecording) {
        await recognizer.stopListening();
        setIsRecording(false);
        toast({
          title: "Recording Stopped",
          description: "Voice recognition paused.",
        });
      } else {
        await recognizer.listen(
          result => {
            const scores = result.scores as Float32Array;
            const maxScore = Math.max(...Array.from(scores));
            const maxScoreIndex = scores.indexOf(maxScore);
            const command = recognizer?.wordLabels()[maxScoreIndex];

            if (command && maxScore > 0.75) {
              console.log(`Recognized command: ${command} with confidence: ${maxScore}`);
              setTranscript(prev => [...prev, command]);
              onTranscript?.(command);
              onCommand?.(command);

              // Announce command for screen readers
              const announcement = document.createElement('div');
              announcement.setAttribute('aria-live', 'polite');
              announcement.textContent = `Command recognized: ${command}`;
              document.body.appendChild(announcement);
              setTimeout(() => announcement.remove(), 1000);
            }
          },
          {
            includeSpectrogram: false,
            probabilityThreshold: 0.75,
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
      console.error("Error toggling recording:", error);
      setIsRecording(false);
      toast({
        title: "Error",
        description: "Failed to toggle voice recognition.",
        variant: "destructive",
      });
    }
  };

  if (!isActive) return null;

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
              {loadingStatus}
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