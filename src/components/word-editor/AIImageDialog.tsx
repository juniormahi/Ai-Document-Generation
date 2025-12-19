import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Image as ImageIcon, AlertTriangle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/hooks/useFirebaseAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AIImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (imageUrl: string, caption: string) => void;
}

const STYLE_OPTIONS = [
  { value: 'professional diagram', label: 'Professional Diagram' },
  { value: 'infographic', label: 'Infographic' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'chart', label: 'Chart/Graph' },
  { value: 'icon', label: 'Icon/Symbol' },
  { value: 'realistic photo', label: 'Realistic Photo' },
];

export function AIImageDialog({ open, onOpenChange, onImageGenerated }: AIImageDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('professional diagram');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [isPaidUser, setIsPaidUser] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user has paid subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.uid) {
        setIsPaidUser(false);
        return;
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.uid)
        .eq('status', 'active')
        .single();

      setIsPaidUser(!!subscription);
    };

    if (open) {
      checkSubscription();
    }
  }, [user?.uid, open]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the image you want to generate",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setPreviewImage(null);
    setLimitReached(false);

    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-document-image', {
        body: { 
          prompt: prompt.trim(), 
          style,
          userId: user?.uid 
        },
        headers,
      });

      if (error) {
        // Check if it's a subscription/limit error
        if (error.message?.includes('Subscription required') || error.context?.status === 403) {
          setIsPaidUser(false);
          toast({
            title: "Subscription required",
            description: "AI Image Generation is available for paid subscribers only.",
            variant: "destructive",
          });
          return;
        }
        if (error.message?.includes('limit') || error.context?.status === 429) {
          setLimitReached(true);
          toast({
            title: "Image limit reached",
            description: "You've reached your daily image generation limit.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      
      if (data?.error) {
        if (data.error === "Subscription required") {
          setIsPaidUser(false);
          toast({
            title: "Subscription required",
            description: data.message || "Upgrade to unlock AI image generation",
            variant: "destructive",
          });
          return;
        }
        if (data.error === "Image limit reached") {
          setLimitReached(true);
          toast({
            title: "Image limit reached",
            description: data.message || "You've reached your daily limit",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.message || data.error);
      }
      
      if (!data?.image_url) throw new Error('No image generated');

      setPreviewImage(data.image_url);
      
      toast({
        title: "Image generated!",
        description: "Click 'Insert' to add it to your document",
      });
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (previewImage) {
      onImageGenerated(previewImage, prompt);
      setPrompt('');
      setPreviewImage(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setPreviewImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate AI Image
          </DialogTitle>
          <DialogDescription>
            Describe the image you want to create and AI will generate it for your document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Image Description</Label>
            <Textarea
              id="prompt"
              placeholder="E.g., A flowchart showing the software development lifecycle with 6 stages..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={style === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStyle(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-muted/30">
            {isPaidUser === false ? (
              <div className="flex flex-col items-center gap-3 text-center p-4">
                <Lock className="h-10 w-10 text-primary" />
                <p className="font-medium">Premium Feature</p>
                <p className="text-sm text-muted-foreground">
                  AI Image Generation is available for Standard and Premium subscribers only.
                </p>
                <Button onClick={() => navigate('/subscription')} className="mt-2">
                  Upgrade Now
                </Button>
              </div>
            ) : limitReached ? (
              <div className="flex flex-col items-center gap-3 text-center p-4">
                <AlertTriangle className="h-10 w-10 text-orange-500" />
                <p className="font-medium">Image Limit Reached</p>
                <p className="text-sm text-muted-foreground">
                  You've reached your daily image limit. Try again tomorrow!
                </p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating your image...</p>
              </div>
            ) : previewImage ? (
              <img 
                src={previewImage} 
                alt="Generated preview" 
                className="max-w-full max-h-[300px] rounded-lg shadow-md"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12" />
                <p className="text-sm">Image preview will appear here</p>
                <p className="text-xs">Standard: 50/day • Premium: 100/day</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {isPaidUser === false ? (
              <Button onClick={() => navigate('/subscription')}>
                Upgrade to Generate
              </Button>
            ) : previewImage ? (
              <>
                <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                  Regenerate
                </Button>
                <Button onClick={handleInsert}>
                  Insert Image
                </Button>
              </>
            ) : (
              <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
