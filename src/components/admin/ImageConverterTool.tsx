import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  convertImageToWebP, 
  getImageFileName, 
  replaceExtensionWithWebP,
  updateProductImageReferences,
  updateBlogPostImageReferences,
  updateGameImageReferences,
  checkIfStillReferenced,
  ConversionResult 
} from "@/lib/imageConversion";
import { generateCleanupReport, CleanupReport } from "@/lib/imageCleanup";
import { CleanupReportDialog } from "./CleanupReportDialog";
import { Loader2, Download, Trash2, CheckCircle2, XCircle, FileSearch, AlertTriangle } from "lucide-react";

interface StorageFile {
  name: string;
  size: number;
  selected: boolean;
}

export const ImageConverterTool = () => {
  const [bucket, setBucket] = useState<"game-images" | "blog_images">("game-images");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quality, setQuality] = useState([85]);
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [updateReferences, setUpdateReferences] = useState(true);
  const [showOnlyConvertible, setShowOnlyConvertible] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToConvert, setTotalToConvert] = useState(0);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [bucket]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const allFiles: StorageFile[] = [];
      let offset = 0;
      const limit = 1000;

      // Fetch ALL files with pagination
      while (true) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list('', { limit, offset });
        
        if (error) throw error;
        if (!data || data.length === 0) break;

        // Filter and process image files
        const imageFiles = data
          .filter(file => file.name.match(/\.(png|jpg|jpeg|webp)$/i))
          .map(file => ({
            name: file.name,
            size: file.metadata?.size || 0,
            selected: false
          }));

        allFiles.push(...imageFiles);
        
        offset += limit;
        if (data.length < limit) break; // Last page
      }

      console.log(`Fetched ${allFiles.length} images from ${bucket}`);
      setFiles(allFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to fetch images from storage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isConvertible = (filename: string) => {
    return filename.match(/\.(png|jpg|jpeg)$/i) !== null;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !showOnlyConvertible || isConvertible(file.name);
    return matchesSearch && matchesFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showOnlyConvertible, bucket]);

  const toggleSelectAll = () => {
    const allSelected = filteredFiles.every(f => f.selected);
    setFiles(files.map(file => {
      if (filteredFiles.find(ff => ff.name === file.name)) {
        return { ...file, selected: !allSelected };
      }
      return file;
    }));
  };

  const toggleSelect = (filename: string) => {
    setFiles(files.map(file => 
      file.name === filename ? { ...file, selected: !file.selected } : file
    ));
  };

  const convertImage = async (filename: string): Promise<ConversionResult & { updateDetails?: any[] }> => {
    try {
      // Download original
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(filename);

      if (downloadError || !downloadData) {
        throw new Error(`Failed to download ${filename}`);
      }

      const originalSize = downloadData.size;
      const newFilename = replaceExtensionWithWebP(filename);

      if (dryRun) {
        // Dry run - just simulate
        return {
          success: true,
          originalPath: filename,
          newPath: newFilename,
          originalSize,
          newSize: Math.round(originalSize * (quality[0] / 100) * 0.7), // Estimate
        };
      }

      // Convert to WebP
      const webpBlob = await convertImageToWebP(downloadData, quality[0] / 100);

      // Upload WebP
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(newFilename, webpBlob, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${newFilename}: ${uploadError.message}`);
      }

      // Verify upload succeeded
      const { data: verifyData } = await supabase.storage
        .from(bucket)
        .list('', { search: newFilename });
      
      if (!verifyData || verifyData.length === 0) {
        throw new Error(`Upload verification failed for ${newFilename}`);
      }

      const updateDetails: any[] = [];

      // Update database references if enabled
      if (updateReferences) {
        const { data: { publicUrl: oldUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filename);

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(newFilename);

        const [productResult, blogResult, gameResult] = await Promise.all([
          updateProductImageReferences(oldUrl, newUrl),
          updateBlogPostImageReferences(oldUrl, newUrl),
          updateGameImageReferences(oldUrl, newUrl)
        ]);

        updateDetails.push(...productResult.details, ...blogResult.details, ...gameResult.details);
        console.log(`Database updates: Products=${productResult.count}, Blogs=${blogResult.count}, Games=${gameResult.count}`);
      }

      // Delete original if enabled AND verified
      if (deleteOriginals && filename !== newFilename) {
        // Final verification that nothing still references the old file
        const { data: { publicUrl: oldUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filename);

        const stillReferenced = await checkIfStillReferenced(oldUrl);
        
        if (stillReferenced) {
          console.warn(`⚠️ Skipping deletion of ${filename} - still referenced in database`);
        } else {
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove([filename]);

          if (deleteError) {
            console.error(`Failed to delete ${filename}:`, deleteError);
          } else {
            console.log(`✓ Deleted original: ${filename}`);
          }
        }
      }

      return {
        success: true,
        originalPath: filename,
        newPath: newFilename,
        originalSize,
        newSize: webpBlob.size,
        updateDetails
      };
    } catch (error) {
      return {
        success: false,
        originalPath: filename,
        originalSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const handleConvert = async () => {
    const selectedFiles = files.filter(f => f.selected && isConvertible(f.name));
    
    if (selectedFiles.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one PNG or JPG image to convert",
        variant: "destructive"
      });
      return;
    }

    if (dryRun) {
      toast({
        title: "Dry Run Mode",
        description: "Running in simulation mode - no files will be modified",
      });
    }

    setConverting(true);
    setProgress(0);
    setTotalToConvert(selectedFiles.length);
    setResults([]);

    const conversionResults: (ConversionResult & { updateDetails?: any[] })[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const result = await convertImage(file.name);
      conversionResults.push(result);
      setProgress(((i + 1) / selectedFiles.length) * 100);
    }

    setResults(conversionResults);
    setConverting(false);

    // Show summary
    const successful = conversionResults.filter(r => r.success).length;
    const failed = conversionResults.length - successful;
    const totalSaved = conversionResults
      .filter(r => r.success && r.newSize)
      .reduce((acc, r) => acc + (r.originalSize - r.newSize!), 0);

    const totalUpdates = conversionResults
      .filter(r => r.updateDetails)
      .reduce((acc, r) => acc + (r.updateDetails?.length || 0), 0);

    toast({
      title: dryRun ? "Dry Run Complete" : "Conversion Complete",
      description: `${successful} images ${dryRun ? 'simulated' : 'converted'}${failed > 0 ? `, ${failed} failed` : ''}. ${dryRun ? 'Would save' : 'Saved'} ${(totalSaved / 1024 / 1024).toFixed(2)} MB. ${totalUpdates} DB records updated.`,
    });

    if (!dryRun) {
      // Disable "show only convertible" filter to see converted WebP files
      if (showOnlyConvertible) {
        setShowOnlyConvertible(false);
      }

      // Wait for storage to sync, then refresh
      setTimeout(() => {
        fetchFiles();
      }, 2000);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const report = await generateCleanupReport(["game-images", "blog_images"]);
      setCleanupReport(report);
      setShowCleanupDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate cleanup report",
        variant: "destructive"
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Image Format Converter</h2>
          <p className="text-muted-foreground">
            Convert PNG and JPG images to WebP format with complete database sync verification
          </p>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          variant="outline"
        >
          {generatingReport ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FileSearch className="mr-2 h-4 w-4" />
              Cleanup Report
            </>
          )}
        </Button>
      </div>

      <Tabs value={bucket} onValueChange={(v) => setBucket(v as any)}>
        <TabsList>
          <TabsTrigger value="game-images">
            Game Images
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {files.filter(f => f.name.includes('game-images') || bucket === 'game-images').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blog_images">
            Blog Images
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {files.filter(f => f.name.includes('blog_images') || bucket === 'blog_images').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={bucket} className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Quality ({quality[0]}%)</Label>
                  <Slider
                    value={quality}
                    onValueChange={setQuality}
                    min={60}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Higher quality = larger file size
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="update-refs"
                      checked={updateReferences}
                      onCheckedChange={(checked) => setUpdateReferences(checked as boolean)}
                    />
                    <Label htmlFor="update-refs" className="font-normal cursor-pointer">
                      Update database references
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="delete-originals"
                      checked={deleteOriginals}
                      onCheckedChange={(checked) => setDeleteOriginals(checked as boolean)}
                    />
                    <Label htmlFor="delete-originals" className="font-normal cursor-pointer">
                      Delete original files after conversion
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dry-run"
                      checked={dryRun}
                      onCheckedChange={(checked) => setDryRun(checked as boolean)}
                    />
                    <Label htmlFor="dry-run" className="font-normal cursor-pointer">
                      Dry run (simulate without changes)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-convertible"
                    checked={showOnlyConvertible}
                    onCheckedChange={(checked) => setShowOnlyConvertible(checked as boolean)}
                  />
                  <Label htmlFor="show-convertible" className="font-normal cursor-pointer">
                    Show only PNG/JPG
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={toggleSelectAll} variant="outline" size="sm">
                  {filteredFiles.every(f => f.selected) ? "Deselect All" : "Select All"}
                </Button>
                <Button 
                  onClick={handleConvert} 
                  disabled={converting || !files.some(f => f.selected)}
                  variant={dryRun ? "outline" : "default"}
                >
                  {converting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {dryRun ? 'Simulating' : 'Converting'}... {Math.round(progress)}%
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {dryRun ? 'Simulate' : 'Convert'} Selected
                    </>
                  )}
                </Button>
                <Button onClick={fetchFiles} variant="outline" size="sm" disabled={loading}>
                  Refresh
                </Button>
                <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                  <span>Total: {files.length} files</span>
                  <span>•</span>
                  <span>Showing: {filteredFiles.length}</span>
                </div>
              </div>

              {converting && (
                <div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {dryRun ? 'Simulating' : 'Converting'} image {Math.round((progress / 100) * totalToConvert)} of {totalToConvert}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {results.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">
                {dryRun ? 'Simulation' : 'Conversion'} Results
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="p-3 rounded border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-mono text-sm">{getImageFileName(result.originalPath)}</span>
                        {dryRun && <Badge variant="outline">Simulated</Badge>}
                      </div>
                      {result.success && result.newSize ? (
                        <span className="text-muted-foreground text-sm">
                          {formatBytes(result.originalSize)} → {formatBytes(result.newSize)} 
                          <span className="text-green-600 ml-2">
                            ({Math.round((1 - result.newSize / result.originalSize) * 100)}% saved)
                          </span>
                        </span>
                      ) : (
                        <span className="text-red-500 text-sm">{result.error}</span>
                      )}
                    </div>
                    {result.updateDetails && result.updateDetails.length > 0 && (
                      <div className="text-xs text-muted-foreground pl-6">
                        Updated {result.updateDetails.length} database record(s):
                        {result.updateDetails.slice(0, 3).map((detail, i) => (
                          <div key={i} className="ml-2">
                            • {detail.table}: {detail.name} ({detail.fields.join(', ')})
                          </div>
                        ))}
                        {result.updateDetails.length > 3 && (
                          <div className="ml-2">... and {result.updateDetails.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={filteredFiles.length > 0 && filteredFiles.every(f => f.selected)}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left">Preview</th>
                    <th className="p-3 text-left">Filename</th>
                    <th className="p-3 text-left">Format</th>
                    <th className="p-3 text-left">Size</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading all images...</p>
                      </td>
                    </tr>
                  ) : filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No images found
                      </td>
                    </tr>
                  ) : (
                    paginatedFiles.map((file) => {
                      const { data: { publicUrl } } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(file.name);
                      
                      const ext = file.name.split('.').pop()?.toUpperCase() || '';
                      const convertible = isConvertible(file.name);

                      return (
                        <tr key={file.name} className="border-t hover:bg-muted/50">
                          <td className="p-3">
                            <Checkbox
                              checked={file.selected}
                              onCheckedChange={() => toggleSelect(file.name)}
                              disabled={!convertible}
                            />
                          </td>
                          <td className="p-3">
                            <img 
                              src={publicUrl} 
                              alt={file.name}
                              className="h-12 w-12 object-cover rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '';
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </td>
                          <td className="p-3 font-mono text-sm">{file.name}</td>
                          <td className="p-3">
                            <Badge variant={ext === 'WEBP' ? 'default' : 'secondary'}>
                              {ext}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{formatBytes(file.size)}</td>
                          <td className="p-3 text-sm">
                            {ext === 'WEBP' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Optimized
                              </span>
                            ) : convertible ? (
                              <span className="text-orange-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Convertible
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredFiles.length)} of {filteredFiles.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CleanupReportDialog
        open={showCleanupDialog}
        onOpenChange={setShowCleanupDialog}
        report={cleanupReport}
        onCleanupComplete={() => {
          fetchFiles();
          handleGenerateReport();
        }}
      />
    </div>
  );
};
