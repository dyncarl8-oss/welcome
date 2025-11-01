import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Sparkles, MessageSquare, Music2 } from "lucide-react";

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
};

export default function CustomerView({ experienceId }: CustomerViewProps) {
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

  const getStatusDisplay = () => {
    const isPaused = status?.message?.includes("paused") || false;
    
    if (!status?.messageStatus) {
      if (isPaused) {
        return {
          icon: <Sparkles className="h-16 w-16 text-primary" />,
          title: "Welcome!",
          description: "Start exploring everything we have to offer",
          gradient: "from-primary/20 to-primary/5",
          showCTA: false,
        };
      }
      
      return {
        icon: <Sparkles className="h-16 w-16 text-primary" />,
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
          icon: <CheckCircle2 className="h-16 w-16 text-chart-2" />,
          title: "Check Your DMs!",
          description: "We sent you a personalized welcome message",
          gradient: "from-chart-2/20 to-chart-2/5",
          showCTA: true,
        };
      case "generating":
      case "processing":
        return {
          icon: <Clock className="h-16 w-16 text-chart-3 animate-pulse" />,
          title: "Creating Your Audio",
          description: "Your personalized message is being prepared. Check your DMs in a moment!",
          gradient: "from-chart-3/20 to-chart-3/5",
          showCTA: false,
        };
      default:
        return {
          icon: <Music2 className="h-16 w-16 text-primary" />,
          title: "Welcome!",
          description: "We're glad to have you here",
          gradient: "from-primary/20 to-primary/5",
          showCTA: false,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8 py-12">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full"></div>
            <h1 className="relative text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/60 bg-clip-text text-transparent" data-testid="text-welcome-title">
              Welcome{status?.userName ? `, ${status.userName}` : ""}!
            </h1>
          </div>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-welcome-subtitle">
            We're excited to have you here
          </p>
        </div>

        <Card className={`border-primary/20 shadow-2xl bg-gradient-to-br ${statusDisplay.gradient} backdrop-blur-sm`}>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="flex justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 blur-2xl rounded-full"></div>
                <div className="relative p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-primary/10">
                  {statusDisplay.icon}
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent" data-testid="text-status-title">
                  {statusDisplay.title}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto text-lg">
                  {statusDisplay.description}
                </p>
              </div>

              {statusDisplay.showCTA && (
                <div className="pt-6">
                  <Button 
                    size="lg" 
                    className="gap-2"
                    data-testid="button-see-message"
                    onClick={() => window.open('https://whop.com/messages/', '_blank')}
                  >
                    <MessageSquare className="h-4 w-4" />
                    See Message Now
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
