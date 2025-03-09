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

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const initAttempts = useRef(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    let cleanup = false;
    let initTimeout: NodeJS.Timeout;

    async function checkBrowserSupport() {
      // Check audio capabilities
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported in your browser');
      }

      // Check for audio permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        throw new Error('Microphone access is required for voice recognition');
      }

      // Check WebGL support
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          throw new Error('WebGL is not supported in your browser');
        }
      } catch (error) {
        throw new Error('WebGL is not supported in your browser');
      }
    }

    async function initializeModel() {
      try {
        // Step 1: Check browser capabilities
        setLoadingStatus("Checking browser capabilities...");
        await checkBrowserSupport();

        // Step 2: Initialize TensorFlow.js
        setLoadingStatus("Initializing TensorFlow.js...");
        console.log("Starting TensorFlow initialization...");

        // Let TensorFlow choose the best backend
        await tf.ready();
        const backend = tf.getBackend();
        console.log("TensorFlow.js initialized with backend:", backend);

        // Step 3: Use cached model or create new one
        if (modelCache) {
          console.log("Using cached model");
          if (!cleanup) {
            setIsModelLoaded(true);
            setLoadingStatus("");
            setInitError(null);
          }
          return;
        }

        // Step 4: Create and load model
        setLoadingStatus("Creating speech recognition model...");
        console.log("Creating speech commands recognizer");

        const recognizer = await speechCommands.create(
          'BROWSER_FFT',
          undefined,
          {
            vocabulary: '18w',
            probabilityThreshold: 0.85
          }
        );

        setLoadingStatus("Loading model...");
        await recognizer.ensureModelLoaded();
        console.log("Model loaded successfully");

        // Cache the model
        modelCache = recognizer;

        if (!cleanup) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          initAttempts.current = 0;

          toast({
            title: "Voice Assistant Ready",
            description: "Voice commands are now available.",
          });
        }
      } catch (error) {
        console.error("Voice recognition initialization error:", error);

        if (cleanup) return;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (initAttempts.current < MAX_ATTEMPTS) {
          const delay = Math.pow(2, initAttempts.current) * 1000;
          console.log(`Retrying in ${delay}ms (attempt ${initAttempts.current + 1})`);

          setInitError(`Initialization failed. Retrying in ${delay / 1000} seconds...`);
          setLoadingStatus("");

          initTimeout = setTimeout(() => {
            initAttempts.current++;
            if (!cleanup) {
              setInitError(null);
              initializeModel();
            }
          }, delay);
        } else {
          let userMessage = "Could not initialize voice recognition. ";
          if (errorMessage.includes('WebGL')) {
            userMessage += "Your browser may not support WebGL. Please try a different browser.";
          } else if (errorMessage.includes('getUserMedia')) {
            userMessage += "Please allow microphone access.";
          } else {
            userMessage += "Please check console for details and try refreshing.";
          }

          setInitError(userMessage);
          setLoadingStatus("");
          setIsModelLoaded(false);
        }
      }
    }

    if (isActive && !isModelLoaded && !initError) {
      initializeModel();
    }

    return () => {
      cleanup = true;
      clearTimeout(initTimeout);
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
          result => {
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
            invokeCallbackOnNoiseAndUnknown: false
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
              {loadingStatus || "Initializing..."}
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