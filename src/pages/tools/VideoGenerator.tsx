import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { 
  Video, 
  Sparkles, 
  Download, 
  Loader2, 
  Upload,
  ImageIcon,
  Clock,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditLimit, setCreditLimit] = useState(2);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }
      
      try {
        // Check user role for tier
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.uid)
          .maybeSingle();
        
        const role = roleData?.role || 'free';
        const premium = role === 'premium';
        const standard = role === 'standard';
        setIsPremium(premium);
        
        // Set limits based on tier: Free=2, Standard=10, Premium=30
        setCreditLimit(premium ? 30 : standard ? 10 : 2);

        // Check today's usage
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('usage_tracking')
          .select('videos_generated')
          .eq('user_id', user.uid)
          .eq('date', today)
          .single();

        setCreditsUsed(usageData?.videos_generated || 0);
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !imageUrl) {
      toast({
        title: "Input required",
        description: "Please enter a prompt or upload an image.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate videos.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedVideo(null);

    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { imageUrl, prompt, duration, saveToGallery: true },
        headers
      });

      if (error) {
        if (error.message?.includes('403') || error.message?.includes('Credit')) {
          toast({
            title: "Credit Limit Reached",
            description: data?.message || "You've used all your video credits for this month.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (data?.videoUrl) {
        setGeneratedVideo(data.videoUrl);
        setCreditsUsed(data.creditsUsed || 0);
        toast({
          title: "Video Generated!",
          description: data.note || "Your AI video has been created.",
        });
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;
    
    const link = document.createElement('a');
    link.href = generatedVideo;
    link.download = `ai-video-${Date.now()}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <DashboardLayout>
      <SEO
        title="AI Video Generator - Image to Video | mydocmaker"
        description="Transform images into stunning videos with AI. Create animated content from static images in seconds."
        keywords="ai video generator, image to video, ai animation, video creation"
        canonical="/tools/video-generator"
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">AI Video Generator</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your images into stunning animated videos with AI
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
                    Daily Video Credits
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {creditsUsed} / {creditLimit} used
                  </span>
                </div>
                <Progress value={(creditsUsed / creditLimit) * 100} className="h-2" />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted-foreground">
                    {creditLimit - creditsUsed} credits remaining today
                  </p>
                  {!isPremium && (
                    <a href="/dashboard/subscription" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <span className="w-3 h-3">👑</span>
                      Upgrade for more
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Create Your Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Upload */}
                <div>
                  <Label className="mb-2 block">Upload an image (optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImagePreview(null);
                            setImageUrl("");
                            setImageFile(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <Label className="mb-2 block">
                    {imageUrl ? "Describe the animation" : "Describe your video"}
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={imageUrl 
                      ? "Add gentle motion, zoom slowly, make clouds move..."
                      : "A serene beach at sunset with waves rolling in..."
                    }
                    className="min-h-[100px] resize-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration: {duration} seconds
                  </Label>
                  <input
                    type="range"
                    min={3}
                    max={10}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || (!prompt.trim() && !imageUrl) || creditsUsed >= creditLimit}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Video...
                    </>
                  ) : creditsUsed >= creditLimit ? (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      No Credits Remaining
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Generate Video (1 credit)
                    </>
                  )}
                </Button>
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
                  <Video className="w-5 h-5" />
                  Generated Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Creating your video...</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
                  </div>
                ) : generatedVideo ? (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={generatedVideo}
                        alt="Video Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Video preview (full video generation coming soon)
                    </p>
                    <Button onClick={handleDownload} className="w-full" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Preview
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20">
                    <ImageIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Your video will appear here</p>
                    <p className="text-sm text-muted-foreground mt-1">Upload an image or enter a prompt</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
