import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileAudio, 
  MessageSquare,
  CheckCircle2,
  Clock,
  Info,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  Trash2
} from "lucide-react";

interface OnboardingWizardProps {
  selectedAudioFile: File | null;
  setSelectedAudioFile: (file: File | null) => void;
  messageTemplate: string;
  setMessageTemplate: (template: string) => void;
  onComplete: () => Promise<void>;
  isUploading: boolean;
  onAudioFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  existingAudioUrl?: string | null;
  hasTrainedVoiceModel?: boolean;
}

export default function OnboardingWizard({
  selectedAudioFile,
  setSelectedAudioFile,
  messageTemplate,
  setMessageTemplate,
  onComplete,
  isUploading,
  onAudioFileSelect,
  existingAudioUrl,
  hasTrainedVoiceModel,
}: OnboardingWizardProps) {
  const hasMessage = !!messageTemplate && messageTemplate.trim().length > 0;
  const hasAudio = !!selectedAudioFile || !!existingAudioUrl || !!hasTrainedVoiceModel;

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioPlayback, setAudioPlayback] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showRecordingPrompt, setShowRecordingPrompt] = useState(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);

  const sampleRecordingText = "Hello, my name is Alex and I love creating content. Today is a beautiful day and I'm excited to share my thoughts with you. I enjoy talking about things that matter to me and connecting with people who share similar interests. Thank you for taking the time to listen to what I have to say. I really appreciate your support and hope you have a wonderful day.";
  
  const getInitialStep = () => {
    if (hasMessage) return 2;
    return 1;
  };

  const [currentStep, setCurrentStep] = useState(1);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const newStep = getInitialStep();
      setCurrentStep(newStep);
      initialized.current = true;
    }
  }, [hasMessage, existingAudioUrl, hasTrainedVoiceModel]);

  const handleContinueFromStep1 = () => {
    setCurrentStep(2);
  };

  const handleSkipStep1 = () => {
    setCurrentStep(2);
  };

  const handleBackFromStep2 = () => {
    setCurrentStep(1);
  };

  const handleComplete = async () => {
    await onComplete();
  };

  const startRecording = async () => {
    try {
      setShowRecordingPrompt(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        setRecordedAudio(audioBlob);
        const extension = mimeType.includes('webm') ? 'webm' : 'ogg';
        const audioFile = new File([audioBlob], `recording-${Date.now()}.${extension}`, { type: mimeType });
        setSelectedAudioFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (recordedAudio) {
      if (audioPlayback) {
        audioPlayback.pause();
        audioPlayback.currentTime = 0;
      }
      const audio = new Audio(URL.createObjectURL(recordedAudio));
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioPlayback(audio);
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioPlayback) {
      audioPlayback.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    if (audioPlayback) {
      audioPlayback.pause();
    }
    setRecordedAudio(null);
    setAudioPlayback(null);
    setIsPlaying(false);
    setRecordingTime(0);
    setSelectedAudioFile(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAudioDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAudioDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAudio(true);
  };

  const handleAudioDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAudio(false);
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAudio(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        setSelectedAudioFile(file);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of 2
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round((currentStep / 2) * 100)}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / 2) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step 1: Audio Recording (Voice Clone) */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Clone Your Voice</CardTitle>
                <CardDescription>
                  Record your voice to send personalized audio messages
                </CardDescription>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                You can change this later
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRecording && (
              <div className="space-y-4">
                <div className="p-6 rounded-md bg-destructive/5 border border-destructive/20 text-center">
                  <Mic className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="font-medium text-destructive mb-1">Recording...</p>
                  <p className="text-lg font-mono text-destructive">{formatTime(recordingTime)}</p>
                </div>

                <div className="p-4 rounded-md bg-muted/50 border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Read this out loud:
                  </p>
                  <p className="text-sm leading-relaxed">
                    {sampleRecordingText}
                  </p>
                </div>
              </div>
            )}

            {recordedAudio && selectedAudioFile && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Recorded Audio</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(recordingTime)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!isPlaying ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={playRecording}
                        data-testid="button-play-recording"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={pausePlayback}
                        data-testid="button-pause-recording"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={deleteRecording}
                      data-testid="button-delete-recording"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedAudioFile && !recordedAudio && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedAudioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedAudioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedAudioFile(null)}
                    data-testid="button-remove-audio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {!selectedAudioFile && !recordedAudio && (existingAudioUrl || hasTrainedVoiceModel) && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Voice model already trained</p>
                    <p className="text-xs text-muted-foreground">
                      You can continue or upload new audio
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showRecordingPrompt && !isRecording && (
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-muted/50 border">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Speak naturally for 15-20 seconds. You can read the sample below or say anything you want.</span>
                  </p>
                </div>

                <div className="p-3 rounded-md border">
                  <p className="text-xs text-muted-foreground mb-2">Sample Script (Optional)</p>
                  <p className="text-sm leading-relaxed">
                    {sampleRecordingText}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowRecordingPrompt(false)}
                    data-testid="button-cancel-recording"
                  >
                    Back
                  </Button>
                  <Button 
                    variant="default"
                    onClick={startRecording}
                    data-testid="button-begin-recording"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              </div>
            )}

            {!selectedAudioFile && !isRecording && !recordedAudio && !showRecordingPrompt && (
              <div className="space-y-3">
                <input
                  id="audio-file-wizard"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  data-testid="input-audio-file"
                  onChange={onAudioFileSelect}
                />
                
                <div
                  onDragOver={handleAudioDragOver}
                  onDragEnter={handleAudioDragEnter}
                  onDragLeave={handleAudioDragLeave}
                  onDrop={handleAudioDrop}
                  onClick={() => document.getElementById('audio-file-wizard')?.click()}
                  data-testid="dropzone-audio"
                  className={`
                    relative cursor-pointer rounded-md p-8
                    border-2 border-dashed transition-all
                    ${isDraggingAudio 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover-elevate'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <FileAudio className={`h-8 w-8 ${
                      isDraggingAudio ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">
                        {isDraggingAudio ? 'Drop your audio here' : 'Drop audio file here'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse • MP3, WAV, M4A, WebM
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRecordingPrompt(true)}
                  disabled={isRecording}
                  data-testid="button-start-recording"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Record Audio Instead
                </Button>
              </div>
            )}

            {isRecording && (
              <Button 
                variant="destructive"
                className="w-full"
                onClick={stopRecording}
                data-testid="button-stop-recording"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}

            {!showRecordingPrompt && !isRecording && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  By continuing, you allow us to use your voice for creating personalized audio messages.
                </p>
                <Button
                  onClick={handleContinueFromStep1}
                  data-testid="button-continue-step-1"
                  className="w-full"
                  disabled={!hasAudio}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Welcome Message */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleBackFromStep2}
                disabled={isUploading}
                data-testid="button-back-step-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Set Your Message Template</CardTitle>
                <CardDescription>
                  Customize the audio message sent to new members
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="template-wizard" data-testid="label-template">
                  Message Template
                </Label>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  You can change this later
                </p>
              </div>
              <Textarea
                id="template-wizard"
                data-testid="textarea-template"
                placeholder="Hey {name}! Welcome, I'm excited to have you here..."
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Use placeholders: {"{name}"}, {"{username}"}
              </p>
            </div>

            {!selectedAudioFile && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium">AI Text-to-Speech will be used</p>
                    <p className="text-muted-foreground">
                      No audio uploaded - using AI voice
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedAudioFile && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
                  <div className="text-xs">
                    <p className="font-medium">Your cloned voice will say this message</p>
                    <p className="text-muted-foreground">
                      AI voice trained from your audio
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t">
              <Button
                className="w-full"
                disabled={isUploading || !hasMessage}
                onClick={handleComplete}
                data-testid="button-complete-setup"
              >
                {isUploading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                  </>
                )}
              </Button>
              {!hasMessage && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Please enter a message to continue
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
