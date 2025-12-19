import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ImageIcon, 
  Download, 
  Loader2,
  Sparkles,
  Heart,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";

interface LibraryImage {
  id: string;
  title: string;
  imageUrl: string;
  style: string;
  prompt: string;
  isUserGenerated?: boolean;
}

// Pre-generated sample images for the library
const sampleImages: LibraryImage[] = [
  {
    id: "sample-1",
    title: "Cyberpunk City at Night",
    imageUrl: "https://images.unsplash.com/photo-1545128485-c400ce7b6892?w=800&q=80",
    style: "cyberpunk",
    prompt: "Futuristic cyberpunk city with neon lights and flying cars",
    isUserGenerated: false
  },
  {
    id: "sample-2",
    title: "Anime Character Portrait",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
    style: "anime",
    prompt: "Anime style character with detailed eyes and colorful hair",
    isUserGenerated: false
  },
  {
    id: "sample-3",
    title: "Watercolor Landscape",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
    style: "watercolor",
    prompt: "Beautiful watercolor painting of mountains and sunset",
    isUserGenerated: false
  },
  {
    id: "sample-4",
    title: "Oil Painting Portrait",
    imageUrl: "https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=800&q=80",
    style: "oil-painting",
    prompt: "Classical oil painting portrait in renaissance style",
    isUserGenerated: false
  },
  {
    id: "sample-5",
    title: "Minimalist Abstract",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
    style: "minimalist",
    prompt: "Clean minimalist geometric shapes and soft colors",
    isUserGenerated: false
  },
  {
    id: "sample-6",
    title: "Realistic Nature Photo",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    style: "realistic",
    prompt: "Ultra realistic mountain landscape with crystal clear lake",
    isUserGenerated: false
  }
];

interface AIImageLibraryProps {
  onUsePrompt?: (prompt: string, style: string) => void;
}

export function AIImageLibrary({ onUsePrompt }: AIImageLibraryProps) {
  const [images, setImages] = useState<LibraryImage[]>(sampleImages);
  const [userImages, setUserImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserImages();
    }
  }, [user]);

  const fetchUserImages = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_media')
        .select('*')
        .eq('user_id', user.uid)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedImages: LibraryImage[] = (data || []).map(img => ({
        id: img.id,
        title: img.title,
        imageUrl: img.file_url,
        style: img.style || 'default',
        prompt: img.prompt || '',
        isUserGenerated: true
      }));

      setUserImages(formattedImages);
    } catch (error) {
      console.error('Error fetching user images:', error);
    } finally {
      setLoading(false);
    }
  };

  const allImages = activeFilter === "my-images" 
    ? userImages 
    : activeFilter === "samples"
    ? sampleImages
    : [...userImages, ...sampleImages];

  const styleFilters = ["all", "my-images", "samples", "cyberpunk", "anime", "watercolor", "oil-painting", "minimalist", "realistic"];

  const filteredImages = activeFilter === "all" || activeFilter === "my-images" || activeFilter === "samples"
    ? allImages
    : allImages.filter(img => img.style === activeFilter);

  const handleDownload = (imageUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Image Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {styleFilters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className="capitalize"
            >
              {filter.replace('-', ' ')}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {activeFilter === "my-images" 
                ? "You haven't generated any images yet. Start creating!"
                : "No images found with this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-2">
                    <p className="text-white text-xs text-center mb-2 line-clamp-2">{img.title}</p>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => handleDownload(img.imageUrl, img.title)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {onUsePrompt && img.prompt && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => onUsePrompt(img.prompt, img.style)}
                          title="Use this prompt"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Style Badge */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 left-2 text-xs capitalize"
                >
                  {img.style.replace('-', ' ')}
                </Badge>
                
                {img.isUserGenerated && (
                  <Badge 
                    className="absolute top-2 right-2 text-xs bg-purple-500"
                  >
                    Yours
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}