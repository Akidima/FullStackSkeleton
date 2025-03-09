import { useState, useEffect } from "react";
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

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let recognizer: speechCommands.SpeechCommandRecognizer | null = null;
    let cleanup = false;

    async function initializeVoiceRecognition() {
      try {
        // Step 1: Check audio capabilities
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone access is not supported in your browser');
        }

        setLoadingStatus("Requesting microphone access...");
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Step 2: Initialize TensorFlow.js with minimal configuration
        setLoadingStatus("Initializing TensorFlow.js...");
        await tf.ready();

        // Step 3: Create speech recognizer with minimal configuration
        setLoadingStatus("Creating speech recognition model...");
        recognizer = speechCommands.create(
          'BROWSER_FFT',
          undefined,
          {
            vocabulary: 'directional4w', // Use smaller vocabulary
            probabilityThreshold: 0.85,
            invokeCallbackOnNoiseAndUnknown: false
          }
        );

        // Step 4: Load the model
        setLoadingStatus("Loading voice model...");
        await recognizer.ensureModelLoaded();

        // Success - update state
        setIsModelLoaded(true);
        setLoadingStatus("");
        setInitError(null);

        toast({
          title: "Voice Assistant Ready",
          description: "You can now use voice commands.",
        });

      } catch (error) {
        console.error('Voice assistant initialization error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Provide specific error messages based on the error type
        if (errorMessage.includes('getUserMedia')) {
          setInitError('Please allow microphone access to use voice recognition');
        } else if (errorMessage.includes('vocabulary')) {
          setInitError('Failed to load voice recognition model. Please try refreshing');
        } else {
          setInitError('Could not initialize voice recognition. Please try again');
        }

        setLoadingStatus("");
        setIsModelLoaded(false);
      }
    }

    if (isActive && !isModelLoaded && !initError) {
      initializeVoiceRecognition();
    }

    return () => {
      cleanup = true;
      if (recognizer) {
        recognizer.stopListening();
      }
    };
  }, [isActive]);

  const toggleRecording = async () => {
    if (!isModelLoaded) {
      toast({
        title: "Not Ready",
        description: "Voice recognition is still initializing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(!isRecording);

      if (!isRecording) {
        toast({
          title: "Recording Started",
          description: "Listening for voice commands.",
        });
      } else {
        toast({
          title: "Recording Stopped",
          description: "Voice recognition paused.",
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