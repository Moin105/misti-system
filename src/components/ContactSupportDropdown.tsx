import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Headphones, Send, Mail } from "lucide-react";
import { DynamicIcon, getIconByName } from "@/components/DynamicIcon";
import { z } from "zod";

const inquirySchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  message: z.string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters"),
});

interface ContactInfo {
  id: string;
  label: string;
  value: string;
  icon_name: string;
  contact_type: string;
}

interface ContactSupportDropdownProps {
  productName?: string;
  className?: string;
  variant?: "default" | "outline" | "hero";
  size?: "default" | "sm" | "lg";
}

export const ContactSupportDropdown = ({ 
  productName, 
  className = "w-full",
  variant = "outline",
  size = "lg"
}: ContactSupportDropdownProps) => {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_info")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      // Validate input data
      const validatedData = inquirySchema.parse({
        name: formData.name,
        email: formData.email,
        message: formData.message,
      });

      const { data: { user } } = await supabase.auth.getUser();

      const { error: dbError } = await supabase
        .from("product_inquiries")
        .insert([{
          id: crypto.randomUUID(),
          user_id: user?.id || null,
          customer_name: validatedData.name,
          customer_email: validatedData.email,
          product_name: productName || null,
          message: validatedData.message,
        }]);
      if (dbError) {
        // Do not block support contact if inquiry logging fails.
        console.error("Error saving inquiry record:", dbError);
      }

      const { error: emailError } = await supabase.functions.invoke("send-inquiry-notification", {
        body: {
          customerName: validatedData.name,
          customerEmail: validatedData.email,
          productName: productName || "General Inquiry",
          message: validatedData.message,
        },
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
      }

      toast({
        title: "Success",
        description: "Your inquiry has been sent. We'll get back to you soon!",
      });

      setFormData({ name: "", email: "", message: "" });
      setOpen(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send inquiry",
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  const renderContactIcon = (iconName: string) => {
    const Icon = getIconByName(iconName);
    if (Icon) {
      return <Icon className="h-5 w-5 text-muted-foreground" />;
    }
    return <Mail className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className={className} variant={variant} size={size}>
          <Headphones className="w-5 h-5 mr-2" />
          Contact Support
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-background" align="start">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Contact Support</h3>

          {contacts.length > 0 && (
            <>
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3">
                    {renderContactIcon(contact.icon_name)}
                    <div>
                      <p className="text-sm font-medium">{contact.label}</p>
                      <p className="text-sm text-muted-foreground">{contact.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </>
          )}

          <div>
            <p className="text-sm font-medium mb-3">Send us an inquiry</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm">Your Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-sm">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help you?"
                  rows={4}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending..." : "Send Inquiry"}
              </Button>
            </form>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
