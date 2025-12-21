import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Loader2, FileText, Crown, Sparkles, Download, 
  Palette, LayoutTemplate, MessageSquare,
  Send, Edit, Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildDocxFromSchema } from "@/lib/documentBuilder";
import { buildPdfFromSchema } from "@/lib/pdfBuilder";
import { DocumentJsonPreview } from "@/components/DocumentJsonPreview";
import { TemplateSelector } from "@/components/TemplateSelector";
import { checkRateLimit } from "@/lib/rateLimiter";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { fileHistoryDb, usageTrackingDb } from "@/lib/databaseProxy";
import { SEO } from "@/components/SEO";
import { DOCUMENT_THEMES, DOCUMENT_TEMPLATES, type DocumentSchema, type AnyDocumentElement } from "@/lib/documentSchema";
import { processDocumentImages, hasUnprocessedImages } from "@/lib/imageProcessor";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ToolHero } from "@/components/tools/ToolHero";
import { PromptInput } from "@/components/tools/PromptInput";
import { InsightCard } from "@/components/tools/InsightCard";
import { ToolSuggestionCards } from "@/components/tools/ToolSuggestionCards";
import { DocumentAssistantChat } from "@/components/tools/DocumentAssistantChat";
import type { ChatSettings } from "@/components/tools/ChatSettingsPanel";
import { SEOArticle } from "@/components/seo/SEOArticle";
import { aiDocumentGeneratorArticle } from "@/data/toolSEOArticles";
import { useTierCredits } from "@/hooks/useTierCredits";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Convert DocumentSchema to HTML for editing
function documentSchemaToHtml(schema: DocumentSchema): string {
  const htmlParts: string[] = [];
  
  for (const section of schema.sections) {
    for (const element of section.elements) {
      switch (element.type) {
        case 'heading1':
          htmlParts.push(`<h1>${escapeHtml((element as any).text)}</h1>`);
          break;
        case 'heading2':
          htmlParts.push(`<h2>${escapeHtml((element as any).text)}</h2>`);
          break;
        case 'heading3':
          htmlParts.push(`<h3>${escapeHtml((element as any).text)}</h3>`);
          break;
        case 'heading4':
          htmlParts.push(`<h4>${escapeHtml((element as any).text)}</h4>`);
          break;
        case 'paragraph':
          const paraEl = element as any;
          if (paraEl.text_runs) {
            const runsHtml = paraEl.text_runs.map((run: any) => {
              let text = escapeHtml(run.text);
              if (run.bold) text = `<strong>${text}</strong>`;
              if (run.italic) text = `<em>${text}</em>`;
              if (run.underline) text = `<u>${text}</u>`;
              return text;
            }).join('');
            htmlParts.push(`<p>${runsHtml}</p>`);
          } else {
            htmlParts.push(`<p>${escapeHtml(paraEl.text || '')}</p>`);
          }
          break;
        case 'bullet_list':
          const bullets = (element as any).items.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('');
          htmlParts.push(`<ul>${bullets}</ul>`);
          break;
        case 'numbered_list':
          const numbered = (element as any).items.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('');
          htmlParts.push(`<ol>${numbered}</ol>`);
          break;
        case 'table':
          const tableEl = element as any;
          let tableHtml = '<table><tbody>';
          for (let i = 0; i < tableEl.rows.length; i++) {
            const row = tableEl.rows[i];
            const tag = i === 0 || row.isHeader ? 'th' : 'td';
            const cells = row.cells.map((cell: string) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('');
            tableHtml += `<tr>${cells}</tr>`;
          }
          tableHtml += '</tbody></table>';
          htmlParts.push(tableHtml);
          break;
        case 'image':
          const imgEl = element as any;
          if (imgEl.url) {
            htmlParts.push(`<p><img src="${imgEl.url}" alt="${escapeHtml(imgEl.caption || '')}" /></p>`);
          }
          break;
        case 'divider':
          htmlParts.push('<hr />');
          break;
      }
    }
  }
  
  return htmlParts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function DocumentCreator() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [documentSchema, setDocumentSchema] = useState<DocumentSchema | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('blank');
  const [selectedTheme, setSelectedTheme] = useState<string>('modern');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const { toast } = useToast();

  const {
    creditLimit,
    creditsUsed,
    isPremium,
    loading: creditsLoading,
    getUpgradeMessage,
    refetch
  } = useTierCredits('documents_generated');
  
  const canGenerate = creditsUsed < creditLimit;

  if (authLoading || creditsLoading) {
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
    if (!topic.trim() && selectedTemplate === 'blank') {
      toast({
        title: "Topic required",
        description: "Please describe your document or select a template",
        variant: "destructive",
      });
      return;
    }

    const rateLimitResult = checkRateLimit('document_generation', isPremium);
    if (!rateLimitResult.allowed) {
      toast({
        title: "Rate Limit Exceeded",
        description: rateLimitResult.message,
        variant: "destructive",
      });
      return;
    }

    if (!canGenerate) {
      toast({
        title: "Credit Limit Reached",
        description: "You've used all your document credits for today.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (selectedTemplate && selectedTemplate !== 'blank' && !topic.trim()) {
        const template = DOCUMENT_TEMPLATES[selectedTemplate];
        if (template) {
          const themedTemplate = {
            ...template,
            theme: DOCUMENT_THEMES[selectedTheme] || template.theme,
          };
          setDocumentSchema(themedTemplate);
          setLoading(false);
          toast({
            title: "Template loaded!",
            description: "You can now customize it using the chat",
          });
          return;
        }
      }

      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-document-json', {
        body: { 
          topic: topic.trim(),
          templateName: selectedTemplate !== 'blank' ? selectedTemplate : undefined,
          themeName: selectedTheme,
          mode: 'create'
        },
        headers
      });

      if (error) throw error;
      if (!data?.sections) throw new Error("Invalid document structure received");

      let schema = data as DocumentSchema;
      setDocumentSchema(schema);
      
      if (hasUnprocessedImages(schema)) {
        setProcessingImages(true);
        toast({
          title: "Document generated!",
          description: "Now generating images...",
        });

        try {
          const { schema: processedSchema, imagesGenerated } = await processDocumentImages(schema);
          setDocumentSchema(processedSchema);
          toast({
            title: "Images generated!",
            description: `${imagesGenerated} image(s) added to your document`,
          });
        } catch (imgError) {
          console.error('Image processing error:', imgError);
        } finally {
          setProcessingImages(false);
        }
      }

      await fileHistoryDb.insert({
        title: schema.metadata?.title || topic.substring(0, 50),
        content: JSON.stringify(schema),
        file_type: 'document-json',
      });

      await usageTrackingDb.incrementUsage('documents_generated');
      
      refetch(); // Refresh credits

      toast({
        title: "Document ready!",
        description: "Use the chat to refine your document",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatMessage = async (message: string, settings?: ChatSettings): Promise<string> => {
    if (!documentSchema) return "No document to edit";

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setEditLoading(true);

    try {
      const headers = await getAuthHeaders();
      
      // Build prompt with settings
      let editPrompt = message;
      if (settings) {
        const lengthMap = { short: "brief", medium: "moderate", long: "comprehensive" };
        editPrompt = `${message}

Response preferences:
- Length: ${lengthMap[settings.responseLength]}
- Tone: ${settings.tone}
- Language: ${settings.language === 'en' ? 'English' : settings.language}`;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-document-json', {
        body: { 
          topic: editPrompt,
          currentJson: documentSchema,
          themeName: selectedTheme,
          mode: 'edit'
        },
        headers
      });

      if (error) throw error;
      if (!data?.sections) throw new Error("Invalid document structure received");

      setDocumentSchema(data as DocumentSchema);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Done! I've updated the document based on your request.",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      return "Done! I've updated the document.";

    } catch (error: any) {
      console.error("Edit error:", error);
      const errorMsg = `Sorry, I couldn't make that change: ${error?.message || "Unknown error"}`;
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
      return errorMsg;
    } finally {
      setEditLoading(false);
    }
  };

  const handleDownload = async (format: 'docx' | 'pdf' = 'docx') => {
    if (!documentSchema) return;
    
    try {
      const filename = (documentSchema.metadata?.title || 'document')
        .substring(0, 50)
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, '_')
        .toLowerCase() || 'document';

      if (format === 'pdf') {
        toast({
          title: "Generating PDF...",
          description: "Please wait while your PDF is being created",
        });

        const blob = await buildPdfFromSchema(documentSchema);
        
        // Create proper blob with explicit MIME type
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        
        // Use more reliable download approach
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        
        // Use setTimeout to ensure the link is in DOM before clicking
        setTimeout(() => {
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }, 0);

        toast({
          title: "PDF Downloaded!",
          description: "Your document has been saved as PDF",
        });
        return;
      }
      
      // DOCX download with proper MIME type
      const blob = await buildDocxFromSchema(documentSchema);
      const properBlob = new Blob([blob], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = URL.createObjectURL(properBlob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.docx`;
      document.body.appendChild(a);
      
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }, 0);

      toast({
        title: "Document Downloaded!",
        description: "Your document has been saved as .docx",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading your document",
        variant: "destructive",
      });
    }
  };

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    if (documentSchema) {
      const newTheme = DOCUMENT_THEMES[themeName];
      if (newTheme) {
        setDocumentSchema({
          ...documentSchema,
          theme: newTheme,
        });
      }
    }
  };

  const handleNewDocument = () => {
    setDocumentSchema(null);
    setTopic("");
    setChatMessages([]);
    setSelectedTemplate('blank');
  };

  // Document Edit View with Split Panel
  if (documentSchema) {
    return (
      <DashboardLayout>
        <SEO
          title="AI Document Creator - Free Word Document Maker | mydocmaker"
          description="Create professional Word documents in seconds with AI."
          canonical="/tools/document-creator"
        />
        
        <div className="h-[calc(100vh-120px)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => handleDownload('docx')} className="gap-3 py-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span>Word (.docx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('pdf')} className="gap-3 py-3">
                  <FileText className="h-5 w-5 text-red-500" />
                  <span>PDF (.pdf)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                const html = documentSchemaToHtml(documentSchema);
                navigate('/tools/word-editor', { state: { initialContent: html } });
              }}
            >
              <Edit className="h-4 w-4" />
              Edit Document
            </Button>
            
            <Select value={selectedTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-36 h-10">
                <Palette className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_THEMES).map(([key, theme]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleNewDocument}>
              New Document
            </Button>
          </div>

          {/* Split View */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-border">
            {/* Document Preview Panel */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full overflow-auto bg-muted/30 p-6">
                <DocumentJsonPreview 
                  schema={documentSchema} 
                  processingImages={processingImages}
                  onSchemaChange={(newSchema) => setDocumentSchema(newSchema)}
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Chat Panel */}
            <ResizablePanel defaultSize={40} minSize={25}>
              <DocumentAssistantChat
                persistenceKey={user?.uid ? `chat:document-creator:${user.uid}:${documentSchema.metadata?.title || 'document'}` : undefined}
                onSendMessage={handleChatMessage}
                isLoading={editLoading}
                showSettings={true}
                previewContent={
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <h3>{documentSchema.metadata?.title || 'Document'}</h3>
                    <p className="text-muted-foreground">Preview the document in the main panel</p>
                  </div>
                }
                suggestions={[
                  "Add more sections",
                  "Make it more professional",
                  "Add bullet points",
                  "Include images"
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
        title="AI Document Creator - Free Word Document Maker | mydocmaker"
        description="Create professional Word documents in seconds with AI. Free AI document generator with templates, formatting, and instant DOCX downloads."
        keywords="ai word document generator free, ai document generator free"
        canonical="/tools/document-creator"
      />
      
      <div className="max-w-3xl mx-auto">
        <ToolHero
          icon={FileText}
          iconColor="text-blue-500"
          title="AI Document Generator"
          subtitle="Create a Word document or PDF in seconds using AI."
        />

        {/* Mode Selector */}
        <div className="flex items-center gap-3 mb-4">
          <Select value={selectedTemplate || 'blank'} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="Auto Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">Auto Mode</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="business-plan">Business Plan</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credits Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  Daily Document Credits
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
                  <Link to="/dashboard/subscription" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    {getUpgradeMessage()}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Prompt Input */}
        <PromptInput
          value={topic}
          onChange={setTopic}
          onSubmit={handleGenerate}
          placeholder="Create a 2 page summary on the Canon imageCLASS LBP236dw printer"
          loading={loading}
          disabled={loading || !canGenerate}
          exampleText="Example"
          onExampleClick={() => setTopic("Create a comprehensive business proposal for a new mobile app development project, including executive summary, project scope, timeline, and budget estimates.")}
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
        <ToolSuggestionCards excludeLinks={["/tools/document-creator"]} />

        {/* SEO Article */}
        <SEOArticle article={aiDocumentGeneratorArticle} />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <FileText className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-lg font-medium">Generating Document</p>
              <p className="text-sm text-muted-foreground">This may take a moment...</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
