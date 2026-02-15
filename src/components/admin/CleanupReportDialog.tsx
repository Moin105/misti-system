import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CleanupReport, deleteOrphanedFiles } from "@/lib/imageCleanup";
import { Loader2, Trash2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CleanupReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: CleanupReport | null;
  onCleanupComplete: () => void;
}

export const CleanupReportDialog = ({ open, onOpenChange, report, onCleanupComplete }: CleanupReportDialogProps) => {
  const [selectedOrphaned, setSelectedOrphaned] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  if (!report) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const toggleOrphaned = (filename: string) => {
    const newSet = new Set(selectedOrphaned);
    if (newSet.has(filename)) {
      newSet.delete(filename);
    } else {
      newSet.add(filename);
    }
    setSelectedOrphaned(newSet);
  };

  const selectAllOrphaned = () => {
    if (selectedOrphaned.size === report.orphanedFiles.length) {
      setSelectedOrphaned(new Set());
    } else {
      setSelectedOrphaned(new Set(report.orphanedFiles.map(f => f.filename)));
    }
  };

  const handleDeleteOrphaned = async () => {
    const filesToDelete = report.orphanedFiles.filter(f => selectedOrphaned.has(f.filename));
    
    if (filesToDelete.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to delete",
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteOrphanedFiles(filesToDelete);
      
      toast({
        title: "Cleanup Complete",
        description: `Deleted ${result.success} files, ${result.failed} failed`,
      });

      setSelectedOrphaned(new Set());
      onCleanupComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete orphaned files",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Cleanup Report</DialogTitle>
          <DialogDescription>
            Review and clean up orphaned files, broken references, and old format images
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="orphaned" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="orphaned">
              Orphaned Files ({report.orphanedFiles.length})
            </TabsTrigger>
            <TabsTrigger value="broken">
              Broken References ({report.brokenReferences.length})
            </TabsTrigger>
            <TabsTrigger value="old">
              Old Formats ({report.oldFormatFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orphaned" className="flex-1 overflow-auto space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Files in storage not referenced in any database records
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Total wasted space: {formatBytes(report.totalOrphanedSize)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllOrphaned}
                  >
                    {selectedOrphaned.size === report.orphanedFiles.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteOrphaned}
                    disabled={selectedOrphaned.size === 0 || deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedOrphaned.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {report.orphanedFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No orphaned files found - everything is clean!</p>
                  </div>
                ) : (
                  report.orphanedFiles.map((file) => (
                    <div key={file.filename} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedOrphaned.has(file.filename)}
                        onCheckedChange={() => toggleOrphaned(file.filename)}
                      />
                      <div className="flex-1">
                        <p className="font-mono text-sm">{file.filename}</p>
                        <p className="text-xs text-muted-foreground">{file.bucket} · {formatBytes(file.size)}</p>
                      </div>
                      <Badge variant="outline">{file.bucket}</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="broken" className="flex-1 overflow-auto">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Database records pointing to non-existent files in storage
              </p>

              <div className="space-y-2">
                {report.brokenReferences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No broken references - all database records are valid!</p>
                  </div>
                ) : (
                  report.brokenReferences.map((ref, idx) => (
                    <div key={idx} className="p-3 border rounded">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{ref.table}</Badge>
                            <Badge variant="outline">{ref.field}</Badge>
                            {ref.name && <span className="text-sm font-medium">{ref.name}</span>}
                          </div>
                          <p className="font-mono text-xs text-muted-foreground break-all">{ref.url}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="old" className="flex-1 overflow-auto">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                PNG/JPG files that could be converted to WebP format
              </p>

              <div className="space-y-2">
                {report.oldFormatFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>All images are using modern WebP format!</p>
                  </div>
                ) : (
                  report.oldFormatFiles.map((file, idx) => (
                    <div key={idx} className="p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-mono text-sm">{file.filename}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{file.bucket}</Badge>
                            {file.hasWebPEquivalent && (
                              <Badge variant="outline" className="bg-green-50">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                WebP exists
                              </Badge>
                            )}
                            {file.isReferenced && (
                              <Badge variant="outline" className="bg-yellow-50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Still in use
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
