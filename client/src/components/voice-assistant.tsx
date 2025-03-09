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

let recognizer: speechCommands.SpeechCommandRecognizer | null = null;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup = false;

    async function initializeVoiceRecognition() {
      try {
        setLoadingStatus("Initializing...");
        console.log("Starting voice recognition initialization");

        // Initialize TensorFlow.js
        await tf.ready();
        console.log("TensorFlow.js initialized");

        // Create recognizer
        if (!recognizer) {
          recognizer = await speechCommands.create('BROWSER_FFT');
          console.log("Speech recognizer created");
        }

        // Load the model
        await recognizer.ensureModelLoaded();
        console.log("Model loaded successfully");

        if (!cleanup) {
          // Start listening
          await recognizer.listen(
            result => {
              const scores = result.scores as Float32Array;
              const maxScore = Math.max(...Array.from(scores));
              const maxScoreIndex = scores.indexOf(maxScore);
              const command = recognizer?.wordLabels()[maxScoreIndex];

              if (command && maxScore > 0.75) {
                console.log(`Recognized command: ${command} with score: ${maxScore}`);
                setTranscript(prev => [...prev, command]);
                onTranscript?.(command);
                onCommand?.(command);
              }
            },
            {
              includeSpectrogram: false,
              probabilityThreshold: 0.75
            }
          );

          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);

          toast({
            title: "Voice Assistant Ready",
            description: "Voice commands are now available.",
          });
        }
      } catch (error) {
        console.error("Voice recognition initialization failed:", error);
        setInitError("Failed to initialize voice recognition. Please try refreshing the page.");
        setLoadingStatus("");
        toast({
          title: "Voice Assistant Error",
          description: "Could not initialize voice recognition.",
          variant: "destructive",
        });
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
  }, [isActive, isModelLoaded, initError, onCommand, onTranscript]);

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
              setTranscript(prev => [...prev, command]);
              onTranscript?.(command);
              onCommand?.(command);
            }
          },
          {
            includeSpectrogram: false,
            probabilityThreshold: 0.75
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRecording ? (
            <Mic className="h-5 w-5 text-red-500 animate-pulse" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          Voice Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {initError ? (
            <div className="text-destructive text-sm">{initError}</div>
          ) : !isModelLoaded ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingStatus || "Initializing..."}
            </div>
          ) : (
            <Button
              onClick={toggleRecording}
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
          )}

          {transcript.length > 0 && (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <div className="space-y-2">
                {transcript.map((text, index) => (
                  <p key={index} className="text-sm">{text}</p>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}