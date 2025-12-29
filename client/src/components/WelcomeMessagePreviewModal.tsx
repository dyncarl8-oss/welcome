import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, MessageSquare, Volume2, CheckCircle2 } from "lucide-react";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";

type WelcomeMessagePreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: {
    audioUrl: string;
    messageText: string;
    personalizedScript: string;
    userName: string;
  };
};

export default function WelcomeMessagePreviewModal({
  open,
  onOpenChange,
  preview,
}: WelcomeMessagePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar" data-testid="modal-preview">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold">
            Welcome Message Preview
          </DialogTitle>
          <DialogDescription className="text-sm">
            Preview of personalized message for {preview.userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">Preview Mode - Test Only</h4>
                <Badge variant="outline" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  No Credits Used
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is a simulation showing what real members will receive in their Whop DMs. 
                No message was actually sent during this preview.
              </p>
            </div>
          </div>

          <Separator />

          {/* DM Message Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Direct Message Content</h3>
            </div>
            
            <div className="p-4 rounded-lg border bg-card">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  What members see in Whop DMs
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-message-content">
                  {preview.messageText}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Audio Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Personalized Audio Message</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Voice Script
                  </p>
                  <blockquote className="border-l-2 border-primary/40 pl-3 italic text-sm text-muted-foreground" data-testid="text-audio-script">
                    "{preview.personalizedScript}"
                  </blockquote>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Audio Player
                </p>
                <CustomAudioPlayer 
                  src={preview.audioUrl}
                  data-testid="audio-player"
                />
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-3 rounded-lg bg-muted/30 border-dashed border">
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              <strong>Tip:</strong> When automation is active, new members automatically receive this personalized message in their Whop DMs within moments of joining
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
