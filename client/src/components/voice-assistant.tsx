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
  const MIN_REQUEST_INTERVAL = 5000; // Increase to 5 seconds between requests
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 10000; // Increase initial retry delay to 10 seconds
  const MAX_RETRY_DELAY = 60000; // Maximum delay of 1 minute

  useEffect(() => {
    let cleanup = false;
    let retryTimeout: NodeJS.Timeout;

    const initializeRecognizer = async () => {
      try {
        // Check if we need to wait before making another request
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime.current;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        lastRequestTime.current = Date.now();

        // Use cached recognizer if available
        if (globalRecognizer) {
          console.log('Using cached speech command recognizer');
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          return;
        }

        // Use cached loading promise if one is in progress
        if (modelLoadPromise) {
          console.log('Waiting for existing model load to complete');
          await modelLoadPromise;
          if (globalRecognizer) {
            setIsModelLoaded(true);
            setLoadingStatus("");
            setInitError(null);
            return;
          }
        }

        console.log('Starting voice assistant initialization...');
        setLoadingStatus("Initializing TensorFlow.js...");

        modelLoadPromise = (async () => {
          // Initialize TensorFlow.js with WebGL backend for better performance
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('TensorFlow.js initialized');

          setLoadingStatus("Creating speech command recognizer...");
          const recognizer = speechCommands.create('BROWSER_FFT');
          console.log('Speech command recognizer created');

          setLoadingStatus("Loading speech recognition model...");
          await recognizer.ensureModelLoaded();
          console.log('Model loaded successfully');

          // Store in global cache
          globalRecognizer = recognizer;
        })();

        await modelLoadPromise;
        modelLoadPromise = null;

        if (!cleanup) {
          // Configure the recognizer with rate limiting
          const processResult = (result: speechCommands.SpeechCommandRecognizerResult) => {
            const now = Date.now();
            if (now - lastRequestTime.current < MIN_REQUEST_INTERVAL) return;
            lastRequestTime.current = now;

            const scores = result.scores as Float32Array;
            const maxScore = Math.max(...Array.from(scores));
            const maxScoreIndex = scores.indexOf(maxScore);
            const command = globalRecognizer?.wordLabels()[maxScoreIndex];

            if (command && maxScore > 0.75) {
              console.log('Recognized command:', command, 'with score:', maxScore);
              setTranscript(prev => [...prev, command]);
              onTranscript?.(command);

              if (['go', 'stop', 'yes', 'no'].includes(command)) {
                onCommand?.(command);
              }
            }
          };

          await globalRecognizer?.listen(
            processResult,
            {
              probabilityThreshold: 0.75,
              invokeCallbackOnNoiseAndUnknown: false,
              overlapFactor: 0.9 // Increase overlap factor to reduce processing frequency even more
            }
          );

          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          setRetryCount(0);
          console.log('Voice assistant fully initialized');
          toast({
            title: "Voice Assistant Ready",
            description: "You can now use voice commands",
          });
        }
      } catch (error) {
        console.error('Failed to initialize voice assistant:', error);

        // Clear caches on error
        globalRecognizer = null;
        modelLoadPromise = null;

        if (!cleanup) {
          const shouldRetry = retryCount < MAX_RETRIES;
          const isRateLimitError = error.toString().includes('429') || 
                                 error.toString().includes('Too Many Requests');

          // Calculate exponential backoff with maximum delay
          const backoffDelay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
            MAX_RETRY_DELAY
          );

          setInitError(
            isRateLimitError
              ? `Too many requests. Will retry in ${Math.round(backoffDelay / 1000)} seconds.`
              : shouldRetry 
                ? `Initialization failed. Retrying in ${Math.round(backoffDelay / 1000)} seconds...` 
                : 'Failed to initialize voice assistant. Please try again later.'
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
            title: "Error",
            description: isRateLimitError
              ? `Too many requests. Will retry in ${Math.round(backoffDelay / 1000)} seconds.`
              : shouldRetry 
                ? "Failed to initialize voice assistant. Retrying..." 
                : "Too many requests. Please try again later.",
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
        title: "Error",
        description: "Voice assistant is not ready yet. Please wait.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Listening for voice commands...",
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (globalRecognizer) {
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Processing complete.",
      });
    }
  };

  if (!isActive) return null;

  if (initError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Mic className="h-5 w-5" />
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Initializing Voice Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {loadingStatus || "Please wait..."}
            {retryCount > 0 && ` (Attempt ${retryCount + 1}/${MAX_RETRIES})`}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRecording ? (
            <Mic className="h-5 w-5 text-red-500 animate-pulse" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          Voice Assistant
          {isProcessing && (
            <Badge variant="secondary" className="ml-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
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
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>

          {transcript.length > 0 && (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
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