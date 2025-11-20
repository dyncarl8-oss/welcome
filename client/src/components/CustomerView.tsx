import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Sparkles, MessageSquare, Layers, ArrowLeft, Shield, Zap } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import WelcomeMessagePreviewModal from "@/components/WelcomeMessagePreviewModal";

type WelcomeStatus = {
  hasWelcomeMessage: boolean;
  messageStatus: string | null;
  audioUrl: string | null;
  message: string;
  userName: string;
  userId: string;
};

type CustomerViewProps = {
  experienceId?: string;
  isAdminPreview?: boolean;
  onBackToAdmin?: () => void;
};

export default function CustomerView({ experienceId, isAdminPreview, onBackToAdmin }: CustomerViewProps) {
  const { toast } = useToast();
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewReady, setPreviewReady] = useState(false);

  const { data: status, isLoading } = useQuery<WelcomeStatus>({
    queryKey: ["/api/customer/welcome-status", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/customer/welcome-status?experienceId=${experienceId}`
        : "/api/customer/welcome-status";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch welcome status");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as WelcomeStatus | undefined;
      if (data?.messageStatus === "generating" || data?.messageStatus === "processing") {
        return 3000;
      }
      return false;
    },
    refetchOnWindowFocus: true,
  });

  const triggerMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/trigger-welcome", { experienceId });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/welcome-status", experienceId] });
      
      // Store preview data but DON'T auto-open modal
      if (data.preview) {
        setPreviewData(data.preview);
        setPreviewReady(true);
        toast({
          title: "Preview Generated!",
          description: "Click 'See Message Now' to view the preview",
        });
      } else {
        toast({
          title: "Message Triggered",
          description: "Generating your welcome message. Check your DMs in a moment!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger welcome message",
        variant: "destructive",
      });
    },
  });

  const handleSeeMessageClick = () => {
    if (isAdminPreview && !previewReady) {
      toast({
        title: "Preview Not Ready",
        description: "Please click 'Test Welcome Message' first to generate a preview.",
        variant: "default",
      });
      return;
    }
    
    if (isAdminPreview && previewReady) {
      setPreviewModalOpen(true);
    } else {
      window.open('https://whop.com/messages/', '_blank');
    }
  };

  const getStatusDisplay = () => {
    const isPaused = status?.message?.includes("paused") || false;
    
    // In admin preview mode, ALWAYS show the success state (unless actively generating)
    if (isAdminPreview) {
      // Only show processing state if actively generating
      if (status?.messageStatus === "generating" || status?.messageStatus === "processing") {
        return {
          icon: <Clock className="h-12 w-12 text-chart-3 animate-pulse" />,
          title: "Creating Your Audio",
          description: "Your personalized message is being prepared. Check your DMs in a moment!",
          gradient: "from-chart-3/20 to-chart-3/5",
          showCTA: false,
        };
      }
      
      // Otherwise always show the success state that members see
      return {
        icon: <CheckCircle2 className="h-12 w-12 text-chart-2" />,
        title: "Check Your DMs!",
        description: "We sent you a personalized welcome message",
        gradient: "from-chart-2/20 to-chart-2/5",
        showCTA: true,
      };
    }
    
    // Regular member view logic
    if (!status?.messageStatus) {
      if (isPaused) {
        return {
          icon: <Sparkles className="h-12 w-12 text-primary" />,
          title: "Welcome!",
          description: "Start exploring everything we have to offer",
          gradient: "from-primary/20 to-primary/5",
          showCTA: false,
        };
      }
      
      return {
        icon: <Sparkles className="h-12 w-12 text-primary" />,
        title: "Welcome!",
        description: "Check your DMs for a special message",
        gradient: "from-primary/20 to-primary/5",
        showCTA: false,
      };
    }

    switch (status.messageStatus) {
      case "sent":
      case "delivered":
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-chart-2" />,
          title: "Check Your DMs!",
          description: "We sent you a personalized welcome message",
          gradient: "from-chart-2/20 to-chart-2/5",
          showCTA: true,
        };
      case "generating":
      case "processing":
        return {
          icon: <Clock className="h-12 w-12 text-chart-3 animate-pulse" />,
          title: "Creating Your Audio",
          description: "Your personalized message is being prepared. Check your DMs in a moment!",
          gradient: "from-chart-3/20 to-chart-3/5",
          showCTA: false,
        };
      default:
        return {
          icon: <Sparkles className="h-12 w-12 text-primary" />,
          title: "Welcome!",
          description: "We're glad to have you here",
          gradient: "from-primary/20 to-primary/5",
          showCTA: false,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[600px] bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center space-y-3">
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-5 w-72 mx-auto" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();

  return (
    <>
      {previewData && (
        <WelcomeMessagePreviewModal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          preview={previewData}
        />
      )}
      <div className="min-h-[600px] bg-gradient-to-br from-background via-background to-primary/5 relative">
        {isAdminPreview && (
          <div className="bg-primary/10 border-b border-primary/20 p-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="gap-1.5">
                  <Shield className="h-3 w-3" />
                  <span className="text-xs font-medium">Admin Preview</span>
                </Badge>
                <p className="text-xs text-muted-foreground">
                  This is what your members see. Only admins can see this banner and test button.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={previewReady ? "default" : "outline"}
                  onClick={() => triggerMessageMutation.mutate()}
                  disabled={triggerMessageMutation.isPending || previewReady}
                  data-testid="button-trigger-message"
                  className="gap-1.5"
                >
                  {triggerMessageMutation.isPending ? (
                    <>
                      <Clock className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : previewReady ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Preview Ready - Click See Message Now
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      Test Welcome Message
                    </>
                  )}
                </Button>
                {onBackToAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onBackToAdmin}
                    data-testid="button-back-admin"
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to Admin
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center min-h-[600px] p-4">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full"></div>
              <h1 className="relative text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/60 bg-clip-text text-transparent" data-testid="text-welcome-title">
                Welcome{status?.userName ? `, ${status.userName}` : ""}!
              </h1>
            </div>
            <p className="text-base lg:text-lg text-muted-foreground max-w-md mx-auto" data-testid="text-welcome-subtitle">
              We're excited to have you here
            </p>
          </div>

          <Card className={`border-primary/20 shadow-xl bg-gradient-to-br ${statusDisplay.gradient} backdrop-blur-sm`}>
            <CardContent className="pt-8 pb-8 px-6">
              <div className="text-center space-y-6">
                <div className="flex justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 blur-xl rounded-full"></div>
                  <div className="relative p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-primary/10">
                    {statusDisplay.icon}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent" data-testid="text-status-title">
                    {statusDisplay.title}
                  </h2>
                  <p className="text-muted-foreground max-w-sm mx-auto text-sm lg:text-base">
                    {statusDisplay.description}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 pt-2">
                  {statusDisplay.showCTA ? (
                    <>
                      <Button 
                        size="default"
                        variant={isAdminPreview && previewReady ? "default" : "default"}
                        className="gap-2 w-full max-w-xs"
                        data-testid="button-see-message"
                        onClick={handleSeeMessageClick}
                      >
                        <MessageSquare className="h-4 w-4" />
                        See Message Now
                      </Button>
                      <div className="flex items-center gap-2 text-muted-foreground w-full max-w-xs">
                        <div className="h-px flex-1 bg-border"></div>
                        <span className="text-xs">or</span>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      <Button 
                        size="default"
                        variant="outline"
                        className="gap-2 w-full max-w-xs"
                        data-testid="button-explore-apps"
                      >
                        <Layers className="h-4 w-4" />
                        Explore Apps in Sidebar
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="default"
                      variant="outline"
                      className="gap-2 w-full max-w-xs"
                      data-testid="button-explore-apps"
                    >
                      <Layers className="h-4 w-4" />
                      Explore Apps in Sidebar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}
