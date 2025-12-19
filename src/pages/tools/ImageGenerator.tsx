import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { AIImageLibrary } from "@/components/AIImageLibrary";
import { 
  ImageIcon, 
  Sparkles, 
  Download, 
  Loader2, 
  Wand2,
  Crown,
  Palette,
  Grid3X3,
  Edit,
  Library,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Slider } from "@/components/ui/slider";

const styles = [
  { value: "realistic", label: "Realistic", icon: "📷" },
  { value: "artistic", label: "Artistic", icon: "🎨" },
  { value: "anime", label: "Anime", icon: "🎎" },
  { value: "watercolor", label: "Watercolor", icon: "💧" },
  { value: "oil-painting", label: "Oil Painting", icon: "🖼️" },
  { value: "cyberpunk", label: "Cyberpunk", icon: "🌆" },
  { value: "minimalist", label: "Minimalist", icon: "◻️" },
  { value: "cartoon", label: "Cartoon", icon: "🎭" },
  { value: "3d", label: "3D Render", icon: "🧊" },
  { value: "vintage", label: "Vintage", icon: "📜" },
];

const examplePrompts = [
  "A serene mountain landscape at sunset with a crystal clear lake",
  "A futuristic city with flying cars and neon lights",
  "A cozy coffee shop interior with warm lighting and books",
  "An astronaut riding a horse on Mars",
];

interface GeneratedImage {
  imageUrl: string;
  description: string;
}

