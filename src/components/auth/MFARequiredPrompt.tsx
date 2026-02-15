import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Settings } from "lucide-react";

export function MFARequiredPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication Required</CardTitle>
          <CardDescription className="text-base mt-2">
            For security purposes, administrators must enable two-factor authentication to access this area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>
              Two-factor authentication (2FA) adds an extra layer of security to your account by requiring a code from your authenticator app when you sign in.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/account">
              <Settings className="mr-2 h-4 w-4" />
              Enable 2FA in Account Settings
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link to="/">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
