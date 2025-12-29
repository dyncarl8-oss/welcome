import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Whop App</CardTitle>
          <CardDescription className="text-base mt-2">
            This is a Whop application that uses role-based access control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>For Developers:</strong> This app should be accessed through the Whop platform.
            </p>
            <p>
              When users install your app and access it from their Whop, they'll be automatically 
              directed to the experience view at <code className="bg-muted px-1.5 py-0.5 rounded">/experiences/[experienceId]</code>
            </p>
            <p>
              The app will automatically detect if the user is an admin or customer and show the appropriate view.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Configuration Required:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Set your app's experience view path in the Whop dashboard to: <code className="bg-muted px-1.5 py-0.5 rounded">/experiences/[experienceId]</code></li>
              <li>Ensure your WHOP_API_KEY and NEXT_PUBLIC_WHOP_APP_ID are set in environment variables</li>
              <li>Deploy your app and install it in a Whop to test</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
