import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as tf from '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';
import { useWebSocketManager } from "@/hooks/use-websocket-manager";

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  onTranscript?: (transcript: string) => void;
  isActive?: boolean;
}

// Simple global cache
let globalRecognizer: speechCommands.SpeechCommandRecognizer | null = null;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastRequestTime = useRef<number>(0);
  const MAX_RETRIES = 3;

  // WebSocket manager for remote command processing
  const wsManager = useWebSocketManager({
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'voice_command_processed') {
          onCommand?.(data.command);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  });

  useEffect(() => {
    let cleanup = false;
    let retryTimeout: NodeJS.Timeout;

    const initializeRecognizer = async () => {
      try {
        setLoadingStatus("Initializing TensorFlow.js...");
        console.log("Starting TensorFlow initialization...");

        // Initialize TensorFlow.js
        await tf.ready();
        console.log("TensorFlow.js initialized");

        // Create recognizer with basic configuration
        setLoadingStatus("Creating speech recognition model...");
        console.log("Creating speech commands recognizer...");

        const recognizer = await speechCommands.create(
          'BROWSER_FFT',
          undefined,
          {
            vocabulary: '18w', // Use the default 18-word vocabulary
            probabilityThreshold: 0.75
          }
        );

        console.log("Speech commands recognizer created");
        setLoadingStatus("Loading model...");

        await recognizer.ensureModelLoaded();
        console.log("Model loaded successfully");

        // Store in global cache
        globalRecognizer = recognizer;

        if (!cleanup) {
          // Configure the recognizer
          await recognizer.listen(
            async (result) => {
              try {
                const scores = result.scores as Float32Array;
                const maxScore = Math.max(...Array.from(scores));
                const maxScoreIndex = scores.indexOf(maxScore);
                const command = recognizer.wordLabels()[maxScoreIndex];

                if (command && maxScore > 0.75) {
                  console.log('Recognized command:', command, 'with confidence:', maxScore);
                  setTranscript(prev => [...prev, command]);
                  onTranscript?.(command);
                  onCommand?.(command);
                }
              } catch (error) {
                console.error('Error processing voice command:', error);
              }
            },
            {
              probabilityThreshold: 0.75,
              overlapFactor: 0.5
            }
          );

          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          console.log("Voice assistant initialization complete");

          toast({
            title: "Voice Assistant Ready",
            description: "Voice commands are now available.",
          });
        }
      } catch (error) {
        console.error('Voice assistant initialization failed:', error);
        globalRecognizer = null;

        if (!cleanup) {
          const shouldRetry = retryCount < MAX_RETRIES;
          setInitError(
            shouldRetry 
              ? `Voice assistant initialization failed. Retrying in 5 seconds...` 
              : 'Unable to start voice recognition. Please try again later.'
          );

          if (shouldRetry) {
            retryTimeout = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setInitError(null);
              setIsModelLoaded(false);
            }, 5000);
          }

          toast({
            title: "Voice Assistant Error",
            description: "Failed to initialize voice recognition. Retrying...",
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
      if (globalRecognizer) {
        globalRecognizer.stopListening();
      }
    };
  }, [isActive, isModelLoaded, initError, retryCount, onCommand, onTranscript]);

  const startRecording = async () => {
    if (!isModelLoaded || !globalRecognizer) {
      toast({
        title: "Voice Assistant Not Ready",
        description: "Please wait for initialization to complete.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      toast({
        title: "Voice Recognition Active",
        description: "Listening for voice commands.",
      });
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (globalRecognizer) {
      globalRecognizer.stopListening();
      setIsRecording(false);
      toast({
        title: "Voice Recognition Stopped",
        description: "Voice recognition paused.",
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
          {initError ? (
            <div className="text-destructive text-sm mb-4">
              {initError}
            </div>
          ) : !isModelLoaded ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingStatus || "Initializing..."}
            </div>
          ) : (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
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