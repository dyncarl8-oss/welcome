import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Zap, ArrowUp, Crown, Infinity, Check, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { iframeSdk } from "@/lib/iframe-sdk";
import { useState } from "react";

type CreditsInfo = {
  credits: number;
  planType: "free" | "tier200" | "unlimited";
  planName: string;
  planLimit: number | null;
  planPrice: string;
  isUnlimited: boolean;
  lastPurchaseDate: string | null;
};

type MembershipInfo = {
  id: string;
  status: string;
  planId: string;
  renewalPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  manageUrl: string;
} | null;

interface UpgradeCardProps {
  experienceId?: string;
}

export default function UpgradeCard({ experienceId }: UpgradeCardProps) {
  const { toast } = useToast();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const { data: creditsInfo } = useQuery<CreditsInfo>({
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
  });

  const { data: membershipData } = useQuery<{ membership: MembershipInfo }>({
    queryKey: ["/api/admin/membership", experienceId],
    queryFn: async () => {
      const url = experienceId 
        ? `/api/admin/membership?experienceId=${experienceId}`
        : "/api/admin/membership";
      const res = await fetch(url, {
        headers: {
          "x-whop-user-token": (window as any).whopUserToken || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch membership");
      return res.json();
    },
  });

  const handlePurchaseMutation = useMutation({
    mutationFn: async (planId: string) => {
      setProcessingPlanId(planId);
      const res = await iframeSdk.inAppPurchase({ planId });
      
      if (res.status === "ok") {
        await apiRequest("POST", "/api/admin/purchase-success", { planId, experienceId });
        return { success: true };
      } else {
        throw new Error("Purchase failed or cancelled");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credits", experienceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator", experienceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership", experienceId] });
      setProcessingPlanId(null);
      setIsUpgradeModalOpen(false);
      toast({
        title: "Upgrade Successful!",
        description: "Your plan has been upgraded and credits have been added.",
      });
    },
    onError: (error) => {
      console.error("Purchase error:", error);
      setProcessingPlanId(null);
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLowCredits = creditsInfo && !creditsInfo.isUnlimited && creditsInfo.credits < 10;
  const creditsPercentage = creditsInfo && creditsInfo.planLimit 
    ? (creditsInfo.credits / creditsInfo.planLimit) * 100 
    : 100;

  return (
    <Card className={`border-primary/10 hover-elevate transition-all duration-300 ${
      isLowCredits ? 'border-orange-500/30' : ''
    }`}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Message Credits
        </CardTitle>
        <div className={`p-2 rounded-md ${creditsInfo?.planType === 'unlimited' ? 'bg-purple-500/10' : 'bg-primary/10'}`}>
          {creditsInfo?.planType === 'unlimited' ? (
            <Infinity className="h-4 w-4 text-purple-500" />
          ) : (
            <Zap className={`h-4 w-4 ${isLowCredits ? 'text-orange-500' : 'text-primary'}`} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent ${
              isLowCredits ? 'text-orange-500' : ''
            }`} data-testid="stat-credits">
              {creditsInfo?.isUnlimited ? '∞' : creditsInfo?.credits || 0}
            </div>
            <Badge 
              variant={
                creditsInfo?.planType === 'unlimited' ? 'default' : 
                creditsInfo?.planType === 'tier200' ? 'secondary' : 
                'outline'
              } 
              className={`text-xs ${
                creditsInfo?.planType === 'tier200' 
                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-primary/20' 
                  : creditsInfo?.planType === 'unlimited'
                  ? 'bg-gradient-to-r from-purple-500/20 to-purple-500/10 border-purple-500/20'
                  : ''
              }`}
              data-testid="badge-plan-type"
            >
              {creditsInfo?.planName || 'Free'}
            </Badge>
            {membershipData?.membership?.manageUrl && (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                onClick={() => window.open(membershipData.membership!.manageUrl, '_blank')}
                data-testid="button-manage-subscription"
              >
                Manage
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          
          {!creditsInfo?.isUnlimited && creditsInfo?.planLimit && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    creditsPercentage > 50 ? 'bg-primary' : 
                    creditsPercentage > 20 ? 'bg-orange-500' : 
                    'bg-destructive'
                  }`}
                  style={{ width: `${Math.min(creditsPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {creditsInfo.credits} of {creditsInfo.planLimit} remaining
              </p>
            </div>
          )}

          {creditsInfo?.planType === 'free' && (
            <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="w-full mt-2 gap-2"
                  data-testid="button-open-upgrade-modal"
                >
                  <ArrowUp className="h-3 w-3" />
                  Upgrade Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-5xl" data-testid="modal-upgrade-plans">
                <DialogHeader>
                  <DialogTitle>Choose Your Plan</DialogTitle>
                  <DialogDescription>
                    Select the plan that best fits your needs
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-3 py-4">
                  <Card className="flex flex-col opacity-60">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-xl">Free</CardTitle>
                        <div className="p-2 rounded-md bg-muted">
                          <Zap className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1">
                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <div className="text-4xl font-bold">$0</div>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      </div>
                      <ul className="space-y-2.5 text-sm mb-6 flex-1">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span>20 automated messages</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span>Try out the platform</span>
                        </li>
                      </ul>
                      <Button
                        className="w-full gap-2"
                        disabled
                        variant="outline"
                        data-testid="button-current-plan"
                      >
                        Current Plan
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover-elevate transition-all flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-xl">Pro</CardTitle>
                        <div className="p-2 rounded-md bg-primary/10">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1">
                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <div className="text-4xl font-bold">$29</div>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      </div>
                      <ul className="space-y-2.5 text-sm mb-6 flex-1">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>200 automated messages</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Monthly credit refresh</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Perfect for small teams</span>
                        </li>
                      </ul>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handlePurchaseMutation.mutate("plan_kQk0AZnAydnTZ")}
                        disabled={processingPlanId !== null}
                        data-testid="button-subscribe-tier200"
                      >
                        {processingPlanId === "plan_kQk0AZnAydnTZ" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowUp className="h-4 w-4" />
                            Subscribe to Pro
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover-elevate transition-all border-primary/30 flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-xl">Unlimited</CardTitle>
                        <div className="p-2 rounded-md bg-purple-500/10">
                          <Crown className="h-5 w-5 text-purple-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1">
                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <div className="text-4xl font-bold">$99</div>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      </div>
                      <ul className="space-y-2.5 text-sm mb-6 flex-1">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Unlimited automated messages</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Best for growing businesses</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Never worry about limits</span>
                        </li>
                      </ul>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handlePurchaseMutation.mutate("plan_wJY7M1ZsJTx5A")}
                        disabled={processingPlanId !== null}
                        data-testid="button-subscribe-unlimited"
                      >
                        {processingPlanId === "plan_wJY7M1ZsJTx5A" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Crown className="h-4 w-4" />
                            Subscribe to Unlimited
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {creditsInfo?.planType === 'tier200' && (
            <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="w-full mt-2 gap-2"
                  data-testid="button-open-unlimited-modal"
                >
                  <Crown className="h-3 w-3" />
                  Upgrade to Unlimited
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" data-testid="modal-unlimited-upgrade">
                <DialogHeader>
                  <DialogTitle>Upgrade to Unlimited</DialogTitle>
                  <DialogDescription>
                    Get unlimited messages and never worry about limits
                  </DialogDescription>
                </DialogHeader>
                <Card className="border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Unlimited Plan</CardTitle>
                      <div className="p-2 rounded-md bg-purple-500/10">
                        <Crown className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <div className="text-4xl font-bold">$99</div>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-2.5 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Unlimited automated messages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Best for growing businesses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Never worry about limits</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full gap-2"
                      onClick={() => handlePurchaseMutation.mutate("plan_wJY7M1ZsJTx5A")}
                      disabled={processingPlanId !== null}
                      data-testid="button-subscribe-unlimited-tier200"
                    >
                      {processingPlanId === "plan_wJY7M1ZsJTx5A" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Crown className="h-4 w-4" />
                          Subscribe to Unlimited
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>
          )}

          {creditsInfo && !creditsInfo.isUnlimited && creditsInfo.credits === 0 && (
            <p className="text-xs text-destructive mt-2">
              Automation paused. Upgrade to resume.
            </p>
          )}
          
          {isLowCredits && creditsInfo && creditsInfo.credits > 0 && (
            <p className="text-xs text-orange-500 dark:text-orange-400 mt-2">
              Running low! Upgrade to avoid pausing automation.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
