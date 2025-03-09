import { useState, useRef, useEffect } from "react";
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

// Cache for the speech command recognizer
let globalRecognizer: speechCommands.SpeechCommandRecognizer | null = null;
let modelLoadPromise: Promise<void> | null = null;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastRequestTime = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 10000; // 10 seconds
  const MAX_RETRY_DELAY = 60000; // 1 minute

  useEffect(() => {
    let cleanup = false;
    let retryTimeout: NodeJS.Timeout;

    const initializeRecognizer = async () => {
      try {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime.current;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        lastRequestTime.current = Date.now();

        if (globalRecognizer) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          return;
        }

        if (modelLoadPromise) {
          await modelLoadPromise;
          if (globalRecognizer) {
            setIsModelLoaded(true);
            setLoadingStatus("");
            setInitError(null);
            return;
          }
        }

        setLoadingStatus("Initializing voice recognition system...");

        modelLoadPromise = (async () => {
          await tf.setBackend('webgl');
          await tf.ready();

          const recognizer = await speechCommands.create('BROWSER_FFT');
          await recognizer.ensureModelLoaded();
          globalRecognizer = recognizer;
        })();

        await modelLoadPromise;
        modelLoadPromise = null;

        if (!cleanup) {
          const processResult = (result: speechCommands.SpeechCommandRecognizerResult) => {
            const now = Date.now();
            if (now - lastRequestTime.current < MIN_REQUEST_INTERVAL) return;
            lastRequestTime.current = now;

            const scores = result.scores as Float32Array;
            const maxScore = Math.max(...Array.from(scores));
            const maxScoreIndex = scores.indexOf(maxScore);
            const command = globalRecognizer?.wordLabels()[maxScoreIndex];

            if (command && maxScore > 0.75) {
              setTranscript(prev => [...prev, command]);
              onTranscript?.(command);

              if (['go', 'stop', 'yes', 'no'].includes(command)) {
                onCommand?.(command);
              }
            }
          };

          if (globalRecognizer) {
            await globalRecognizer.listen(
              processResult,
              {
                probabilityThreshold: 0.75,
                invokeCallbackOnNoiseAndUnknown: false,
                overlapFactor: 0.9
              }
            );
          }

          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          setRetryCount(0);
          toast({
            title: "Voice Assistant Ready",
            description: "Voice commands are now available. You can use commands like 'go', 'stop', 'yes', and 'no'.",
          });
        }
      } catch (error: unknown) {
        console.error('Failed to initialize voice assistant:', error);

        globalRecognizer = null;
        modelLoadPromise = null;

        if (!cleanup) {
          const shouldRetry = retryCount < MAX_RETRIES;
          const isRateLimitError = error instanceof Error && 
            (error.message.includes('429') || error.message.includes('Too Many Requests'));

          const backoffDelay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
            MAX_RETRY_DELAY
          );

          setInitError(
            isRateLimitError
              ? `Voice recognition temporarily unavailable. Will retry in ${Math.round(backoffDelay / 1000)} seconds.`
              : shouldRetry 
                ? `Voice assistant initialization failed. Retrying in ${Math.round(backoffDelay / 1000)} seconds...` 
                : 'Unable to start voice recognition. Please try again later.'
          );
          setLoadingStatus("");

          if (shouldRetry) {
            retryTimeout = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setInitError(null);
              setIsModelLoaded(false);
            }, backoffDelay);
          }

          toast({
            title: "Voice Assistant Error",
            description: isRateLimitError
              ? `Service temporarily unavailable. Will retry in ${Math.round(backoffDelay / 1000)} seconds.`
              : shouldRetry 
                ? "Voice recognition failed to start. Retrying..." 
                : "Voice recognition unavailable. Please try again later.",
            variant: "destructive",
          });
        }
      }
    };

    if (isActive && !isModelLoaded && !initError) {
      initializeRecognizer();
    }

    return () => {
      cleanup = true;
      clearTimeout(retryTimeout);
      if (isRecording && globalRecognizer) {
        globalRecognizer.stopListening();
      }
    };
  }, [isActive, isModelLoaded, initError, retryCount, onCommand, onTranscript]);

  const startRecording = async () => {
    if (!isModelLoaded || !globalRecognizer) {
      toast({
        title: "Voice Assistant Not Ready",
        description: "Please wait for the voice recognition system to initialize.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      toast({
        title: "Voice Recognition Active",
        description: "Listening for voice commands: 'go', 'stop', 'yes', 'no'",
      });
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      toast({
        title: "Error",
        description: "Could not start voice recognition. Please try again.",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (globalRecognizer) {
      setIsRecording(false);
      toast({
        title: "Voice Recognition Stopped",
        description: "Voice command recognition has been paused.",
      });
    }
  };

  if (!isActive) return null;

  if (initError) {
    return (
      <Card role="alert" aria-live="polite">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Mic className="h-5 w-5" aria-hidden="true" />
            Voice Assistant Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{initError}</p>
          {(retryCount >= MAX_RETRIES || initError.includes('Too many requests')) && (
            <Button
              onClick={() => {
                setRetryCount(0);
                setInitError(null);
                setIsModelLoaded(false);
              }}
              variant="outline"
              className="mt-4"
              aria-label="Retry voice assistant initialization"
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!isModelLoaded) {
    return (
      <Card role="status" aria-live="polite">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Initializing Voice Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {loadingStatus || "Please wait while the voice recognition system initializes..."}
            {retryCount > 0 && ` (Attempt ${retryCount + 1}/${MAX_RETRIES})`}
          </p>
        </CardContent>
      </Card>
    );
  }

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
          {isProcessing && (
            <Badge variant="secondary" className="ml-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" aria-hidden="true" />
              Processing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            className="w-full"
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

          {transcript.length > 0 && (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4" role="log" aria-label="Voice command history">
              <div className="space-y-2">
                {transcript.map((text, index) => (
                  <p key={index} className="text-sm">
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