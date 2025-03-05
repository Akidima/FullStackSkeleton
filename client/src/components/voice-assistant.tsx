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
  const recognizer = useRef<speechCommands.SpeechCommandRecognizer | null>(null);

  useEffect(() => {
    let cleanup = false;

    const initializeRecognizer = async () => {
      try {
        setLoadingStatus("Loading speech recognition model...");

        // Create recognizer
        recognizer.current = speechCommands.create('BROWSER_FFT');

        // Load the model
        await recognizer.current.ensureModelLoaded();

        // Add custom commands
        await recognizer.current.listen(
          result => {
            const scores = result.scores;
            const command = scores.indexOf(Math.max(...scores));
            const commandText = recognizer.current?.wordLabels()[command];

            if (commandText) {
              setTranscript(prev => [...prev, commandText]);
              onTranscript?.(commandText);

              // Process commands
              if (commandText.includes('create') || 
                  commandText.includes('add') ||
                  commandText.includes('generate')) {
                onCommand?.(commandText);
              }
            }
          },
          {
            includeSpectrogram: true,
            probabilityThreshold: 0.75
          }
        );

        if (!cleanup) {
          setIsModelLoaded(true);
          setLoadingStatus("");
          toast({
            title: "Voice Assistant Ready",
            description: "You can now use voice commands.",
          });
        }
      } catch (error) {
        console.error('Failed to initialize voice recognition:', error);
        if (!cleanup) {
          setLoadingStatus("Failed to load speech recognition model. Please try refreshing.");
          toast({
            title: "Error",
            description: "Failed to initialize voice assistant. Please try refreshing the page.",
            variant: "destructive",
          });
        }
      }
    };

    if (isActive) {
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
      await recognizer.current.startListening();
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
      await recognizer.current.stopListening();
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Processing complete.",
      });
    }
  };

  if (!isActive) return null;

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
          <p className="text-muted-foreground">{loadingStatus}</p>
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