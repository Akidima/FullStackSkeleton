import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { pipeline } from "@xenova/transformers";

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  onTranscript?: (transcript: string) => void;
  isActive?: boolean;
}

export function VoiceAssistant({ onCommand, onTranscript, isActive = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isTranscriberReady, setIsTranscriberReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempts, setInitAttempts] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const transcriber = useRef<any>(null);
  const sentimentAnalyzer = useRef<any>(null);
  const MAX_INIT_ATTEMPTS = 3;

  useEffect(() => {
    let isMounted = true;
    const initializeTranscriber = async () => {
      try {
        if (!transcriber.current) {
          console.log('Initializing transcriber...');
          transcriber.current = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-small',
            { 
              progress_callback: (progress: any) => console.log('Loading model:', progress),
              quantized: true, // Use quantized model for better browser performance
              cache: true, // Enable caching
            }
          );
        }
        if (!sentimentAnalyzer.current) {
          console.log('Initializing sentiment analyzer...');
          sentimentAnalyzer.current = await pipeline(
            'text-classification',
            'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
            {
              quantized: true,
              cache: true,
            }
          );
        }
        if (isMounted) {
          setIsTranscriberReady(true);
          setInitError(null);
          console.log('Transcriber initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize transcriber:', error);
        if (isMounted) {
          setInitError('Failed to initialize voice assistant. Please try refreshing the page.');
          if (initAttempts < MAX_INIT_ATTEMPTS) {
            setTimeout(() => {
              setInitAttempts(prev => prev + 1);
            }, 2000); // Retry after 2 seconds
          }
          toast({
            title: "Error",
            description: "Failed to initialize voice assistant. Retrying...",
            variant: "destructive",
          });
        }
      }
    };

    if (!isTranscriberReady && initAttempts < MAX_INIT_ATTEMPTS) {
      initializeTranscriber();
    }

    return () => {
      isMounted = false;
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initAttempts]);

  const startRecording = async () => {
    if (!isTranscriberReady) {
      toast({
        title: "Error",
        description: "Voice assistant is not ready yet. Please wait.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!transcriber.current) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const result = await transcriber.current(arrayBuffer);

      if (result.text) {
        setTranscript(prev => [...prev, result.text]);
        onTranscript?.(result.text);

        // Simple command detection
        const lowerText = result.text.toLowerCase();
        if (lowerText.includes('create task') || 
            lowerText.includes('add action item') ||
            lowerText.includes('generate summary')) {
          onCommand?.(result.text);
        }

        // Perform sentiment analysis
        const sentimentResult = await sentimentAnalyzer.current(result.text);
        const sentiment = sentimentResult[0];
        const sentimentIcon = sentiment.label === 'POSITIVE' ? 
          <ThumbsUp className="h-4 w-4 text-green-500" /> : 
          <ThumbsDown className="h-4 w-4 text-red-500" />;

        setTranscript(prev => [...prev, 
          `Sentiment: ${sentiment.label} (${Math.round(sentiment.score * 100)}% confidence) ${sentimentIcon}`
        ]);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Error",
        description: "Failed to process voice input. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isActive) return null;

  if (initError && initAttempts >= MAX_INIT_ATTEMPTS) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Assistant Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{initError}</p>
          <Button 
            onClick={() => setInitAttempts(0)} 
            variant="outline" 
            className="mt-4"
          >
            Retry Initialization
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isTranscriberReady) {
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
            Please wait while we set up the voice assistant... 
            {initAttempts > 0 && ` (Attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS})`}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRecording ? <Mic className="h-5 w-5 text-red-500 animate-pulse" /> : <Mic className="h-5 w-5" />}
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