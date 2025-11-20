import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import OnboardingWizard from "@/components/OnboardingWizard";
import CustomAudioPlayer from "@/components/CustomAudioPlayer";
import UpgradeCard from "@/components/UpgradeCard";
import { 
  Settings, 
  Users, 
  Upload, 
  AudioLines, 
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Music,
  TrendingUp,
  Send,
  Sparkles,
  Zap,
  Info,
  FileAudio,
  RotateCcw,
  RefreshCw,
  Play,
  Pause,
  Phone,
  DollarSign,
  User,
  Shield
} from "lucide-react";

type Creator = {
  id: string;
  whopUserId: string;
  whopCompanyId: string | null;
  messageTemplate: string;
  audioFileUrl: string | null;
  fishAudioModelId: string | null;
  oauthAccessToken: string | null;
  oauthRefreshToken: string | null;
  tokenExpiresAt: string | null;
  isSetupComplete: boolean;
  isAutomationActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Customer = {
  id: string;
  whopUserId: string;
  name: string;
  email: string | null;
  username: string | null;
  planName: string | null;
  joinedAt: string;
  firstMessageSent: boolean;
  audioMessages: {
    id: string;
    status: string;
    audioUrl: string | null;
    createdAt: string;
    sentAt: string | null;
    playedAt: string | null;
    errorMessage: string | null;
    whopChatId: string | null;
    whopMessageId: string | null;
  }[];
};

type Analytics = {
  totalCustomers: number;
  newMembersThisWeek: number;
  totalAudioMessages: number;
  messagesSent: number;
  messagesPlayed: number;
  messagesPending: number;
  messagesFailed: number;
  totalPlays: number;
  averagePlaysPerMessage: number;
  deliveryRate: string;
  recentMessages: any[];
};

interface AdminDashboardProps {
  userName?: string | null;
  experienceId?: string;
  onSwitchToMemberView?: () => void;
}

export default function AdminDashboard({ userName, experienceId, onSwitchToMemberView }: AdminDashboardProps) {
  const { toast } = useToast();
  const [messageTemplate, setMessageTemplate] = useState("");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null);
  const voiceSampleUrlRef = useRef<string | null>(null);
  const [selectedAudioPreviewUrl, setSelectedAudioPreviewUrl] = useState<string | null>(null);
  const selectedAudioPreviewUrlRef = useRef<string | null>(null);
  const [voiceSampleRefreshKey, setVoiceSampleRefreshKey] = useState(0);
  const [savedMessageTemplate, setSavedMessageTemplate] = useState("");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("customers");
  const [showAllMembersDialog, setShowAllMembersDialog] = useState(false);

  const { data: creator, isLoading: creatorLoading, error: creatorError } = useQuery<Creator>({
    queryKey: ["/api/admin/creator", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/admin/creator?experienceId=${experienceId}`
        : "/api/admin/creator";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch creator");
      return res.json();
    },
  });

  const initCreatorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/initialize", { experienceId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator"] });
      toast({
        title: "Setup initialized",
        description: "Your AutoWelcome AI account has been created.",
      });
    },
  });

  // Auto-initialize company ID if creator exists but doesn't have one
  useEffect(() => {
    if (creator && !creator.whopCompanyId && experienceId && !initCreatorMutation.isPending) {
      console.log("Auto-initializing creator with company ID...");
      initCreatorMutation.mutate();
    }
  }, [creator, experienceId]);

  useEffect(() => {
    if (creator) {
      setMessageTemplate(creator.messageTemplate || "");
      setSavedMessageTemplate(creator.messageTemplate || "");
    }
  }, [creator]);

  // Separate effect for voice sample to handle cleanup properly
  useEffect(() => {
    if (creator?.audioFileUrl && !selectedAudioFile) {
      // Store audioFileUrl in a variable for the async function
      const audioFileUrl = creator.audioFileUrl;
      
      const fetchVoiceSample = async () => {
        try {
          const userToken = (window as any).whopUserToken || localStorage.getItem('whop-user-token');
          
          // Add timestamp to force fresh fetch every time
          const timestamp = Date.now();
          
          const res = await fetch(`/api/admin/voice-sample?t=${timestamp}`, {
            headers: {
              'x-whop-user-token': userToken || '',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });
          
          if (res.ok) {
            const blob = await res.blob();
            const newUrl = URL.createObjectURL(blob);
            
            // Revoke old URL before setting new one
            if (voiceSampleUrlRef.current) {
              URL.revokeObjectURL(voiceSampleUrlRef.current);
            }
            
            voiceSampleUrlRef.current = newUrl;
            setVoiceSampleUrl(newUrl);
          }
        } catch (error) {
          console.error('Failed to fetch voice sample:', error);
        }
      };
      
      fetchVoiceSample();
    } else if (!creator?.audioFileUrl) {
      // Clear voice sample URL if no audio file exists
      if (voiceSampleUrlRef.current) {
        URL.revokeObjectURL(voiceSampleUrlRef.current);
        voiceSampleUrlRef.current = null;
      }
      setVoiceSampleUrl(null);
    }
    
    // Cleanup on unmount - revoke URL directly from ref
    return () => {
      if (voiceSampleUrlRef.current) {
        URL.revokeObjectURL(voiceSampleUrlRef.current);
        voiceSampleUrlRef.current = null;
      }
    };
  }, [creator?.audioFileUrl, selectedAudioFile, voiceSampleRefreshKey]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (selectedAudioPreviewUrlRef.current) {
        URL.revokeObjectURL(selectedAudioPreviewUrlRef.current);
        selectedAudioPreviewUrlRef.current = null;
      }
    };
  }, []);

  const { data: customersData, isLoading: customersLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ["/api/admin/customers", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/admin/customers?experienceId=${experienceId}`
        : "/api/admin/customers";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    enabled: !!creator,
    refetchInterval: (query) => {
      const data = query.state.data as { customers: Customer[] } | undefined;
      if (!data?.customers) return false;
      
      // Check if any customer has audio messages that are generating or processing
      const hasGeneratingMessages = data.customers.some((customer) => 
        customer.audioMessages?.some((msg) => 
          msg.status === "generating" || msg.status === "processing"
        )
      );
      
      // Poll every 3 seconds if there are generating messages
      return hasGeneratingMessages ? 3000 : false;
    },
    refetchOnWindowFocus: true,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/admin/analytics?experienceId=${experienceId}`
        : "/api/admin/analytics";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!creator,
  });

  const { data: creditsInfo } = useQuery<{
    credits: number;
    planType: "free" | "tier200" | "unlimited";
    planName: string;
    planLimit: number | null;
    planPrice: string;
    isUnlimited: boolean;
    lastPurchaseDate: string | null;
  }>({
    queryKey: ["/api/admin/credits", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/admin/credits?experienceId=${experienceId}`
        : "/api/admin/credits";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch credits");
      return res.json();
    },
    enabled: !!creator,
  });

  const { data: allMembersData, isLoading: allMembersLoading, refetch: refetchAllMembers } = useQuery<{
    members: any[];
    total: number;
  }>({
    queryKey: ["/api/admin/all-members", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/admin/all-members?experienceId=${experienceId}`
        : "/api/admin/all-members";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch all members");
      return res.json();
    },
    enabled: false, // Only fetch when dialog is opened
  });

  const uploadAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      if (experienceId) {
        formData.append('experienceId', experienceId);
      }
      
      const userToken = localStorage.getItem('whop-user-token');
      const res = await fetch('/api/admin/upload-audio', {
        method: 'POST',
        headers: {
          'x-whop-user-token': userToken || '',
          'Cache-Control': 'no-cache',
        },
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Audio upload failed');
      }
      
      return await res.json();
    },
    onSuccess: async (data) => {
      // Force refetch instead of just invalidating to bypass 304 cache
      await queryClient.refetchQueries({ 
        queryKey: ["/api/admin/creator"],
        type: 'active'
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { messageTemplate: string }) => {
      const res = await apiRequest("POST", "/api/admin/save-settings", { ...data, experienceId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetOnboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/reset-onboarding", { experienceId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator"] });
      setSelectedAudioFile(null);
      
      // Clear selected audio preview URL
      if (selectedAudioPreviewUrlRef.current) {
        URL.revokeObjectURL(selectedAudioPreviewUrlRef.current);
        selectedAudioPreviewUrlRef.current = null;
      }
      setSelectedAudioPreviewUrl(null);
      
      toast({
        title: "Onboarding reset",
        description: "You can now go through the setup wizard again.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await apiRequest("POST", "/api/admin/toggle-automation", { isActive, experienceId });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator"] });
      toast({
        title: data.isActive ? "Automation activated" : "Automation paused",
        description: data.isActive 
          ? "New members will receive automated welcome audio messages." 
          : "Audio generation is paused. No messages will be sent to new members.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an audio file (MP3, WAV, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Clean up old preview URL if exists
      if (selectedAudioPreviewUrlRef.current) {
        URL.revokeObjectURL(selectedAudioPreviewUrlRef.current);
      }
      
      // Create preview URL for the new file
      const previewUrl = URL.createObjectURL(file);
      selectedAudioPreviewUrlRef.current = previewUrl;
      setSelectedAudioPreviewUrl(previewUrl);
      setSelectedAudioFile(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (selectedAudioFile) {
        // Clear old voice sample URL BEFORE upload
        if (voiceSampleUrlRef.current) {
          URL.revokeObjectURL(voiceSampleUrlRef.current);
          voiceSampleUrlRef.current = null;
        }
        setVoiceSampleUrl(null);
        
        // Upload and wait for completion
        await uploadAudioMutation.mutateAsync(selectedAudioFile);
        
        // Clear selected audio file and preview
        setSelectedAudioFile(null);
        if (selectedAudioPreviewUrlRef.current) {
          URL.revokeObjectURL(selectedAudioPreviewUrlRef.current);
          selectedAudioPreviewUrlRef.current = null;
        }
        setSelectedAudioPreviewUrl(null);
        
        // Force voice sample refresh by incrementing key
        setVoiceSampleRefreshKey(prev => prev + 1);
        
        toast({
          title: "Voice model created",
          description: "Your AI voice model has been trained successfully.",
        });
      }

      await saveSettingsMutation.mutateAsync({
        messageTemplate,
      });

      // Update saved state after successful save
      setSavedMessageTemplate(messageTemplate);

      toast({
        title: "Setup complete!",
        description: "Your AI voice is ready to send welcome audio messages to new members.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return selectedAudioFile !== null || messageTemplate !== savedMessageTemplate;
  };

  // Handle tab change with unsaved changes check
  const handleTabChange = (value: string) => {
    if (currentTab === "settings" && hasUnsavedChanges()) {
      setPendingTab(value);
      setShowUnsavedDialog(true);
    } else {
      setCurrentTab(value);
    }
  };

  // Save and switch tab
  const handleSaveAndSwitch = async () => {
    await handleSaveSettings();
    if (pendingTab) {
      setCurrentTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedDialog(false);
  };

  // Discard changes and switch tab
  const handleDiscardAndSwitch = () => {
    // Reset to saved state
    setMessageTemplate(savedMessageTemplate);
    setSelectedAudioFile(null);
    if (selectedAudioPreviewUrlRef.current) {
      URL.revokeObjectURL(selectedAudioPreviewUrlRef.current);
      selectedAudioPreviewUrlRef.current = null;
    }
    setSelectedAudioPreviewUrl(null);

    if (pendingTab) {
      setCurrentTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedDialog(false);
  };

  // Cancel tab switch
  const handleCancelSwitch = () => {
    setPendingTab(null);
    setShowUnsavedDialog(false);
  };

  const triggerAudioMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await apiRequest("POST", "/api/admin/trigger-audio", { customerId, experienceId });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: "Audio generation started",
        description: data.message || "The audio message will be sent automatically when ready.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate audio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <Badge className="gap-1" data-testid={`badge-status-${status}`}><CheckCircle2 className="h-3 w-3" />Sent</Badge>;
      case "completed":
        return <Badge className="gap-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" data-testid={`badge-status-${status}`}><CheckCircle2 className="h-3 w-3" />Ready</Badge>;
      case "played":
        return <Badge className="gap-1 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" data-testid={`badge-status-${status}`}><Play className="h-3 w-3" />Played</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1" data-testid={`badge-status-${status}`}><XCircle className="h-3 w-3" />Failed</Badge>;
      case "generating":
      case "processing":
        return <Badge variant="secondary" className="gap-1" data-testid={`badge-status-${status}`}><Clock className="h-3 w-3" />Generating</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1" data-testid={`badge-status-${status}`}><AlertCircle className="h-3 w-3" />Pending</Badge>;
      default:
        return <Badge variant="outline" className="gap-1" data-testid={`badge-status-${status}`}><AlertCircle className="h-3 w-3" />{status}</Badge>;
    }
  };

  if (creatorLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!creator && !creatorLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-primary/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <div className="relative bg-gradient-to-br from-primary to-primary/60 p-4 rounded-2xl">
                  <Sparkles className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl">Welcome to AutoWelcome AI</CardTitle>
            <CardDescription className="text-base">
              Let's get started by initializing your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">
                AutoWelcome AI automatically generates personalized AI audio messages for new members joining your Whop community.
              </p>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Automated welcome audio messages for every new member</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>AI-powered voice personalization</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <AudioLines className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Delivered directly to Whop DMs</span>
                </div>
              </div>
              <Button
                onClick={() => initCreatorMutation.mutate()}
                disabled={initCreatorMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-init-account"
              >
                {initCreatorMutation.isPending ? "Initializing..." : "Initialize Account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!creator?.isSetupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2">
              <Badge variant="default" className="gap-1.5" data-testid="badge-role-admin">
                <Shield className="h-3 w-3" />
                <span className="font-medium">Admin</span>
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2" data-testid="text-admin-title">
              {userName ? `Welcome, ${userName}` : "Welcome"}
            </h1>
            <p className="text-muted-foreground text-lg">
              Let's set up your AI voice in 2 simple steps
            </p>
          </div>
          
          <OnboardingWizard
            selectedAudioFile={selectedAudioFile}
            setSelectedAudioFile={setSelectedAudioFile}
            messageTemplate={messageTemplate}
            setMessageTemplate={setMessageTemplate}
            onComplete={handleSaveSettings}
            isUploading={uploadAudioMutation.isPending || saveSettingsMutation.isPending}
            onAudioFileSelect={handleAudioFileSelect}
            existingAudioUrl={null}
            hasTrainedVoiceModel={!!creator?.fishAudioModelId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl lg:text-4xl font-bold" data-testid="text-admin-title">
                {userName ? `Welcome back, ${userName}` : "Dashboard"}
              </h1>
              <Badge variant="default" className="gap-1.5" data-testid="badge-role-admin">
                <Shield className="h-3 w-3" />
                <span className="font-medium">Admin</span>
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Manage your automated audio message welcomes
            </p>
            {onSwitchToMemberView && (
              <p className="text-muted-foreground text-sm mt-2">
                Want to see what members experience?{" "}
                <button
                  onClick={onSwitchToMemberView}
                  className="text-primary hover:underline font-medium"
                  data-testid="link-switch-member-view"
                >
                  Switch to member view
                </button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
                toast({
                  title: "Refreshed",
                  description: "Dashboard data has been updated.",
                });
              }}
              data-testid="button-refresh"
              className="hover-elevate"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {analyticsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </>
        ) : (
          <>
            <UpgradeCard experienceId={experienceId} />
            
            <Card className="border-primary/10 hover-elevate transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Members
                </CardTitle>
                <div className="p-2 rounded-md bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent" data-testid="stat-total-customers">
                    {analyticsData?.totalCustomers || 0}
                  </div>
                  {analyticsData && analyticsData.newMembersThisWeek > 0 && (
                    <Badge className="gap-1 text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" data-testid="badge-new-members">
                      +{analyticsData.newMembersThisWeek}
                    </Badge>
                  )}
                </div>
                {analyticsData && analyticsData.newMembersThisWeek > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {analyticsData.newMembersThisWeek} new this week
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/10 hover-elevate transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Messages Sent
                </CardTitle>
                <div className="p-2 rounded-md bg-chart-2/10">
                  <Send className="h-4 w-4 text-chart-2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent" data-testid="stat-messages-sent">
                  {analyticsData?.messagesSent || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {analyticsData?.totalAudioMessages || 0} generated
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 hover-elevate transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
                <div className="p-2 rounded-md bg-chart-2/10">
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-chart-2" data-testid="stat-delivery-rate">
                  {analyticsData?.deliveryRate || "0%"}
                </div>
                {analyticsData && analyticsData.messagesFailed > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {analyticsData.messagesFailed} failed
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="customers" data-testid="tab-customers" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
            {hasUnsavedChanges() && (
              <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" data-testid="indicator-unsaved" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className={`p-4 rounded-lg border ${
            creator?.isAutomationActive 
              ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20' 
              : 'bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20'
          }`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {creator?.isAutomationActive ? (
                  <div className="p-2 rounded-md bg-green-500/20">
                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="p-2 rounded-md bg-orange-500/20">
                    <Pause className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                )}
                <div>
                  <div className={`text-lg font-semibold ${
                    creator?.isAutomationActive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {creator?.isAutomationActive ? "Audio Message Automation Active" : "Audio Message Automation Paused"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {creator?.isAutomationActive 
                      ? "Automatically sending welcome audio messages to new members" 
                      : creditsInfo && !creditsInfo.isUnlimited && creditsInfo.credits === 0
                        ? "No credits remaining. Upgrade your plan to resume automation."
                        : "Audio generation is paused. New members won't receive messages."}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={creator?.isAutomationActive ?? true}
                      onCheckedChange={(checked) => {
                        if (checked && creditsInfo && !creditsInfo.isUnlimited && creditsInfo.credits === 0) {
                          return;
                        }
                        toggleAutomationMutation.mutate(checked);
                      }}
                      disabled={toggleAutomationMutation.isPending || (!creator?.isAutomationActive && creditsInfo && !creditsInfo.isUnlimited && creditsInfo.credits === 0)}
                      data-testid="switch-automation"
                    />
                  </div>
                </TooltipTrigger>
                {!creator?.isAutomationActive && creditsInfo && !creditsInfo.isUnlimited && creditsInfo.credits === 0 && (
                  <TooltipContent>
                    <p>0 message credits left. Upgrade to resume.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Welcome Message Template
              </CardTitle>
              <CardDescription>
                This message will be spoken by your AI voice in each personalized welcome audio message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template" data-testid="label-template">Message Template</Label>
                <Textarea
                  id="template"
                  data-testid="textarea-template"
                  placeholder="Hey {name}! Welcome to {plan}..."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  Use: {"{name}"}, {"{email}"}, {"{username}"}, {"{plan}"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 hover-elevate transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileAudio className="h-5 w-5 text-primary" />
                  AI Voice Training
                </CardTitle>
                <CardDescription>
                  Upload an audio sample to clone your voice using Fish Audio AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {creator?.fishAudioModelId && !selectedAudioFile && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-chart-2/10 border border-chart-2/20">
                      <div className="flex items-center gap-2 text-chart-2 mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Voice model trained and ready</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Model ID: {creator.fishAudioModelId}
                      </p>
                    </div>
                    
                    {creator.audioFileUrl && voiceSampleUrl && (
                      <CustomAudioPlayer
                        src={voiceSampleUrl}
                        label="Your Uploaded Voice Sample"
                      />
                    )}
                  </div>
                )}

                {selectedAudioFile && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FileAudio className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{selectedAudioFile.name}</span>
                        <Badge variant="outline" className="ml-auto">New</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click "Save All Settings" to train a new voice model with this audio
                      </p>
                    </div>
                    
                    {selectedAudioPreviewUrl && (
                      <CustomAudioPlayer
                        src={selectedAudioPreviewUrl}
                        label="Preview Audio"
                      />
                    )}
                  </div>
                )}

                {!creator?.fishAudioModelId && !selectedAudioFile && (
                  <div className="p-8 rounded-md bg-muted/30 text-center border-2 border-dashed">
                    <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No voice model trained yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload audio to clone your voice</p>
                  </div>
                )}

                <input
                  id="audio-file"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  data-testid="input-audio-file"
                  onChange={handleAudioFileSelect}
                />
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('audio-file')?.click()}
                  data-testid="button-choose-audio"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {creator?.fishAudioModelId || selectedAudioFile ? 'Retrain Voice' : 'Upload Audio Sample'}
                </Button>
                
                {creator?.fishAudioModelId && (
                  <p className="text-xs text-muted-foreground text-center">
                    Upload new audio to create a fresh voice model
                  </p>
                )}
              </CardContent>
            </Card>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending || uploadAudioMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-save-settings"
            >
              {(saveSettingsMutation.isPending || uploadAudioMutation.isPending) ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save All Settings
                </>
              )}
            </Button>
            {selectedAudioFile && (
              <p className="text-xs text-center text-muted-foreground">
                This will upload and save all your changes
              </p>
            )}
            
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetOnboardingMutation.mutate()}
                disabled={resetOnboardingMutation.isPending}
                data-testid="button-reset-setup"
                className="gap-2 w-full"
              >
                <RotateCcw className="h-4 w-4" />
                {resetOnboardingMutation.isPending ? "Resetting..." : "Reset Setup"}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Start the setup process from scratch
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {customersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !customersData?.customers.length ? (
            <Card className="border-primary/10">
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                      <Users className="h-16 w-16 text-primary/60" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No members yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your member list will appear here. Each new member will automatically receive a personalized welcome audio message!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">New Members</h2>
                  <p className="text-sm text-muted-foreground">
                    Track welcome audio message delivery for new members
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAllMembersDialog(true);
                    refetchAllMembers();
                  }}
                  data-testid="button-see-all-members"
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  See All Members
                </Button>
              </div>

              <div className="grid gap-4">
                {customersData.customers.map((customer) => {
                  const latestMessage = customer.audioMessages[customer.audioMessages.length - 1];
                  return (
                    <Card
                      key={customer.id}
                      className="border-primary/10 hover-elevate transition-all duration-200"
                      data-testid={`customer-${customer.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg" data-testid={`text-customer-name-${customer.id}`}>
                                {customer.name}
                              </h3>
                              {customer.planName && (
                                <Badge variant="secondary" data-testid={`badge-plan-${customer.id}`}>
                                  {customer.planName}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              {customer.email && (
                                <span>{customer.email}</span>
                              )}
                              <span>Joined {new Date(customer.joinedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {latestMessage && getStatusBadge(latestMessage.status)}
                          </div>
                        </div>
                        
                        {latestMessage?.errorMessage && (
                          <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive flex items-center gap-2" data-testid={`error-${customer.id}`}>
                              <AlertCircle className="h-4 w-4" />
                              {latestMessage.errorMessage}
                            </p>
                          </div>
                        )}
                        
                        {latestMessage?.audioUrl && (
                          <div className="mt-3" data-testid={`audio-player-${customer.id}`}>
                            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                              <Music className="h-3 w-3" />
                              Welcome audio sent to {customer.name}
                            </div>
                            <CustomAudioPlayer src={latestMessage.audioUrl} />
                          </div>
                        )}
                        
                        {!latestMessage && (
                          <div className="mt-3 p-3 rounded-md bg-muted/50 border">
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Info className="h-4 w-4" />
                              No welcome audio sent yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent data-testid="dialog-unsaved-changes">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your settings. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch} data-testid="button-cancel-switch">
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleDiscardAndSwitch}
              data-testid="button-discard-changes"
            >
              Discard Changes
            </Button>
            <AlertDialogAction
              onClick={handleSaveAndSwitch}
              disabled={saveSettingsMutation.isPending || uploadAudioMutation.isPending}
              data-testid="button-save-and-switch"
            >
              {(saveSettingsMutation.isPending || uploadAudioMutation.isPending) ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAllMembersDialog} onOpenChange={setShowAllMembersDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col custom-scrollbar" data-testid="dialog-all-members">
          <DialogHeader>
            <DialogTitle>All Members</DialogTitle>
            <DialogDescription>
              Complete list of all members in your community
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {allMembersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !allMembersData?.members.length ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{allMembersData.total}</span> members
                  </p>
                </div>
                <div className="grid gap-3">
                  {allMembersData.members.map((member: any, index: number) => {
                    const userName = member.user?.name || member.user?.username || 'Unknown Member';
                    const initials = userName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    
                    return (
                      <Card
                        key={member.id || index}
                        className="border-primary/10"
                        data-testid={`all-member-${index}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <Avatar className="h-12 w-12" data-testid={`avatar-member-${index}`}>
                              {member.profile_pic_url && (
                                <AvatarImage src={member.profile_pic_url} alt={userName} />
                              )}
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold" data-testid={`text-member-name-${index}`}>
                                    {userName}
                                  </h3>
                                  {member.status && (
                                    <Badge 
                                      variant={member.status === 'joined' ? 'default' : 'outline'}
                                      data-testid={`badge-member-status-${index}`}
                                    >
                                      {member.status}
                                    </Badge>
                                  )}
                                  {member.access_level && (
                                    <Badge 
                                      variant={member.access_level === 'customer' ? 'default' : 'secondary'}
                                      data-testid={`badge-member-access-${index}`}
                                    >
                                      {member.access_level}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                  {member.user?.email && (
                                    <span data-testid={`text-member-email-${index}`}>{member.user.email}</span>
                                  )}
                                  {member.user?.username && member.user?.name !== member.user?.username && (
                                    <span data-testid={`text-member-username-${index}`}>@{member.user.username}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {member.phone && (
                                  <div className="flex items-center gap-2" data-testid={`text-member-phone-${index}`}>
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{member.phone}</span>
                                  </div>
                                )}
                                {member.usd_total_spent !== undefined && member.usd_total_spent !== null && (
                                  <div className="flex items-center gap-2" data-testid={`text-member-spent-${index}`}>
                                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>${member.usd_total_spent.toFixed(2)} spent</span>
                                  </div>
                                )}
                                {member.joined_at && (
                                  <div className="flex items-center gap-2" data-testid={`text-member-joined-${index}`}>
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>
                                      Joined {new Date(member.joined_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {member.most_recent_action && member.most_recent_action !== 'joined' && (
                                  <div className="flex items-center gap-2" data-testid={`text-member-recent-action-${index}`}>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="capitalize">{member.most_recent_action.replace(/_/g, ' ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
