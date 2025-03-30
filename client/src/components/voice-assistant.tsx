import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Loader2, Globe, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWebSocketSimple } from "@/hooks/use-websocket-simple";
import axios from "axios";

// Define SpeechRecognition types since TypeScript doesn't include them by default
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  onTranscript?: (transcript: string) => void;
  isActive?: boolean;
}

// Rate limiting configuration
const RATE_LIMIT_DELAY = 5000; // 5 seconds between retries
const MAX_RETRIES = 3;
const MAX_BACKOFF = 30000; // Maximum backoff of 30 seconds

// Supported languages configuration
const SUPPORTED_LANGUAGES = {
  'en-US': 'English (US)',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'zh-CN': 'Chinese (Simplified)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'ru-RU': 'Russian'
} as const;

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<keyof typeof SUPPORTED_LANGUAGES>('en-US');
  const { isConnected } = useWebSocketSimple();

  const retryCount = useRef(0);
  const lastInitAttempt = useRef(0);
  const initTimeoutRef = useRef<NodeJS.Timeout>();
  const languageChangeTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((retryAttempt: number) => {
    const delay = Math.min(
      RATE_LIMIT_DELAY * Math.pow(2, retryAttempt),
      MAX_BACKOFF
    );
    return delay + Math.random() * 1000; // Add jitter
  }, []);

  // Debounced initialization function
  const debouncedInitialize = useCallback(async () => {
    if (!isActive) return;

    try {
      // Rate limiting check
      const now = Date.now();
      const timeSinceLastAttempt = now - lastInitAttempt.current;
      const backoffDelay = getBackoffDelay(retryCount.current);

      if (timeSinceLastAttempt < backoffDelay) {
        const waitTime = Math.ceil((backoffDelay - timeSinceLastAttempt) / 1000);
        setLoadingStatus(`Please wait ${waitTime}s before retrying...`);
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
      
      // Access the SpeechRecognition constructor with proper type handling
      const windowWithSpeech = window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognition;
        SpeechRecognition?: new () => SpeechRecognition;
      };
      
      const SpeechRecognitionConstructor = 
        windowWithSpeech.webkitSpeechRecognition || 
        windowWithSpeech.SpeechRecognition;
        
      if (!SpeechRecognitionConstructor) {
        throw new Error('Speech recognition is not supported in your browser');
      }
      
      const recognizer = new SpeechRecognitionConstructor();

      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = selectedLanguage;

      recognizer.onstart = () => {
        setIsRecording(true);
        console.log(`MeetMate voice recognition started in ${SUPPORTED_LANGUAGES[selectedLanguage]}`);
      };

      recognizer.onend = () => {
        setIsRecording(false);
        console.log('MeetMate voice recognition ended');
      };

      recognizer.onresult = async (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcriptText = lastResult[0].transcript.trim();
          console.log(`MeetMate recognized speech (${selectedLanguage}):`, transcriptText);
          
          // Add to transcript history
          setTranscript(prev => [...prev, transcriptText]);
          onTranscript?.(transcriptText);
          
          try {
            // Create a temporary announcement for screen readers that we're processing
            const processingAnnouncement = document.createElement('div');
            processingAnnouncement.setAttribute('aria-live', 'polite');
            processingAnnouncement.textContent = `Processing command: ${transcriptText}`;
            document.body.appendChild(processingAnnouncement);
            
            // Process voice command through Claude AI on server
            const response = await axios.post('/api/voice/command', {
              transcript: transcriptText,
              language: selectedLanguage,
              confidence: lastResult[0].confidence
            });
            
            // Remove processing announcement
            document.body.removeChild(processingAnnouncement);
            
            if (response.data && response.data.processedCommand) {
              const aiProcessedCommand = response.data.processedCommand;
              console.log('Claude AI processed command:', aiProcessedCommand);
              
              // Pass the AI-processed command to handlers
              onCommand?.(aiProcessedCommand);
              
              // Provide feedback about the processed command
              const commandFeedback = response.data.userFeedback || aiProcessedCommand;
              
              // Create accessible announcement
              const announcement = document.createElement('div');
              announcement.setAttribute('aria-live', 'polite');
              announcement.textContent = commandFeedback;
              document.body.appendChild(announcement);
              setTimeout(() => announcement.remove(), 1500);
              
              // Show toast for successful command processing if confidence is high
              if (response.data.confidenceScore > 0.85) {
                toast({
                  title: "Command Recognized",
                  description: commandFeedback,
                  duration: 3000
                });
              }
            } else {
              console.warn('Received empty or invalid response from voice command processing');
              
              // Still pass the original transcript as fallback
              onCommand?.(transcriptText);
            }
          } catch (error) {
            console.error('Error processing voice command with Claude AI:', error);
            
            // Fallback to using raw transcript
            onCommand?.(transcriptText);
            
            // Create accessible error announcement
            const errorAnnouncement = document.createElement('div');
            errorAnnouncement.setAttribute('aria-live', 'assertive');
            errorAnnouncement.textContent = `Could not process command with AI. Using raw transcript: ${transcriptText}`;
            document.body.appendChild(errorAnnouncement);
            setTimeout(() => errorAnnouncement.remove(), 2000);
          }
        }
      };

      recognizer.onerror = (event) => {
        console.error('MeetMate voice recognition error:', {
          error: event.error,
          message: event.message,
          timestamp: new Date().toISOString(),
          retryCount: retryCount.current,
          language: selectedLanguage
        });
        
        // In Replit preview environment, network errors are common for speech recognition
        // Provide a more helpful message specifically for Replit environment
        const isReplit = window.location.hostname.includes('replit');
        
        let errorMessage = '';
        if (event.error === 'not-allowed') {
          errorMessage = 'Please allow microphone access to use voice recognition';
        } else if (event.error === 'network') {
          if (isReplit) {
            errorMessage = 'Network error occurred. Voice recognition may not work properly in Replit preview. Try clicking "Open in new tab" for better experience.';
          } else {
            errorMessage = 'Network error occurred. Please check your connection.';
          }
        } else if (event.error === 'language-not-supported') {
          errorMessage = `Language ${SUPPORTED_LANGUAGES[selectedLanguage]} is not supported by your browser`;
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try speaking again.';
          // Don't show error UI for no-speech, just log it
          console.log(errorMessage);
          return;
        } else {
          errorMessage = `Voice recognition error: ${event.error}`;
        }

        setInitError(errorMessage);
        setIsRecording(false);

        // Don't show destructive toast for network errors in Replit as they're expected
        toast({
          title: "Voice Recognition Status",
          description: errorMessage,
          variant: isReplit && event.error === 'network' ? "default" : "destructive",
        });

        // Don't retry for network errors in Replit since they will likely continue to fail
        if (!(isReplit && event.error === 'network') && 
            retryCount.current < MAX_RETRIES && 
            !['not-allowed', 'service-not-allowed', 'language-not-supported'].includes(event.error)) {
          retryCount.current++;
          const backoffDelay = getBackoffDelay(retryCount.current);
          initTimeoutRef.current = setTimeout(debouncedInitialize, backoffDelay);
        }
      };

      if (recognition) {
        recognition.stop();
      }
      setRecognition(recognizer);
      setIsInitialized(true);
      setLoadingStatus("");
      setInitError(null);
      retryCount.current = 0;

      toast({
        title: "MeetMate Voice Assistant Ready",
        description: `Voice commands enabled in ${SUPPORTED_LANGUAGES[selectedLanguage]}.`,
      });
    } catch (error) {
      console.error('MeetMate voice assistant initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
  }, [isActive, onCommand, onTranscript, selectedLanguage, getBackoffDelay]);

  // Initialize or reinitialize recognition when language changes
  useEffect(() => {
    const cleanup = () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (languageChangeTimeoutRef.current) {
        clearTimeout(languageChangeTimeoutRef.current);
      }
      if (recognition) {
        recognition.stop();
      }
    };

    if (isActive) {
      debouncedInitialize();
    }

    return cleanup;
  }, [isActive, debouncedInitialize]);

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
          description: `Listening for voice commands in ${SUPPORTED_LANGUAGES[selectedLanguage]}.`,
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

  // Handle language change with debouncing and request queue
  const handleLanguageChange = (value: string) => {
    // Prevent rapid language changes
    if (languageChangeTimeoutRef.current) {
      clearTimeout(languageChangeTimeoutRef.current);
    }

    // Add delay before processing language change
    languageChangeTimeoutRef.current = setTimeout(() => {
      // Reset retry count when changing language
      retryCount.current = 0;
      setSelectedLanguage(value as keyof typeof SUPPORTED_LANGUAGES);
    }, 300);
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
          <div className="ml-auto flex items-center">
            {isConnected ? (
              <span className="text-xs flex items-center text-green-500" title="Real-time connection active">
                <Wifi className="h-3 w-3 mr-1" />
                <span className="sr-only md:not-sr-only">Connected</span>
              </span>
            ) : (
              <span className="text-xs flex items-center text-amber-500" title="No real-time connection">
                <WifiOff className="h-3 w-3 mr-1" />
                <span className="sr-only md:not-sr-only">Offline</span>
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={selectedLanguage}
              onValueChange={handleLanguageChange}
              disabled={isRecording}
            >
              <SelectTrigger className="w-[200px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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