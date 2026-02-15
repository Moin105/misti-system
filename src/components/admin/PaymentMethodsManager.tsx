import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Public/non-sensitive config stored in database
interface PaymentMethodConfig {
  publishable_key?: string;  // Stripe publishable key (safe to expose)
  client_id?: string;        // PayPal client ID (safe to expose)
  mode?: string;             // sandbox/live
  wallet_address?: string;   // Crypto wallet (public by nature)
  network?: string;          // Crypto network
  // SECURITY: Secret keys are NOT stored here - they are managed via environment variables
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  config: PaymentMethodConfig;
  fee_text: string | null;
  logo_url: string | null;
}

const PaymentMethodsManager = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    is_active: boolean;
    config: PaymentMethodConfig;
    fee_text: string;
    logo_url: string;
  }>({
    name: "",
    type: "stripe",
    is_active: true,
    config: {},
    fee_text: "0% Fees",
    logo_url: "",
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } else {
      // Security: Strip any sensitive fields that might have been stored historically
      const sanitizedData = (data || []).map((method: any) => ({
        ...method,
        config: sanitizeConfig(method.config || {})
      }));
      setPaymentMethods(sanitizedData as PaymentMethod[]);
    }
    setLoading(false);
  };

  // Remove any secret keys from config - they should only be in env vars
  const sanitizeConfig = (config: Record<string, any>): PaymentMethodConfig => {
    const { 
      secret_key, 
      client_secret, 
      api_key,
      // Keep only non-sensitive fields
      ...safeConfig 
    } = config;
    return safeConfig;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only store non-sensitive configuration
    const safeConfig = sanitizeConfig(formData.config);

    const methodData = {
      name: formData.name,
      type: formData.type,
      is_active: formData.is_active,
      config: safeConfig,
      fee_text: formData.fee_text,
      logo_url: formData.logo_url || null,
    };

    if (editingMethod) {
      const { error } = await supabase
        .from("payment_methods")
        .update(methodData as any)
        .eq("id", editingMethod.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update payment method",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Payment method updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("payment_methods")
        .insert([methodData as any]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create payment method",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Payment method created successfully",
      });
    }

    await refreshAdminData(['/rest/v1/payment_methods'], ['payment-methods']);
    resetForm();
    setDialogOpen(false);
    loadPaymentMethods();
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      type: method.type,
      is_active: method.is_active,
      config: method.config || {},
      fee_text: method.fee_text || "0% Fees",
      logo_url: method.logo_url || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment method",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Payment method deleted successfully",
    });
    await refreshAdminData(['/rest/v1/payment_methods'], ['payment-methods']);
    loadPaymentMethods();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "stripe",
      is_active: true,
      config: {},
      fee_text: "0% Fees",
      logo_url: "",
    });
    setEditingMethod(null);
  };

  const renderConfigFields = () => {
    const updateConfig = (key: string, value: string) => {
      setFormData(prev => ({
        ...prev,
        config: { ...prev.config, [key]: value }
      }));
    };

    switch (formData.type) {
      case "stripe":
        return (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Configuration</AlertTitle>
              <AlertDescription>
                The Stripe Secret Key is securely stored in environment variables and is never exposed to the frontend.
                Only configure the publishable key below.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="publishable_key">Stripe Publishable Key</Label>
              <Input
                id="publishable_key"
                value={formData.config.publishable_key || ""}
                onChange={(e) => updateConfig("publishable_key", e.target.value)}
                placeholder="pk_test_... or pk_live_..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Publishable keys are safe to include - they identify your account but can't process charges.
              </p>
            </div>
          </div>
        );
      case "paypal":
        return (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Configuration</AlertTitle>
              <AlertDescription>
                PayPal Client Secret must be configured in environment variables (PAYPAL_CLIENT_SECRET).
                Only configure the public client ID and mode below.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="client_id">PayPal Client ID</Label>
              <Input
                id="client_id"
                value={formData.config.client_id || ""}
                onChange={(e) => updateConfig("client_id", e.target.value)}
                placeholder="AXX..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Client ID is safe to include publicly.
              </p>
            </div>
            <div>
              <Label htmlFor="mode">Mode</Label>
              <Select
                value={formData.config.mode || "sandbox"}
                onValueChange={(value) => updateConfig("mode", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "crypto":
        return (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Configuration</AlertTitle>
              <AlertDescription>
                Any API keys for crypto payment gateways must be configured in environment variables.
                Only configure public wallet addresses and network below.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="wallet_address">Wallet Address</Label>
              <Input
                id="wallet_address"
                value={formData.config.wallet_address || ""}
                onChange={(e) => updateConfig("wallet_address", e.target.value)}
                placeholder="0x... or bc1..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Wallet addresses are public and safe to display.
              </p>
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <Select
                value={formData.config.network || "ethereum"}
                onValueChange={(value) => updateConfig("network", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="usdt">USDT (Tether)</SelectItem>
                  <SelectItem value="bnb">BNB Chain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment Methods</h2>
          <p className="text-muted-foreground">Configure payment options for your customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-md max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Method Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Credit Card, PayPal, Bitcoin"
                  required
                />
              </div>

              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/stripe-logo.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a URL to a payment method logo (recommended height: 24px)
                </p>
              </div>

              <div>
                <Label htmlFor="fee_text">Fee Text</Label>
                <Input
                  id="fee_text"
                  value={formData.fee_text}
                  onChange={(e) => setFormData({ ...formData, fee_text: e.target.value })}
                  placeholder="0% Fees"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Text to display next to the payment method (e.g., "0% Fees", "Instant", etc.)
                </p>
              </div>

              <div>
                <Label htmlFor="type">Payment Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value, config: {} })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderConfigFields()}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingMethod ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert variant="default" className="border-blue-500/50 bg-blue-500/5">
        <Shield className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-500">Security Notice</AlertTitle>
        <AlertDescription>
          Secret keys (Stripe Secret Key, PayPal Client Secret, API keys) are stored securely in environment variables
          and are never displayed in this interface. Only public configuration like publishable keys and wallet addresses
          are managed here.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {paymentMethods.map((method) => (
          <Card key={method.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold">{method.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    method.is_active
                      ? "bg-green-500/20 text-green-600"
                      : "bg-gray-500/20 text-gray-600"
                  }`}>
                    {method.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary">
                    {method.type}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {method.logo_url && (
                    <div className="flex items-center gap-2 mb-2">
                      <img src={method.logo_url} alt={method.name} className="h-6 w-auto" />
                    </div>
                  )}
                  {method.fee_text && (
                    <p className="text-green-600 font-medium">{method.fee_text}</p>
                  )}
                  {method.type === "stripe" && method.config.publishable_key && (
                    <p>Publishable Key: {method.config.publishable_key.substring(0, 20)}...</p>
                  )}
                  {method.type === "paypal" && method.config.client_id && (
                    <p>Client ID: {method.config.client_id.substring(0, 20)}...</p>
                  )}
                  {method.type === "paypal" && method.config.mode && (
                    <p>Mode: <span className="capitalize">{method.config.mode}</span></p>
                  )}
                  {method.type === "crypto" && method.config.wallet_address && (
                    <p>Wallet: {method.config.wallet_address.substring(0, 20)}...</p>
                  )}
                  {method.type === "crypto" && method.config.network && (
                    <p>Network: <span className="capitalize">{method.config.network}</span></p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(method)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(method.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {paymentMethods.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No payment methods configured yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first payment method to start accepting payments
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodsManager;
