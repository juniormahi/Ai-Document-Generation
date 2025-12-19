import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Presentation, ChevronLeft, ChevronRight, Edit, FileText, Download, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createPptxFile } from "@/lib/fileGenerators";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ThemeSelector, Theme } from "@/components/ThemeSelector";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { SEO } from "@/components/SEO";
import { fileHistoryDb, userRolesDb } from "@/lib/databaseProxy";
import { ToolHero, PromptInput, InsightCard, ToolSuggestionCards } from "@/components/tools";
import { DocumentAssistantChat } from "@/components/tools/DocumentAssistantChat";
import type { ChatSettings } from "@/components/tools/ChatSettingsPanel";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { createPdfFromPresentation } from "@/lib/pdfBuilder";
import { SEOArticle } from "@/components/seo/SEOArticle";
import { aiPresentationGeneratorArticle } from "@/data/toolSEOArticles";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useEffect } from "react";

export default function PresentationMaker() {
  const { user, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState("10");
  const [loading, setLoading] = useState(false);
  const [presentationData, setPresentationData] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user?.uid) return;
      const isPremiumUser = await userRolesDb.isPremium();
      setIsPremium(isPremiumUser);
    };
    checkPremiumStatus();
  }, [user?.uid]);

  const asText = (value: any): string => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "text" in value) {
      const t = (value as any).text;
      return typeof t === "string" ? t : String(t ?? "");
    }
    if (value == null) return "";
    return String(value);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter what you want the presentation to be about",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPresentationData(null);
    setCurrentSlide(0);

    try {
      const prompt = selectedTheme 
        ? `${topic}\n\nStyle: ${selectedTheme.name} theme`
        : topic;

      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: { topic: prompt, slideCount: parseInt(slideCount) },
        headers
      });

      if (error) throw error;
      if (!data) throw new Error("No content generated");

      setPresentationData(data);

      await fileHistoryDb.insert({
        title: data.presentation_title,
        content: JSON.stringify(data),
        file_type: 'presentation',
      });

      toast({
        title: "Presentation generated!",
        description: "Your presentation is ready",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate presentation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatMessage = async (message: string, settings?: ChatSettings): Promise<string> => {
    try {
      let prompt = `Current presentation:
${JSON.stringify(presentationData, null, 2)}

User request: ${message}

Please update the presentation based on the user's request. Return the updated presentation in the same JSON format.`;

      if (settings) {
        const lengthMap = { short: "brief", medium: "moderate", long: "comprehensive" };
        prompt += `

Response preferences:
- Length: ${lengthMap[settings.responseLength]}
- Tone: ${settings.tone}
- Language: ${settings.language === 'en' ? 'English' : settings.language}`;
      }

      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: { topic: prompt, slideCount: presentationData?.slides?.length || 10 },
        headers
      });

      if (error) throw error;
      if (data) {
        setPresentationData(data);
        return "I've updated the presentation based on your request. You can see the changes in the preview.";
      }
      return "I couldn't update the presentation. Please try again.";
    } catch (error: any) {
      console.error("Chat error:", error);
      return "Sorry, I encountered an error. Please try again.";
    }
  };

  const handleDownload = async (format: 'pptx' | 'pdf' = 'pptx') => {
    if (!presentationData) return;
    
    const filename = (presentationData.presentation_title || 'presentation')
      .substring(0, 50)
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase() || 'presentation';
    
    try {
      if (format === 'pdf') {
        const blob = await createPdfFromPresentation(presentationData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Downloaded!",
          description: "Your presentation has been saved as .pdf",
        });
        return;
      }
      
      const blob = await createPptxFile(presentationData);
      const properBlob = new Blob([blob], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const url = URL.createObjectURL(properBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Your presentation has been saved as .pptx",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const downloadOptions = [
    { label: 'PDF (.pdf)', format: 'pdf', icon: <FileText className="h-5 w-5 text-red-500" /> },
    { label: 'PowerPoint (.pptx)', format: 'pptx', icon: <Presentation className="h-5 w-5 text-orange-500" /> },
  ];

  // Presentation View with Chat
  if (presentationData && !loading) {
    const currentSlideData = presentationData.slides[currentSlide];
    
    return (
      <DashboardLayout>
        <SEO
          title="AI Presentation Maker - Free PowerPoint Generator | mydocmaker"
          description="Create stunning PowerPoint presentations in seconds with AI."
          canonical="/tools/presentation-maker"
        />
        
        <div className="h-[calc(100vh-120px)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {downloadOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.format}
                    onClick={() => handleDownload(option.format as 'pptx' | 'pdf')}
                    className="gap-3 py-3"
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" className="gap-2">
              <Palette className="h-4 w-4" />
              Theme
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              {isEditing ? 'Done Editing' : 'Edit'}
            </Button>
          </div>

          {/* Split View */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-border">
            {/* Presentation Preview Panel */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full flex flex-col overflow-hidden bg-card p-4">
                {/* Slide Display */}
                <motion.div 
                  key={currentSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-muted/20 shadow-xl rounded-lg aspect-[16/9] p-8 flex flex-col justify-center border border-border/50 flex-1"
                >
                  {currentSlideData.slide_layout === 'title_slide' ? (
                    <div className="text-center space-y-4">
                      {isEditing ? (
                        <Input
                          value={asText(currentSlideData.title)}
                          onChange={(e) => {
                            const updated = { ...presentationData };
                            updated.slides[currentSlide].title = e.target.value;
                            setPresentationData(updated);
                          }}
                          className="text-3xl font-bold text-center bg-transparent border-none"
                        />
                      ) : (
                        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                          {asText(currentSlideData.title)}
                        </h1>
                      )}
                      {currentSlideData.subtitle && (
                        <p className="text-lg md:text-xl text-muted-foreground mt-4">
                          {asText(currentSlideData.subtitle)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isEditing ? (
                        <Input
                          value={asText(currentSlideData.title)}
                          onChange={(e) => {
                            const updated = { ...presentationData };
                            updated.slides[currentSlide].title = e.target.value;
                            setPresentationData(updated);
                          }}
                          className="text-2xl font-bold bg-transparent border-none"
                        />
                      ) : (
                        <h2 className="text-2xl md:text-3xl font-bold border-b-4 border-primary/30 pb-2">
                          {asText(currentSlideData.title)}
                        </h2>
                      )}
                      {currentSlideData.bullets && (
                        <ul className="space-y-2 text-base md:text-lg">
                          {currentSlideData.bullets.map((bullet: any, idx: number) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-2 ${bullet.level === 1 ? "ml-6 text-muted-foreground text-sm" : "text-foreground"}`}
                            >
                              <span className="text-primary">•</span>
                              {asText(bullet.content)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm font-medium px-3 py-1 bg-muted/50 rounded-full">
                    {currentSlide + 1} / {presentationData.slides.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentSlide(Math.min(presentationData.slides.length - 1, currentSlide + 1))}
                    disabled={currentSlide === presentationData.slides.length - 1}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto py-3 mt-2">
                  {presentationData.slides.map((slide: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`flex-shrink-0 w-24 h-14 border-2 rounded p-2 text-[10px] overflow-hidden transition-all ${
                        currentSlide === idx 
                          ? 'border-primary bg-primary/10 shadow-lg' 
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}
                    >
                      <div className="font-bold truncate">{idx + 1}. {slide.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Chat Panel */}
            <ResizablePanel defaultSize={40} minSize={25}>
              <DocumentAssistantChat
                onSendMessage={handleChatMessage}
                isLoading={loading}
                previewContent={
                  <div className="space-y-4">
                    <h3 className="font-bold">{presentationData.presentation_title}</h3>
                    <p className="text-sm text-muted-foreground">{presentationData.slides?.length} slides</p>
                    {presentationData.slides?.map((slide: any, idx: number) => (
                      <div key={idx} className="text-sm border-b pb-2">
                        <strong>Slide {idx + 1}:</strong> {slide.title}
                      </div>
                    ))}
                  </div>
                }
                suggestions={[
                  "Add more slides",
                  "Make it more engaging",
                  "Add a conclusion slide",
                  "Simplify the content"
                ]}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DashboardLayout>
    );
  }

  // Create View
  return (
    <DashboardLayout>
      <SEO
        title="AI Presentation Maker - Free PowerPoint Generator | mydocmaker"
        description="Create stunning PowerPoint presentations in seconds with AI. Free online presentation maker with professional templates."
        keywords="ai presentation maker, powerpoint generator, ai ppt maker"
        canonical="/tools/presentation-maker"
      />
      
      <div className="max-w-3xl mx-auto">
        <ToolHero
          icon={Presentation}
          iconColor="text-orange-500"
          title="AI PowerPoint Generator"
          subtitle="Create a PowerPoint presentation in seconds using AI."
        />

        {/* Options */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Select value={slideCount} onValueChange={setSlideCount}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="Slides" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 slides</SelectItem>
              <SelectItem value="10">10 slides</SelectItem>
              <SelectItem value="15">15 slides</SelectItem>
              <SelectItem value="20">20 slides</SelectItem>
            </SelectContent>
          </Select>
          <ThemeSelector onThemeChange={setSelectedTheme} />
        </div>

        {/* Prompt Input */}
        <PromptInput
          value={topic}
          onChange={setTopic}
          onSubmit={handleGenerate}
          placeholder="Create a 10 slide sales presentation for Canon imageCLASS LBP236dw"
          loading={loading}
          disabled={loading}
          exampleText="Example"
          onExampleClick={() => setTopic("Create a 10 slide presentation about the benefits of renewable energy for a business audience")}
          showExample={!topic}
        />

        {/* Insight Card - only show for non-premium users */}
        {!isPremium && (
          <div className="mt-6">
            <InsightCard
              title="Introducing our Premium Plans"
              description="Get higher quality AI generation and faster processing times. Start 7-day free trial now. Cancel anytime."
              actionText="Enable"
              actionLink="/dashboard/subscription"
            />
          </div>
        )}

        {/* Tool Suggestion Cards */}
        <ToolSuggestionCards excludeLinks={["/tools/presentation-maker"]} />

        {/* SEO Article */}
        <SEOArticle article={aiPresentationGeneratorArticle} />
      </div>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <Presentation className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-lg font-medium">Creating Presentation</p>
              <p className="text-sm text-muted-foreground">This may take a moment...</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
