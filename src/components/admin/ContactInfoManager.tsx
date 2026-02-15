import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, Edit, X } from "lucide-react";
import * as Icons from "lucide-react";

interface ContactInfo {
  id: string;
  label: string;
  value: string;
  icon_name: string;
  contact_type: string;
  is_active: boolean;
  sort_order: number;
}

const ICON_OPTIONS = [
  "Mail", "Phone", "MessageCircle", "Send", "Globe", 
  "User", "Users", "Headphones", "HelpCircle", "Info"
];

export const ContactInfoManager = () => {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ContactInfo>>({
    label: "",
    value: "",
    icon_name: "Mail",
    contact_type: "email",
    is_active: true,
    sort_order: 0,
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
        .order("sort_order");

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from("contact_info")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Contact info updated" });
      } else {
        const { error } = await supabase
          .from("contact_info")
          .insert([formData as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Contact info created" });
      }

      await refreshAdminData(['/rest/v1/contact_info'], ['contact-info']);
      setFormData({
        label: "",
        value: "",
        icon_name: "Mail",
        contact_type: "email",
        is_active: true,
        sort_order: 0,
      });
      setEditingId(null);
      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (contact: ContactInfo) => {
    setFormData(contact);
    setEditingId(contact.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact info?")) return;

    try {
      const { error } = await supabase
        .from("contact_info")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Contact info deleted" });
      await refreshAdminData(['/rest/v1/contact_info'], ['contact-info']);
      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      label: "",
      value: "",
      icon_name: "Mail",
      contact_type: "email",
      is_active: true,
      sort_order: 0,
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? "Edit Contact Info" : "Add Contact Info"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Email Support"
                required
              />
            </div>

            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., support@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="contact_type">Contact Type</Label>
              <Select
                value={formData.contact_type}
                onValueChange={(value) => setFormData({ ...formData, contact_type: value })}
              >
                <SelectTrigger id="contact_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="icon_name">Icon</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger id="icon_name">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => {
                    const IconComponent = (Icons as any)[icon];
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          <span>{icon}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">
              {editingId ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Contact Information List</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const IconComponent = (Icons as any)[contact.icon_name];
              return (
                <TableRow key={contact.id}>
                  <TableCell>
                    {IconComponent && <IconComponent className="h-5 w-5" />}
                  </TableCell>
                  <TableCell>{contact.label}</TableCell>
                  <TableCell>{contact.value}</TableCell>
                  <TableCell className="capitalize">{contact.contact_type}</TableCell>
                  <TableCell>
                    <span className={contact.is_active ? "text-green-600" : "text-gray-400"}>
                      {contact.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>{contact.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
