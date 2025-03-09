import { useState, useEffect, useRef } from "react";
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

// Rate limiting configuration
const RATE_LIMIT_DELAY = 5000; // 5 seconds between retries
const MAX_RETRIES = 3;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const retryCount = useRef(0);
  const lastInitAttempt = useRef(0);
  const initTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let cleanup = false;

    async function initializeVoiceRecognition() {
      try {
        // Rate limiting check
        const now = Date.now();
        const timeSinceLastAttempt = now - lastInitAttempt.current;

        if (timeSinceLastAttempt < RATE_LIMIT_DELAY) {
          const waitTime = Math.ceil((RATE_LIMIT_DELAY - timeSinceLastAttempt) / 1000);
          setLoadingStatus(`Rate limited. Waiting ${waitTime}s before retry...`);

          if (!cleanup) {
            initTimeoutRef.current = setTimeout(() => {
              if (!cleanup) initializeVoiceRecognition();
            }, RATE_LIMIT_DELAY - timeSinceLastAttempt);
          }
          return;
        }

        lastInitAttempt.current = now;

        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Speech recognition is not supported in your browser');
        }

        // Request microphone access
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
            console.log('MeetMate voice recognition started');
          }
        };

        recognizer.onend = () => {
          if (!cleanup) {
            setIsRecording(false);
            console.log('MeetMate voice recognition ended');
          }
        };

        recognizer.onresult = (event) => {
          if (!cleanup) {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
              const command = lastResult[0].transcript.trim().toLowerCase();
              console.log('MeetMate recognized command:', command);
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
          console.error('MeetMate voice recognition error:', {
            error: event.error,
            message: event.message,
            timestamp: new Date().toISOString(),
            retryCount: retryCount.current
          });

          if (!cleanup) {
            const errorMessage = event.error === 'not-allowed' 
              ? 'Please allow microphone access to use voice recognition'
              : event.error === 'network'
                ? 'Network error occurred. Please check your connection.'
                : `Voice recognition error: ${event.error}`;

            setInitError(errorMessage);
            setIsRecording(false);

            toast({
              title: "Voice Recognition Error",
              description: errorMessage,
              variant: "destructive",
            });

            // Retry logic for recoverable errors
            if (retryCount.current < MAX_RETRIES && 
                !['not-allowed', 'service-not-allowed'].includes(event.error)) {
              retryCount.current++;
              if (!cleanup) {
                initTimeoutRef.current = setTimeout(() => {
                  if (!cleanup) initializeVoiceRecognition();
                }, RATE_LIMIT_DELAY);
              }
            }
          }
        };

        if (!cleanup) {
          setRecognition(recognizer);
          setIsInitialized(true);
          setLoadingStatus("");
          setInitError(null);
          retryCount.current = 0;

          toast({
            title: "MeetMate Voice Assistant Ready",
            description: "You can now use voice commands.",
          });
        }
      } catch (error) {
        console.error('MeetMate voice assistant initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (!cleanup) {
          setInitError(
            errorMessage.includes('getUserMedia')
              ? 'Please allow microphone access to use voice recognition'
              : errorMessage.includes('not supported')
                ? 'Voice recognition is not supported in your browser. Please try Chrome or Edge.'
                : 'Could not initialize voice recognition. Please try again later'
          );
          setLoadingStatus("");
          setIsInitialized(false);
        }
      }
    }

    if (isActive && !isInitialized && !initError) {
      initializeVoiceRecognition();
    }

    return () => {
      cleanup = true;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isActive, onCommand, onTranscript]);

  const toggleRecording = async () => {
    if (!isInitialized || !recognition) {
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

  return (
    <Card role="region" aria-label="MeetMate Voice Assistant Controls">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRecording ? (
            <Mic className="h-5 w-5 text-red-500 animate-pulse" aria-hidden="true" />
          ) : (
            <Mic className="h-5 w-5" aria-hidden="true" />
          )}
          MeetMate Voice Assistant
          {!isInitialized && !initError && (
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
          ) : !isInitialized ? (
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
              disabled={!isInitialized}
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