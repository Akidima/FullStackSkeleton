import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2 } from "lucide-react";
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
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const transcriber = useRef<any>(null);

  useEffect(() => {
    const initializeTranscriber = async () => {
      try {
        transcriber.current = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
        setIsTranscriberReady(true);
        setInitError(null);
      } catch (error) {
        console.error('Failed to initialize transcriber:', error);
        setInitError('Failed to initialize voice assistant. Please try refreshing the page.');
        toast({
          title: "Error",
          description: "Failed to initialize voice assistant. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeTranscriber();

    // Cleanup function
    return () => {
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
      // Convert audio blob to array buffer for processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const result = await transcriber.current(arrayBuffer);

      if (result.text) {
        setTranscript(prev => [...prev, result.text]);
        onTranscript?.(result.text);

        // Simple command detection
        const lowerText = result.text.toLowerCase();
        if (lowerText.includes('create task') || 
            lowerText.includes('add action item') ||
            lowerText.includes('set reminder')) {
          onCommand?.(result.text);
        }
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

  if (initError) {
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
          <p className="text-muted-foreground">Please wait while we set up the voice assistant...</p>
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