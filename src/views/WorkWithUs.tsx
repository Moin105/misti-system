import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { signalPrerenderReady } from "@/lib/prerender";

const workApplicationSchema = z.object({
  discord_name: z.string().trim().min(1, "Discord name is required").max(100, "Discord name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone_number: z.string().trim().max(20, "Phone number must be less than 20 characters").optional().or(z.literal("")),
  country: z.string().trim().min(1, "Country is required").max(100, "Country must be less than 100 characters"),
  age: z.number().int("Age must be a whole number").min(13, "You must be at least 13 years old").max(100, "Please enter a valid age"),
  booster_type: z.string().trim().min(1, "Booster type is required").max(50, "Booster type must be less than 50 characters"),
  services: z.string().trim().min(10, "Please provide at least 10 characters").max(1000, "Services must be less than 1000 characters"),
  games: z.string().trim().min(1, "Games is required").max(500, "Games must be less than 500 characters"),
  boosting_experience: z.string().trim().min(10, "Please provide at least 10 characters").max(2000, "Experience must be less than 2000 characters"),
  marketplace_profiles: z.string().trim().max(500, "Marketplace profiles must be less than 500 characters").optional().or(z.literal("")),
  hours_available: z.string().trim().min(1, "Hours available is required").max(100, "Hours available must be less than 100 characters"),
  how_found_us: z.string().trim().min(1, "This field is required").max(500, "Must be less than 500 characters")
});

const fileSchema = z.object({
  size: z.number().max(10 * 1024 * 1024, "File size must be less than 10MB"),
  type: z.enum(["image/jpeg", "image/jpg", "image/png", "application/pdf"], {
    errorMap: () => ({ message: "Only JPEG, PNG, and PDF files are allowed" })
  })
});

const WorkWithUs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    discord_name: "",
    email: "",
    phone_number: "",
    country: "",
    age: "",
    booster_type: "",
    services: "",
    games: "",
    boosting_experience: "",
    marketplace_profiles: "",
    hours_available: "",
    how_found_us: "",
  });

  // Signal to prerender services when page is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      signalPrerenderReady();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate file count
      if (files.length > 5) {
        toast.error("Too many files", {
          description: "You can upload a maximum of 5 files"
        });
        e.target.value = "";
        return;
      }
      
      // Validate each file
      const validationErrors: string[] = [];
      for (const file of files) {
        const result = fileSchema.safeParse({ size: file.size, type: file.type });
        if (!result.success) {
          validationErrors.push(`${file.name}: ${result.error.errors[0].message}`);
        }
      }
      
      if (validationErrors.length > 0) {
        toast.error("Invalid files", {
          description: validationErrors.join("; ")
        });
        e.target.value = "";
        return;
      }
      
      setProofFiles(files);
      setErrors(prev => ({ ...prev, files: "" }));
    }
  };

  const uploadProofs = async () => {
    const uploadedUrls: string[] = [];
    
    for (const file of proofFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await supabase.functions.invoke('upload-work-application-proof', {
          body: formData,
        });

        if (response.error) {
          console.error('Upload error:', response.error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        if (response.data?.publicUrl) {
          uploadedUrls.push(response.data.publicUrl);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validationData = {
        ...formData,
        age: parseInt(formData.age)
      };
      
      const result = workApplicationSchema.safeParse(validationData);
      
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Validation Error", {
          description: "Please check the form for errors"
        });
        setLoading(false);
        return;
      }
      
      // Validate proof files
      if (proofFiles.length === 0) {
        toast.error("Proof required", {
          description: "Please upload at least one proof document"
        });
        setLoading(false);
        return;
      }

      const proofUrls = await uploadProofs();
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from('work_applications')
        .insert({
          discord_name: result.data.discord_name,
          email: result.data.email,
          phone_number: result.data.phone_number || null,
          country: result.data.country,
          age: result.data.age,
          booster_type: result.data.booster_type,
          services: result.data.services,
          games: result.data.games,
          boosting_experience: result.data.boosting_experience,
          marketplace_profiles: result.data.marketplace_profiles || null,
          hours_available: result.data.hours_available,
          how_found_us: result.data.how_found_us,
          status: "pending",
          proof_urls: proofUrls.length > 0 ? proofUrls : null,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      // Stay on the same page and refresh once to reset state/UI.
      setTimeout(() => navigate(0), 250);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Join Our Team - Become a Booster at misti.services"
        description="Apply to become a professional booster at misti.services. We're hiring experienced gamers for WoW, Diablo 4, Destiny 2 and more. Flexible hours, competitive pay."
        canonical="/work-with-us"
        keywords="gaming jobs, booster jobs, WoW booster, Destiny 2 booster, game boosting careers, work from home gaming jobs, misti.services careers"
      />
      <div className="min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-1 container mx-auto px-4 py-12 mt-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Work With Us</h1>
            <p className="text-muted-foreground mb-8">
              Join our team of professional boosters. Fill out the application below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="discord_name">Discord Name *</Label>
                  <Input
                    id="discord_name"
                    required
                    value={formData.discord_name}
                    onChange={(e) => handleInputChange("discord_name", e.target.value)}
                  />
                  {errors.discord_name && <p className="text-sm text-destructive mt-1">{errors.discord_name}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                  />
                  {errors.phone_number && <p className="text-sm text-destructive mt-1">{errors.phone_number}</p>}
                </div>

                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    required
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                  />
                  {errors.country && <p className="text-sm text-destructive mt-1">{errors.country}</p>}
                </div>

                <div>
                  <Label htmlFor="age">How old are you? *</Label>
                  <Input
                    id="age"
                    type="number"
                    required
                    min="13"
                    max="100"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                  />
                  {errors.age && <p className="text-sm text-destructive mt-1">{errors.age}</p>}
                </div>

                <div>
                  <Label htmlFor="booster_type">Type of Booster *</Label>
                  <Select
                    value={formData.booster_type}
                    onValueChange={(value) => handleInputChange("booster_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grp">Group</SelectItem>
                      <SelectItem value="solo">Solo</SelectItem>
                      <SelectItem value="reseller">Reseller</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.booster_type && <p className="text-sm text-destructive mt-1">{errors.booster_type}</p>}
                </div>

                <div>
                  <Label htmlFor="services">Type of Services You Can Do *</Label>
                  <Textarea
                    id="services"
                    required
                    value={formData.services}
                    onChange={(e) => handleInputChange("services", e.target.value)}
                    placeholder="Describe the services you can provide..."
                  />
                  {errors.services && <p className="text-sm text-destructive mt-1">{errors.services}</p>}
                </div>

                <div>
                  <Label htmlFor="games">Games You Can Work With *</Label>
                  <Textarea
                    id="games"
                    required
                    value={formData.games}
                    onChange={(e) => handleInputChange("games", e.target.value)}
                    placeholder="List the games you're experienced with..."
                  />
                  {errors.games && <p className="text-sm text-destructive mt-1">{errors.games}</p>}
                </div>

                <div>
                  <Label htmlFor="boosting_experience">Boosting Experience *</Label>
                  <Textarea
                    id="boosting_experience"
                    required
                    value={formData.boosting_experience}
                    onChange={(e) => handleInputChange("boosting_experience", e.target.value)}
                    placeholder="Describe your boosting experience..."
                  />
                  {errors.boosting_experience && <p className="text-sm text-destructive mt-1">{errors.boosting_experience}</p>}
                </div>

                <div>
                  <Label htmlFor="proof_files">Upload Proofs *</Label>
                  <Input
                    id="proof_files"
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5 files, 10MB each. Accepted: JPEG, PNG, PDF
                  </p>
                  {errors.files && <p className="text-sm text-destructive mt-1">{errors.files}</p>}
                </div>

                <div>
                  <Label htmlFor="marketplace_profiles">Marketplace Profiles</Label>
                  <Textarea
                    id="marketplace_profiles"
                    value={formData.marketplace_profiles}
                    onChange={(e) => handleInputChange("marketplace_profiles", e.target.value)}
                    placeholder="Links to your marketplace profiles (if any)..."
                  />
                  {errors.marketplace_profiles && <p className="text-sm text-destructive mt-1">{errors.marketplace_profiles}</p>}
                </div>

                <div>
                  <Label htmlFor="hours_available">How Many Hours Can You Work? *</Label>
                  <Input
                    id="hours_available"
                    required
                    value={formData.hours_available}
                    onChange={(e) => handleInputChange("hours_available", e.target.value)}
                    placeholder="e.g., 20 hours per week"
                  />
                  {errors.hours_available && <p className="text-sm text-destructive mt-1">{errors.hours_available}</p>}
                </div>

                <div>
                  <Label htmlFor="how_found_us">How Did You Find Us? *</Label>
                  <Textarea
                    id="how_found_us"
                    required
                    value={formData.how_found_us}
                    onChange={(e) => handleInputChange("how_found_us", e.target.value)}
                    placeholder="Tell us how you discovered our services..."
                  />
                  {errors.how_found_us && <p className="text-sm text-destructive mt-1">{errors.how_found_us}</p>}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default WorkWithUs;