export default function ImageGenerator() {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // Credits state
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditLimit, setCreditLimit] = useState(10);
  
  // Edit tab state
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }
      
      try {
        // Check premium status
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.uid)
          .eq('status', 'active')
          .maybeSingle();
        
        const premium = !!subData;
        setIsPremium(premium);
        setCreditLimit(premium ? 100 : 10);

        // Check today's usage
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('usage_tracking')
          .select('images_generated')
          .eq('user_id', user.uid)
          .eq('date', today)
          .single();

        setCreditsUsed(usageData?.images_generated || 0);
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for your image.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate images.",
        variant: "destructive",
      });
      return;
    }

    if (creditsUsed >= creditLimit) {
      toast({
        title: "Daily limit reached",
        description: `You've used all ${creditLimit} image credits for today.${!isPremium ? ' Upgrade to Pro for 100 daily credits!' : ' Credits reset tomorrow.'}`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, style, count, saveToGallery: true },
        headers
      });

      if (error) {
        if (error.message?.includes('403') || error.message?.includes('Credit')) {
          toast({
            title: "Credit Limit Reached",
            description: data?.message || "You've used all your image credits for today.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (data?.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        setCreditsUsed(data.creditsUsed || creditsUsed + data.images.length);
        toast({
          title: "Images Generated!",
          description: `${data.images.length} image(s) created. ${data.creditsRemaining} credits remaining today.`,
        });
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!editImageUrl.trim() || !editPrompt.trim()) {
      toast({
        title: "Input required",
        description: "Please provide an image URL and edit instructions.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to edit images.",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    setEditedImage(null);

    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: { imageUrl: editImageUrl, editPrompt, saveToGallery: true },
        headers
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setEditedImage(data.imageUrl);
        setCreditsUsed(prev => prev + 1);
        toast({
          title: "Image Edited!",
          description: "Your edited image has been saved to gallery.",
        });
      }
    } catch (error: any) {
      console.error('Image edit error:', error);
      toast({
        title: "Edit Failed",
        description: error.message || "Failed to edit image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `ai-image-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download image. Try right-clicking and saving.",
        variant: "destructive",
      });
    }
  };

  const useGeneratedImageForEdit = (imageUrl: string) => {
    setEditImageUrl(imageUrl);
    setActiveTab("edit");
    toast({
      title: "Image Selected",
      description: "You can now edit this image with AI.",
    });
  };

  const handleUsePrompt = (promptText: string, styleValue: string) => {
    setPrompt(promptText);
    setStyle(styleValue);
    setActiveTab("generate");
    toast({
      title: "Prompt Loaded",
      description: "You can now generate images with this prompt.",
    });
  };

  if (checkingStatus) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const creditsRemaining = creditLimit - creditsUsed;

  return (
    <DashboardLayout>
      <SEO
        title="AI Image Generator - Create Stunning Images | mydocmaker"
        description="Generate beautiful AI images from text descriptions. Create realistic, artistic, anime, watercolor, oil painting, cyberpunk and more styles in seconds."
        keywords="ai image generator, text to image, ai art, image creation, anime art, cyberpunk art"
        canonical="/tools/image-generator"
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 mb-4">
            <ImageIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">AI Image Generator</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your ideas into stunning visuals with AI-powered image generation
          </p>
        </motion.div>

        {/* Credits Display */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Daily Credits
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {creditsUsed} / {creditLimit} used
                  </span>
                </div>
                <Progress value={(creditsUsed / creditLimit) * 100} className="h-2" />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted-foreground">
                    {creditsRemaining} credits remaining today
                  </p>
                  {!isPremium && (
                    <Link to="/dashboard/subscription" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Upgrade for 100/day
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="max-w-lg mx-auto text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Sign In to Generate</h2>
                <p className="text-muted-foreground mb-6">
                  Create an account to get 10 free image credits every day!
                </p>
                <Link to="/login">
                  <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Sign In to Start
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="library" className="flex items-center gap-2">
                <Library className="w-4 h-4" />
                Library
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5" />
                        Create Your Images
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Describe your image
                        </label>
                        <Textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="A magical forest with glowing mushrooms and fairy lights..."
                          className="min-h-[120px] resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Style</label>
                        <Select value={style} onValueChange={setStyle}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {styles.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className="flex items-center gap-2">
                                  <span>{s.icon}</span>
                                  <span>{s.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Grid3X3 className="w-4 h-4" />
                          Number of variations: {count}
                        </label>
                        <Slider
                          value={[count]}
                          onValueChange={(v) => setCount(v[0])}
                          min={1}
                          max={4}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Generate up to 4 variations ({count} credits)
                        </p>
                      </div>

                      <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !prompt.trim() || creditsUsed >= creditLimit}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating {count} image{count > 1 ? 's' : ''}...
                          </>
                        ) : creditsUsed >= creditLimit ? (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            No Credits Remaining
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate {count} Image{count > 1 ? 's' : ''} ({count} credit{count > 1 ? 's' : ''})
                          </>
                        )}
                      </Button>

                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Try these prompts:
                        </p>
                        <div className="space-y-2">
                          {examplePrompts.map((example, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPrompt(example)}
                              className="w-full text-left text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Output Section */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Generated Images
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isGenerating ? (
                        <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center">
                          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Creating your masterpiece{count > 1 ? 's' : ''}...</p>
                        </div>
                      ) : generatedImages.length > 0 ? (
                        <div className={`grid gap-4 ${generatedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {generatedImages.map((img, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                                <img
                                  src={img.imageUrl}
                                  alt={`Generated ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleDownload(img.imageUrl, idx)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => useGeneratedImageForEdit(img.imageUrl)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-square bg-muted/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20">
                          <ImageIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground">Your generated images will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="edit">
              <div className="grid lg:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="w-5 h-5" />
                        Edit an Image
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Image URL or base64
                        </label>
                        <Textarea
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          placeholder="Paste an image URL or data:image/... base64 string"
                          className="min-h-[80px] resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Edit instructions
                        </label>
                        <Textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder="Make the sky purple, add a rainbow, change the style to watercolor..."
                          className="min-h-[100px] resize-none"
                        />
                      </div>

                      <Button 
                        onClick={handleEdit} 
                        disabled={isEditing || !editImageUrl.trim() || !editPrompt.trim() || creditsUsed >= creditLimit}
                        className="w-full"
                      >
                        {isEditing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Editing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Edit Image (1 credit)
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Edited Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center">
                          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Editing your image...</p>
                        </div>
                      ) : editedImage ? (
                        <div className="space-y-4">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                            <img
                              src={editedImage}
                              alt="Edited result"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            onClick={() => handleDownload(editedImage, 0)}
                            className="w-full"
                            variant="outline"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Edited Image
                          </Button>
                        </div>
                      ) : (
                        <div className="aspect-square bg-muted/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20">
                          <Edit className="w-16 h-16 text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground">Your edited image will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="library">
              <AIImageLibrary onUsePrompt={handleUsePrompt} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}