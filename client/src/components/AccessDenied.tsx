import { ShieldAlert, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccessDeniedProps {
  error?: string | null;
}

export default function AccessDenied({ error }: AccessDeniedProps) {
  const isConfigError = error && (
    error.includes("token") || 
    error.includes("401") || 
    error.includes("configuration") ||
    error.includes("Missing")
  );

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle data-testid="text-access-denied">Access Denied</CardTitle>
          <CardDescription>
            {isConfigError 
              ? "There was a problem validating your access."
              : "You do not have permission to access this application."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm" data-testid="text-error-message">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-center text-sm text-muted-foreground">
            {isConfigError 
              ? "Check your configuration or contact support."
              : "Please contact the administrator if you believe this is an error."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
