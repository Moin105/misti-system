import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Eye } from "lucide-react";

interface WorkApplication {
  id: string;
  discord_name: string;
  email: string;
  phone_number: string | null;
  country: string;
  age: number;
  booster_type: string;
  services: string;
  games: string;
  boosting_experience: string;
  proof_urls: string[];
  marketplace_profiles: string | null;
  hours_available: string;
  how_found_us: string;
  status: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const formatApplicationDate = (app: WorkApplication): string => {
  const createdDate = app.created_at ? new Date(app.created_at) : null;
  const createdValid = Boolean(
    createdDate &&
      Number.isFinite(createdDate.getTime()) &&
      createdDate.getUTCFullYear() > 1971
  );
  if (createdValid && createdDate) return createdDate.toLocaleDateString();

  const updatedDate = app.updated_at ? new Date(app.updated_at) : null;
  const updatedValid = Boolean(
    updatedDate &&
      Number.isFinite(updatedDate.getTime()) &&
      updatedDate.getUTCFullYear() > 1971
  );
  if (updatedValid && updatedDate) return updatedDate.toLocaleDateString();

  return new Date().toLocaleDateString();
};

const WorkApplicationsManager = () => {
  const [applications, setApplications] = useState<WorkApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<WorkApplication | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('work_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        toast.error(`Failed to load applications: ${error.message}`);
        return;
      }
      
      setApplications(
        (data || []).map((app) => {
          const normalizedCreatedAt =
            app.created_at || app.updated_at || new Date().toISOString();
          const normalizedUpdatedAt =
            app.updated_at || app.created_at || normalizedCreatedAt;

          return {
            ...app,
            created_at: normalizedCreatedAt,
            updated_at: normalizedUpdatedAt,
            proof_urls: Array.isArray(app.proof_urls) ? app.proof_urls : [],
          };
        }) as WorkApplication[]
      );
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (application: WorkApplication) => {
    setSelectedApplication(application);
    setStatus(application.status);
    setNotes(application.notes || "");
    setViewDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedApplication) return;

    try {
      const { error } = await supabase
        .from('work_applications')
        .update({ status, notes })
        .eq('id', selectedApplication.id);

      if (error) throw error;

      await refreshAdminData(['/rest/v1/work_applications'], ['work-applications']);
      toast.success("Application updated successfully");
      fetchApplications();
      setViewDialog(false);
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error("Failed to update application");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;

    try {
      const { error } = await supabase
        .from('work_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshAdminData(['/rest/v1/work_applications'], ['work-applications']);
      toast.success("Application deleted successfully");
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error("Failed to delete application");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return '';
    }
  };

  if (loading) {
    return <div className="p-8">Loading applications...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Work Applications</h2>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Discord</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>{app.discord_name}</TableCell>
                <TableCell>{app.email}</TableCell>
                <TableCell>{app.country}</TableCell>
                <TableCell className="capitalize">{app.booster_type}</TableCell>
                <TableCell className={getStatusColor(app.status)}>{app.status}</TableCell>
                <TableCell>{formatApplicationDate(app)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(app)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(app.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discord Name</Label>
                  <p className="text-sm">{selectedApplication.discord_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedApplication.email}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm">{selectedApplication.phone_number || "N/A"}</p>
                </div>
                <div>
                  <Label>Country</Label>
                  <p className="text-sm">{selectedApplication.country}</p>
                </div>
                <div>
                  <Label>Age</Label>
                  <p className="text-sm">{selectedApplication.age}</p>
                </div>
                <div>
                  <Label>Booster Type</Label>
                  <p className="text-sm capitalize">{selectedApplication.booster_type}</p>
                </div>
              </div>

              <div>
                <Label>Services</Label>
                <p className="text-sm">{selectedApplication.services}</p>
              </div>

              <div>
                <Label>Games</Label>
                <p className="text-sm">{selectedApplication.games}</p>
              </div>

              <div>
                <Label>Experience</Label>
                <p className="text-sm">{selectedApplication.boosting_experience}</p>
              </div>

              <div>
                <Label>Hours Available</Label>
                <p className="text-sm">{selectedApplication.hours_available}</p>
              </div>

              <div>
                <Label>How Found Us</Label>
                <p className="text-sm">{selectedApplication.how_found_us}</p>
              </div>

              {selectedApplication.marketplace_profiles && (
                <div>
                  <Label>Marketplace Profiles</Label>
                  <p className="text-sm">{selectedApplication.marketplace_profiles}</p>
                </div>
              )}

              {selectedApplication.proof_urls.length > 0 && (
                <div>
                  <Label>Proof Files</Label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedApplication.proof_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        File {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                />
              </div>

              <Button onClick={handleUpdate} className="w-full">
                Update Application
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkApplicationsManager;
