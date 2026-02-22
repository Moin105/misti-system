import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

const EmailTestManager = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const invokeWithJwtRetry = async (functionName: string, body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Session missing. Please log in again.");
    }

    const invokeWithToken = (token: string) =>
      supabase.functions.invoke(functionName, {
        body,
        headers: { Authorization: `Bearer ${token}` },
      });

    let { data, error } = await invokeWithToken(session.access_token);
    if (!error) return data;

    const status = Number((error as any)?.context?.status ?? (error as any)?.status ?? 0);
    const message = String(error.message ?? "").toLowerCase();
    const isJwtError = status === 401 || message.includes("invalid jwt") || message.includes("unauthorized");

    if (isJwtError) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session?.access_token) {
        throw new Error("Session expired. Please log in again.");
      }

      ({ data, error } = await invokeWithToken(refreshed.session.access_token));
      if (!error) return data;
    }

    const finalStatus = Number((error as any)?.context?.status ?? (error as any)?.status ?? 0);
    throw new Error(`${error.message || "Function call failed"}${finalStatus ? ` (status: ${finalStatus})` : ""}`);
  };

  const sendWelcomeEmailTest = async () => {
    if (!email) {
      toast({ title: "Error", description: "Please enter an email address", variant: "destructive" });
      return;
    }
    setLoading("welcome");
    try {
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { email, name: "Test User" }
      });
      if (error) throw error;
      toast({ title: "Welcome Email Sent!", description: `Test email sent to ${email}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const sendPasswordResetTest = async () => {
    if (!email) {
      toast({ title: "Error", description: "Please enter an email address", variant: "destructive" });
      return;
    }
    setLoading("password");
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email, resetUrl: `${window.location.origin}/auth?reset=true&token=test-token-123` }
      });
      if (error) throw error;
      toast({ title: "Password Reset Email Sent!", description: `Test email sent to ${email}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const sendOrderNotificationTest = async () => {
    setLoading("order");
    try {
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;
      if (!orders || orders.length === 0) {
        throw new Error("No orders found. Create an order first.");
      }

      await invokeWithJwtRetry('send-order-notification', { orderId: orders[0].id, type: 'created' });
      toast({ title: "Order Notification Sent!", description: "Test order confirmation sent" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const sendOrderStatusChangeTest = async () => {
    setLoading("status");
    try {
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;
      if (!orders || orders.length === 0) {
        throw new Error("No orders found. Create an order first.");
      }

      await invokeWithJwtRetry('send-order-notification', {
        orderId: orders[0].id,
        type: 'status_changed',
        newStatus: 'processing',
      });
      toast({ title: "Status Change Email Sent!", description: "Test status update sent" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Email Testing</h2>
        <p className="text-muted-foreground">Test email notifications before sending to real users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email Address
          </CardTitle>
          <CardDescription>Enter the email address where test emails will be sent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome Email</CardTitle>
            <CardDescription>Sent to new users upon registration</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={sendWelcomeEmailTest} 
              disabled={loading !== null}
              className="w-full"
            >
              {loading === "welcome" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Welcome Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Password Reset</CardTitle>
            <CardDescription>Sent when users request password reset</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={sendPasswordResetTest} 
              disabled={loading !== null}
              variant="secondary"
              className="w-full"
            >
              {loading === "password" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Password Reset
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Confirmation</CardTitle>
            <CardDescription>Sent when a new order is placed</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={sendOrderNotificationTest} 
              disabled={loading !== null}
              variant="secondary"
              className="w-full"
            >
              {loading === "order" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Send Order Confirmation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Status Change</CardTitle>
            <CardDescription>Sent when order status is updated</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={sendOrderStatusChangeTest} 
              disabled={loading !== null}
              variant="outline"
              className="w-full"
            >
              {loading === "status" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
              Send Status Change
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Order notification tests require at least one order in the database. 
            The most recent order will be used for testing. All emails are sent from support@misti.services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestManager;
