import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileDown, Download, Palette, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fileHistoryDb } from "@/lib/databaseProxy";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { SEO } from "@/components/SEO";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { ToolHero, PromptInput, InsightCard, ToolSuggestionCards } from "@/components/tools";
import { DocumentAssistantChat } from "@/components/tools/DocumentAssistantChat";
import type { ChatSettings } from "@/components/tools/ChatSettingsPanel";
import { createPdfFromHtml } from "@/lib/pdfBuilder";
import { SEOArticle } from "@/components/seo/SEOArticle";
import { aiPDFGeneratorArticle } from "@/data/toolSEOArticles";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function PDFGenerator() {
  const { user, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const { toast } = useToast();

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center animate-pulse">
            <FileText className="h-6 w-6 text-red-500" />
          </div>
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
        description: "Please enter what you want the PDF to be about",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeneratedContent("");

    try {
      const prompt = `${topic}

IMPORTANT: Generate content in HTML format with proper formatting:
- Use <h2> for section headings
- Use <h3> for subsection headings
- Use <p> for paragraphs
- Use <ul> and <li> for bullet points
- Use <strong> for bold text
Write clear, professional content suitable for a PDF document.`;

      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { topic: prompt },
        headers
      });

      if (error) throw error;
      if (!data?.html_content) throw new Error("No content generated");

      setGeneratedContent(data.html_content);
      setDocumentTitle(data.title);

      await fileHistoryDb.insert({
        title: data.title,
        content: data.html_content,
        file_type: 'pdf',
      });

      toast({
        title: "PDF content generated!",
        description: "Your PDF is ready to download",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatMessage = async (message: string, settings?: ChatSettings): Promise<string> => {
    try {
      let prompt = `Current document content:
${generatedContent}

User request: ${message}

Please provide the updated HTML content based on the user's request. Keep the same HTML formatting structure.`;

      if (settings) {
        const lengthMap = { short: "brief", medium: "moderate", long: "comprehensive" };
        prompt += `

Response preferences:
- Length: ${lengthMap[settings.responseLength]}
- Tone: ${settings.tone}
- Language: ${settings.language === 'en' ? 'English' : settings.language}`;
      }

      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { topic: prompt },
        headers
      });

      if (error) throw error;
      if (data?.html_content) {
        setGeneratedContent(data.html_content);
        return "I've updated the document based on your request. You can see the changes in the preview.";
      }
      return "I couldn't update the document. Please try again.";
    } catch (error: any) {
      console.error("Chat error:", error);
      return "Sorry, I encountered an error. Please try again.";
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedContent) return;
    
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while your PDF is being created",
      });

      const sanitizedContent = DOMPurify.sanitize(generatedContent);
      const blob = await createPdfFromHtml(sanitizedContent, documentTitle);
      
      // Create proper blob with explicit MIME type
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const safeFilename = documentTitle.substring(0, 50).replace(/[^a-z0-9]/gi, '_') || 'document';
      const url = URL.createObjectURL(pdfBlob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeFilename}.pdf`;
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
        title: "Downloaded!",
        description: "Your PDF has been downloaded",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDOCX = async () => {
    if (!generatedContent) return;
    
    try {
      toast({
        title: "Generating DOCX...",
        description: "Please wait while your document is being created",
      });

      const { createDocxFile } = await import("@/lib/fileGenerators");
      const blob = await createDocxFile(generatedContent, documentTitle, true);
      
      const properBlob = new Blob([blob], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const safeFilename = documentTitle.substring(0, 50).replace(/[^a-z0-9]/gi, '_') || 'document';
      const url = URL.createObjectURL(properBlob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeFilename}.docx`;
      document.body.appendChild(a);
      
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }, 0);

      toast({
        title: "Downloaded!",
        description: "Your document has been downloaded as .docx",
      });
    } catch (error) {
      console.error("DOCX generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate DOCX",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (format: string) => {
    if (format === 'pdf') {
      await handleDownloadPDF();
    } else if (format === 'docx') {
      await handleDownloadDOCX();
    }
  };

  const sanitizedPreview = generatedContent ? DOMPurify.sanitize(generatedContent, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'class']
  }) : '';

  const downloadOptions = [
    { label: 'PDF (.pdf)', format: 'pdf', icon: <FileDown className="h-5 w-5 text-red-500" /> },
    { label: 'Word (.docx)', format: 'docx', icon: <FileText className="h-5 w-5 text-blue-500" /> },
  ];

  // Show editor view with chat when content is generated
  if (generatedContent && !loading) {
    return (
      <DashboardLayout>
        <SEO
          title="AI PDF Generator - Create PDFs Instantly | mydocmaker"
          description="Generate professional PDF documents in seconds using AI."
          canonical="/tools/pdf-generator"
        />

        <div className="h-[calc(100vh-120px)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 text-white">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {downloadOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.format}
                    onClick={() => handleDownload(option.format)}
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
            
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>

          {/* Split View */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-border">
            {/* Document Preview Panel */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full overflow-auto bg-card p-6">
                <div className="max-w-3xl mx-auto bg-white dark:bg-muted/20 rounded-lg shadow-sm p-8 min-h-[600px]">
                  <h1 className="text-2xl font-bold mb-4">{documentTitle}</h1>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizedPreview }} 
                  />
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
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <h3>{documentTitle}</h3>
                    <div dangerouslySetInnerHTML={{ __html: sanitizedPreview }} />
                  </div>
                }
                suggestions={[
                  "Make it more professional",
                  "Add more details",
                  "Create a summary",
                  "Add bullet points"
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
        title="AI PDF Generator - Create PDFs Instantly | mydocmaker"
        description="Generate professional PDF documents in seconds using AI. Create clean, share-ready PDFs without manual formatting."
        keywords="ai pdf generator, pdf maker, create pdf online, ai pdf creator"
        canonical="/tools/pdf-generator"
      />

      <div className="max-w-4xl mx-auto px-4">
        <ToolHero
          icon={FileText}
          iconColor="text-red-500"
          title="AI PDF Generator"
          subtitle="Create professional PDFs in seconds using AI"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Main Input Card */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
            <PromptInput
              value={topic}
              onChange={setTopic}
              placeholder="Describe what you want your PDF to contain. E.g., 'Create a one-page company overview with sections for About Us, Services, and Contact Information.'"
              maxLength={2000}
              rows={5}
            />
            
            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>

          {/* Insight Card */}
          <InsightCard
            title="Multiple Format Support"
            description="Generate content once, download as PDF or Word document. Perfect for reports, proposals, and documentation."
          />

          {/* Tool Suggestions */}
          <ToolSuggestionCards excludeLinks={["/tools/pdf-generator"]} />

          {/* SEO Article */}
          <SEOArticle article={aiPDFGeneratorArticle} />
        </motion.div>
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
              <p className="text-lg font-medium">Creating Document</p>
              <p className="text-sm text-muted-foreground">This may take a moment...</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
