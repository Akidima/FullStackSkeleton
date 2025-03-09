import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    let cleanup = false;

    async function initializeVoiceRecognition() {
      try {
        // Check if browser supports speech recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Speech recognition is not supported in your browser');
        }

        // Check for microphone access
        setLoadingStatus("Requesting microphone access...");
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Initialize speech recognition
        setLoadingStatus("Initializing voice recognition...");
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognizer = new SpeechRecognition();

        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = 'en-US';

        recognizer.onstart = () => {
          if (!cleanup) {
            setIsRecording(true);
            console.log('Voice recognition started');
          }
        };

        recognizer.onend = () => {
          if (!cleanup) {
            setIsRecording(false);
            console.log('Voice recognition ended');
          }
        };

        recognizer.onresult = (event) => {
          if (!cleanup) {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
              const command = lastResult[0].transcript.trim().toLowerCase();
              console.log('Recognized command:', command);
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
          }
        };

        recognizer.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (!cleanup) {
            setInitError(`Voice recognition error: ${event.error}`);
            setIsRecording(false);
            toast({
              title: "Voice Recognition Error",
              description: `Error: ${event.error}. Please try again.`,
              variant: "destructive",
            });
          }
        };

        if (!cleanup) {
          setRecognition(recognizer);
          setIsModelLoaded(true);
          setLoadingStatus("");
          setInitError(null);

          toast({
            title: "Voice Assistant Ready",
            description: "You can now use voice commands.",
          });
        }
      } catch (error) {
        console.error('Voice assistant initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setInitError(
          errorMessage.includes('getUserMedia')
            ? 'Please allow microphone access to use voice recognition'
            : errorMessage.includes('not supported')
              ? 'Voice recognition is not supported in your browser. Please try Chrome or Edge.'
              : 'Could not initialize voice recognition. Please try again'
        );

        setLoadingStatus("");
        setIsModelLoaded(false);
      }
    }

    if (isActive && !isModelLoaded && !initError) {
      initializeVoiceRecognition();
    }

    return () => {
      cleanup = true;
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isActive, onCommand, onTranscript]);

  const toggleRecording = async () => {
    if (!isModelLoaded || !recognition) {
      toast({
        title: "Not Ready",
        description: "Voice recognition is still initializing.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isRecording) {
        recognition.stop();
        toast({
          title: "Recording Stopped",
          description: "Voice recognition paused.",
        });
      } else {
        recognition.start();
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