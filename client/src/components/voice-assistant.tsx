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

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const recognizer = useRef<speechCommands.SpeechCommandRecognizer | null>(null);

  useEffect(() => {
    let cleanup = false;

    const initializeRecognizer = async () => {
      try {
        console.log('Starting voice assistant initialization...');
        setLoadingStatus("Initializing TensorFlow.js...");

        // Initialize TensorFlow.js
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('TensorFlow.js initialized');

        setLoadingStatus("Creating speech command recognizer...");

        // Create recognizer with default configuration
        recognizer.current = speechCommands.create('BROWSER_FFT');
        console.log('Speech command recognizer created');

        setLoadingStatus("Loading speech recognition model...");
        await recognizer.current.ensureModelLoaded();
        console.log('Model loaded successfully');

        if (!cleanup) {
          await recognizer.current.listen(
            result => {
              const scores = result.scores as Float32Array;
              const maxScore = Math.max(...Array.from(scores));
              const maxScoreIndex = scores.indexOf(maxScore);
              const command = recognizer.current?.wordLabels()[maxScoreIndex];

              if (command && maxScore > 0.75) {
                console.log('Recognized command:', command, 'with score:', maxScore);
                setTranscript(prev => [...prev, command]);
                onTranscript?.(command);

                if (['go', 'stop', 'yes', 'no'].includes(command)) {
                  onCommand?.(command);
                }
              }
            },
            {
              probabilityThreshold: 0.75
            }
          );

          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);
          console.log('Voice assistant fully initialized');
          toast({
            title: "Voice Assistant Ready",
            description: "You can now use voice commands",
          });
        }
      } catch (error) {
        console.error('Failed to initialize voice assistant:', error);
        if (!cleanup) {
          setInitError('Failed to initialize voice assistant. Please try refreshing.');
          setLoadingStatus("");
          toast({
            title: "Error",
            description: "Failed to initialize voice assistant. Please try refreshing the page.",
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
      if (recognizer.current) {
        recognizer.current.stopListening();
      }
    };
  }, [isActive, onCommand, onTranscript]);

  const startRecording = async () => {
    if (!isModelLoaded || !recognizer.current) {
      toast({
        title: "Error",
        description: "Voice assistant is not ready yet. Please wait.",
        variant: "destructive",
      });
      return;
    }

    try {
      await recognizer.current.startStreaming();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Listening for voice commands...",
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (recognizer.current) {
      await recognizer.current.stopStreaming();
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
          <Button
            onClick={() => {
              setInitError(null);
              setIsModelLoaded(false);
            }}
            variant="outline"
            className="mt-4"
          >
            Retry Initialization
          </Button>
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
          <p className="text-muted-foreground">{loadingStatus || "Please wait..."}</p>
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