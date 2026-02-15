import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Check, X, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  og_image: string | null;
  image_alt_text: string | null;
  category_id: string;
  categories: {
    name: string;
    game_id: string;
    games: {
      name: string;
    };
  };
}

interface Game {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export const BulkImageUploader = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [imageStatus, setImageStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedGame, selectedCategory, imageStatus, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch games
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      // Fetch products with related data
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          image_url,
          og_image,
          image_alt_text,
          category_id,
          categories (
            name,
            game_id,
            games (
              name
            )
          )
        `)
        .eq("is_active", true)
        .order("name");

      setGames(gamesData || []);
      setCategories(categoriesData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by game
    if (selectedGame !== "all") {
      filtered = filtered.filter(
        (p) => p.categories?.game_id === selectedGame
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    // Filter by image status
    if (imageStatus === "missing") {
      filtered = filtered.filter((p) => !p.image_url);
    } else if (imageStatus === "has") {
      filtered = filtered.filter((p) => p.image_url);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const formatSlugToAltText = (slug: string): string => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleImageUpload = async (
    productId: string,
    productSlug: string,
    file: File
  ) => {
    try {
      setUploadingId(productId);

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const fileName = `${productSlug}-${timestamp}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("game-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("game-images").getPublicUrl(fileName);

      // Format slug as alt text
      const altText = formatSlugToAltText(productSlug);

      // Update product with all image fields
      const { error: updateError } = await supabase
        .from("products")
        .update({
          image_url: publicUrl,
          og_image: publicUrl,
          image_alt_text: altText,
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Image uploaded and product updated",
      });

      // Refresh products
      fetchData();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const triggerFileInput = (productId: string, productSlug: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(productId, productSlug, file);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Image Upload</h2>
        <p className="text-muted-foreground">
          Upload images to products. Images will automatically populate image_url, og_image, and alt_text fields.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {games.map((game) => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={imageStatus} onValueChange={setImageStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Image Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="missing">Missing Images</SelectItem>
              <SelectItem value="has">Has Images</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Preview</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.slug}
                  </TableCell>
                  <TableCell>{product.categories?.games?.name || "N/A"}</TableCell>
                  <TableCell>{product.categories?.name || "N/A"}</TableCell>
                  <TableCell className="text-center">
                    {product.image_url ? (
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.image_alt_text || product.name}
                        className="h-12 w-12 object-cover rounded mx-auto"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      onClick={() => triggerFileInput(product.id, product.slug)}
                      disabled={uploadingId === product.id}
                    >
                      {uploadingId === product.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {product.image_url ? "Replace" : "Upload"}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredProducts.length} of {products.length} products
      </div>
    </div>
  );
};
