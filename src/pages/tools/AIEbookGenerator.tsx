import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Download, ChevronLeft, ChevronRight, Sparkles, Crown, Wand2, Edit, Image, Type, Palette, Save, X, Plus, Trash2, FileText, Upload, FileUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { SEO } from "@/components/SEO";
import { useTierCredits, calculateCredits } from "@/hooks/useTierCredits";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";

interface BookPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageBase64?: string;
}

interface GeneratedBook {
  title: string;
  targetAge: string;
  theme: string;
  mainCharacter: string;
  template: string;
  pages: BookPage[];
  creditCost: number;
}

interface EbookTemplate {
  id: string;
  name: string;
  description: string;
  colors: { primary: string; secondary: string; accent: string };
  font: string;
  preview: string;
}

const ebookTemplates: EbookTemplate[] = [
  { id: 'classic', name: 'Classic Storybook', description: 'Warm, timeless design with serif fonts', colors: { primary: '#8B4513', secondary: '#FDF5E6', accent: '#DAA520' }, font: 'Georgia, serif', preview: '📖' },
  { id: 'watercolor', name: 'Watercolor Dreams', description: 'Soft, dreamy aesthetic with pastel tones', colors: { primary: '#6B8E9F', secondary: '#F0F8FF', accent: '#E6B8A2' }, font: 'Palatino, serif', preview: '🎨' },
  { id: 'comic', name: 'Comic Adventure', description: 'Bold, dynamic comic book style', colors: { primary: '#FF4500', secondary: '#FFE4B5', accent: '#4169E1' }, font: 'Arial Black, sans-serif', preview: '💥' },
  { id: 'minimal', name: 'Modern Minimal', description: 'Clean, contemporary design', colors: { primary: '#2C3E50', secondary: '#FFFFFF', accent: '#3498DB' }, font: 'Helvetica, sans-serif', preview: '✨' },
  { id: 'vintage', name: 'Vintage Tales', description: 'Nostalgic, sepia-toned classic look', colors: { primary: '#704214', secondary: '#F5F5DC', accent: '#8B7355' }, font: 'Times New Roman, serif', preview: '📜' },
  { id: 'fantasy', name: 'Fantasy Kingdom', description: 'Magical, enchanting fairy tale style', colors: { primary: '#6A0DAD', secondary: '#E6E6FA', accent: '#FFD700' }, font: 'Garamond, serif', preview: '🏰' },
  { id: 'business', name: 'Professional', description: 'Clean business and educational style', colors: { primary: '#1a365d', secondary: '#f7fafc', accent: '#3182ce' }, font: 'Helvetica, sans-serif', preview: '📊' },
];

const sampleBooks = [
  { title: "The Brave Little Fox", character: "A curious little fox named Felix", setting: "A magical forest filled with talking trees", theme: "Overcoming fears and making new friends", moral: "Being brave means facing your fears", age: "3-5" },
  { title: "Ocean Friends", character: "A playful dolphin named Splash", setting: "The colorful coral reef", theme: "Teamwork and helping others in need", moral: "Working together makes us stronger", age: "0-2" },
  { title: "Dino's Big Day", character: "A tiny T-Rex named Tiny who wants to be big", setting: "A prehistoric jungle with volcanoes", theme: "Learning that size doesn't matter", moral: "It's not about how big you are, but how big your heart is", age: "3-5" },
  { title: "Super Bunny Saves the Day", character: "A bunny with super speed named Zoom", setting: "Carrot City, a bustling animal metropolis", theme: "Using your powers to help others", moral: "True heroes help without expecting anything in return", age: "3-5" },
  { title: "The Little Cloud Princess", character: "A princess named Aurora who lives in the clouds", setting: "A magical kingdom above the clouds", theme: "Bringing rain to help the land below", moral: "Helping others brings true happiness", age: "3-5" },
  { title: "Luna's Space Adventure", character: "A dreamy girl named Luna", setting: "Outer space and distant planets", theme: "Exploring the universe and discovering wonder", moral: "Curiosity leads to amazing discoveries", age: "6-8" },
  { title: "The Friendly Dragon", character: "A kind dragon named Spark", setting: "A medieval kingdom with castles", theme: "Being different and finding acceptance", moral: "True friends accept you for who you are", age: "3-5" },
  { title: "The Unicorn's Rainbow", character: "A young unicorn named Sparkle", setting: "A magical valley where rainbows grow", theme: "Spreading joy and color to the world", moral: "One person can brighten many lives", age: "3-5" },
];

export default function AIEbookGenerator() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedBook, setGeneratedBook] = useState<GeneratedBook | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBook, setEditedBook] = useState<GeneratedBook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Input mode
  const [inputMode, setInputMode] = useState<'form' | 'document' | 'text'>('form');
  const [sourceText, setSourceText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [targetAge, setTargetAge] = useState("3-5");
  const [theme, setTheme] = useState("");
  const [mainCharacter, setMainCharacter] = useState("");
  const [setting, setSetting] = useState("");
  const [moral, setMoral] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  
  // Editor state
  const [selectedFont, setSelectedFont] = useState("Georgia, serif");
  const [fontSize, setFontSize] = useState(18);

  const {
    creditLimit,
    creditsUsed,
    isPremium,
    loading: creditsLoading,
    getUpgradeMessage,
    refetch
  } = useTierCredits('books_generated');
  
  const canGenerate = creditsUsed < creditLimit;

  const handleAutoFill = () => {
    const randomBook = sampleBooks[Math.floor(Math.random() * sampleBooks.length)];
    setTitle(randomBook.title);
    setMainCharacter(randomBook.character);
    setSetting(randomBook.setting);
    setTheme(randomBook.theme);
    setMoral(randomBook.moral);
    setTargetAge(randomBook.age);
    
    toast({ title: "Auto-filled!", description: `Using template: "${randomBook.title}"` });
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    
    // Read text from file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setSourceText(text);
      toast({ title: "Document Loaded", description: `"${file.name}" has been loaded successfully.` });
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Failed to read the document.", variant: "destructive" });
    };
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      // For other file types, try to read as text
      reader.readAsText(file);
    }
  };

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
    // Validation based on input mode
    if (inputMode === 'form') {
      if (!title.trim() || !theme.trim() || !mainCharacter.trim()) {
        toast({ title: "Missing Information", description: "Please fill in the title, theme, and main character.", variant: "destructive" });
        return;
      }
    } else {
      if (!title.trim()) {
        toast({ title: "Missing Information", description: "Please provide a title for your ebook.", variant: "destructive" });
        return;
      }
      if (!sourceText.trim()) {
        toast({ title: "Missing Content", description: "Please paste text or upload a document.", variant: "destructive" });
        return;
      }
    }

    if (!canGenerate) {
      toast({ title: "Insufficient Credits", description: "You have reached your credit limit.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setGeneratedBook(null);
    setCurrentPage(0);

    try {
      const headers = await getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      
      const bookDetails = inputMode === 'form' 
        ? {
            title,
            targetAge,
            theme,
            mainCharacter,
            setting: setting || "a magical world",
            moral: moral || "being kind to others",
            template: selectedTemplate,
            sourceType: 'form',
          }
        : {
            title,
            targetAge,
            theme: "Generated from provided content",
            mainCharacter: "From source content",
            setting: "",
            moral: "",
            template: selectedTemplate,
            sourceType: inputMode,
            sourceText: sourceText,
          };
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          ...headers,
        },
        body: JSON.stringify({ bookDetails }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate ebook');
      }
      
      const data = await response.json();
      if (!data?.book) throw new Error("No ebook generated");

      const bookWithTemplate = { ...data.book, template: selectedTemplate };
      setGeneratedBook(bookWithTemplate);
      setEditedBook(bookWithTemplate);
      refetch();

      toast({ title: "Ebook Created!", description: `Your ebook "${data.book.title}" is ready!` });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ title: "Generation Failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditText = (pageIndex: number, newText: string) => {
    if (!editedBook) return;
    const updatedPages = [...editedBook.pages];
    updatedPages[pageIndex] = { ...updatedPages[pageIndex], text: newText };
    setEditedBook({ ...editedBook, pages: updatedPages });
  };

  const handleImageUpload = (pageIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editedBook) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const updatedPages = [...editedBook.pages];
      updatedPages[pageIndex] = { ...updatedPages[pageIndex], imageBase64: base64 };
      setEditedBook({ ...editedBook, pages: updatedPages });
      toast({ title: "Image Updated", description: `Page ${pageIndex + 1} image replaced.` });
    };
    reader.readAsDataURL(file);
  };

  const handleAddPage = () => {
    if (!editedBook) return;
    const newPage: BookPage = {
      pageNumber: editedBook.pages.length + 1,
      text: "Enter your text here...",
      imagePrompt: "Custom page",
      imageBase64: undefined,
    };
    setEditedBook({ ...editedBook, pages: [...editedBook.pages, newPage] });
    setCurrentPage(editedBook.pages.length);
    toast({ title: "Page Added", description: "New blank page added to your ebook." });
  };

  const handleDeletePage = (pageIndex: number) => {
    if (!editedBook || editedBook.pages.length <= 1) return;
    const updatedPages = editedBook.pages.filter((_, idx) => idx !== pageIndex).map((page, idx) => ({ ...page, pageNumber: idx + 1 }));
    setEditedBook({ ...editedBook, pages: updatedPages });
    if (currentPage >= updatedPages.length) setCurrentPage(updatedPages.length - 1);
    toast({ title: "Page Deleted", description: `Page ${pageIndex + 1} removed.` });
  };

  const handleSaveEdits = () => {
    if (editedBook) {
      setGeneratedBook(editedBook);
      setIsEditing(false);
      toast({ title: "Changes Saved", description: "Your ebook edits have been saved." });
    }
  };

  const handleDownloadPDF = async () => {
    const bookToDownload = editedBook || generatedBook;
    if (!bookToDownload) return;

    const template = ebookTemplates.find(t => t.id === bookToDownload.template) || ebookTemplates[0];
    
    toast({ title: "Creating PDF...", description: "Please wait while your ebook is prepared." });

    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Cover page with template colors
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 147, g: 51, b: 234 };
      };

      const primaryColor = hexToRgb(template.colors.primary);
      const secondaryColor = hexToRgb(template.colors.secondary);

      pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.text(bookToDownload.title, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`A story for ages ${bookToDownload.targetAge}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
      pdf.setFontSize(14);
      pdf.text(`Featuring: ${bookToDownload.mainCharacter}`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Template: ${template.name}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

      // Content pages
      for (const page of bookToDownload.pages) {
        pdf.addPage();
        pdf.setFillColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        if (page.imageBase64) {
          try {
            const imgData = page.imageBase64.startsWith('data:') ? page.imageBase64 : `data:image/png;base64,${page.imageBase64}`;
            pdf.addImage(imgData, 'PNG', 10, (pageHeight - pageHeight * 0.7) / 2, pageWidth * 0.5, pageHeight * 0.7);
          } catch (imgError) {
            console.error('Failed to add image:', imgError);
          }
        }

        pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(page.text, pageWidth * 0.4);
        pdf.text(lines, pageWidth * 0.55, pageHeight / 2 - 20);

        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${page.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // End page
      pdf.addPage();
      pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text("The End", pageWidth / 2, pageHeight / 2, { align: 'center' });
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text("Created with MyDocMaker AI Ebook Generator", pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

      const filename = bookToDownload.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf';
      pdf.save(filename);

      toast({ title: "Downloaded!", description: "Your ebook has been saved as a PDF." });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "Download Failed", description: "Failed to create PDF.", variant: "destructive" });
    }
  };

  const currentTemplate = ebookTemplates.find(t => t.id === selectedTemplate) || ebookTemplates[0];
  const displayBook = isEditing ? editedBook : generatedBook;

  // Ebook Editor/Preview View
  if (displayBook && !loading) {
    const currentPageData = displayBook.pages[currentPage];
    
    return (
      <DashboardLayout>
        <SEO title={`${displayBook.title} - AI Ebook Generator | mydocmaker`} description="View and edit your AI-generated ebook." canonical="/tools/ebook-generator" />
        
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">{displayBook.title}</h1>
              <p className="text-muted-foreground">For ages {displayBook.targetAge} • {currentTemplate.name}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setEditedBook(generatedBook); }} className="gap-2">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button onClick={handleSaveEdits} className="gap-2">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit className="h-4 w-4" /> Edit Ebook
                  </Button>
                  <Button onClick={handleDownloadPDF} className="gap-2">
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" onClick={() => { setGeneratedBook(null); setEditedBook(null); }}>
                    Create New
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Editor Controls */}
          {isEditing && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                        <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                        <SelectItem value="Palatino, serif">Palatino</SelectItem>
                        <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                        <SelectItem value="Comic Sans MS, cursive">Comic Sans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Size:</span>
                    <Select value={fontSize.toString()} onValueChange={(v) => setFontSize(parseInt(v))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[14, 16, 18, 20, 22, 24].map(size => (
                          <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddPage} className="gap-1">
                    <Plus className="h-4 w-4" /> Add Page
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeletePage(currentPage)} disabled={displayBook.pages.length <= 1} className="gap-1 text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Book Preview */}
          <Card className="overflow-hidden" style={{ backgroundColor: currentTemplate.colors.secondary }}>
            <AnimatePresence mode="wait">
              <motion.div key={currentPage} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="grid md:grid-cols-2 min-h-[500px]">
                {/* Image Side */}
                <div className="flex items-center justify-center p-8 relative" style={{ backgroundColor: `${currentTemplate.colors.accent}20` }}>
                  {currentPageData?.imageBase64 ? (
                    <img src={currentPageData.imageBase64} alt={`Page ${currentPage + 1}`} className="max-w-full max-h-[400px] rounded-lg shadow-xl object-contain" />
                  ) : (
                    <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => handleImageUpload(currentPage, e)} className="hidden" />
                      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                        <Image className="h-4 w-4" /> Change Image
                      </Button>
                    </div>
                  )}
                </div>

                {/* Text Side */}
                <div className="flex flex-col justify-center p-8">
                  <Badge variant="secondary" className="mb-4 w-fit" style={{ backgroundColor: currentTemplate.colors.primary, color: '#fff' }}>
                    Page {currentPage + 1} of {displayBook.pages.length}
                  </Badge>
                  {isEditing ? (
                    <Textarea value={currentPageData?.text || ''} onChange={(e) => handleEditText(currentPage, e.target.value)} className="min-h-[200px] text-lg" style={{ fontFamily: selectedFont, fontSize: `${fontSize}px` }} />
                  ) : (
                    <p className="text-xl leading-relaxed whitespace-pre-wrap" style={{ fontFamily: selectedFont, fontSize: `${fontSize}px`, color: currentTemplate.colors.primary }}>
                      {currentPageData?.text}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4 border-t bg-background/50">
              <Button variant="ghost" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <div className="flex gap-2 flex-wrap justify-center">
                {displayBook.pages.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentPage(idx)} className={`w-3 h-3 rounded-full transition-colors ${currentPage === idx ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                ))}
              </div>
              <Button variant="ghost" onClick={() => setCurrentPage(Math.min(displayBook.pages.length - 1, currentPage + 1))} disabled={currentPage === displayBook.pages.length - 1} className="gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto py-4 mt-4">
            {displayBook.pages.map((page, idx) => (
              <button key={idx} onClick={() => setCurrentPage(idx)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${currentPage === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}>
                {page.imageBase64 ? (
                  <img src={page.imageBase64} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-xs">{idx + 1}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Creation Form View
  return (
    <DashboardLayout>
      <SEO title="AI Ebook Generator - Create Ebooks with AI | mydocmaker" description="Create beautiful AI-generated ebooks with custom templates. Upload documents, paste text, or use our form. Edit and download as PDF." keywords="ai ebook generator, ebook creator, ai book maker, ebook templates, document to ebook" canonical="/tools/ebook-generator" />
      
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
            <BookOpen className="h-8 w-8 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">AI Ebook Generator</h1>
          <p className="text-muted-foreground text-lg">Create beautiful ebooks from documents, text, or story ideas - with AI images, graphics & tables</p>
        </div>

        {/* Credits Info */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Ebook Credits</span>
              <span className="text-sm text-muted-foreground">{creditsUsed} / {creditLimit} used</span>
            </div>
            <Progress value={(creditsUsed / creditLimit) * 100} className="h-2" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Credits vary based on generated content</span>
              {!isPremium && (
                <Link to="/subscription" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Crown className="h-3 w-3" /> {getUpgradeMessage()}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Template Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Choose Template
            </CardTitle>
            <CardDescription>Select a style for your ebook</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ebookTemplates.map((template) => (
                <button key={template.id} onClick={() => setSelectedTemplate(template.id)} className={`p-4 rounded-lg border-2 text-left transition-all ${selectedTemplate === template.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`} style={{ backgroundColor: template.colors.secondary }}>
                  <div className="text-2xl mb-2">{template.preview}</div>
                  <div className="font-medium text-sm" style={{ color: template.colors.primary }}>{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Input Mode Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Content Source
            </CardTitle>
            <CardDescription>Choose how to create your ebook</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'form' | 'document' | 'text')}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="form" className="gap-2">
                  <Wand2 className="h-4 w-4" /> Story Form
                </TabsTrigger>
                <TabsTrigger value="document" className="gap-2">
                  <FileUp className="h-4 w-4" /> Upload Document
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  <Type className="h-4 w-4" /> Paste Text
                </TabsTrigger>
              </TabsList>

              {/* Form Mode */}
              <TabsContent value="form" className="space-y-6">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleAutoFill} className="gap-2">
                    <Wand2 className="h-4 w-4" /> Auto Fill
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Ebook Title *</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Magical Adventure" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Target Age Group</Label>
                    <Select value={targetAge} onValueChange={setTargetAge}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-2">0-2 years (Baby)</SelectItem>
                        <SelectItem value="3-5">3-5 years (Preschool)</SelectItem>
                        <SelectItem value="6-8">6-8 years (Early Reader)</SelectItem>
                        <SelectItem value="9-12">9-12 years (Middle Grade)</SelectItem>
                        <SelectItem value="teen">Teenager</SelectItem>
                        <SelectItem value="adult">Adult</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="character">Main Character *</Label>
                    <Input id="character" value={mainCharacter} onChange={(e) => setMainCharacter(e.target.value)} placeholder="A brave little bunny named Bella" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setting">Setting</Label>
                    <Input id="setting" value={setting} onChange={(e) => setSetting(e.target.value)} placeholder="An enchanted forest" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Story Theme *</Label>
                  <Textarea id="theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="A story about making new friends and overcoming shyness" rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moral">Moral/Lesson</Label>
                  <Input id="moral" value={moral} onChange={(e) => setMoral(e.target.value)} placeholder="Kindness and friendship" />
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  AI will automatically determine the optimal number of pages based on your story
                </div>
              </TabsContent>

              {/* Document Upload Mode */}
              <TabsContent value="document" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-title">Ebook Title *</Label>
                    <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Ebook Title" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-age">Target Audience</Label>
                    <Select value={targetAge} onValueChange={setTargetAge}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3-5">Children (3-5)</SelectItem>
                        <SelectItem value="6-8">Children (6-8)</SelectItem>
                        <SelectItem value="9-12">Pre-teens (9-12)</SelectItem>
                        <SelectItem value="teen">Teenagers</SelectItem>
                        <SelectItem value="adult">Adults</SelectItem>
                        <SelectItem value="professional">Professionals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload Document</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => documentInputRef.current?.click()}>
                    <input type="file" ref={documentInputRef} accept=".txt,.md,.doc,.docx" onChange={handleDocumentUpload} className="hidden" />
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    {uploadedFileName ? (
                      <div>
                        <p className="font-medium text-primary">{uploadedFileName}</p>
                        <p className="text-sm text-muted-foreground mt-1">Click to upload a different file</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">Click to upload a document</p>
                        <p className="text-sm text-muted-foreground mt-1">Supports .txt, .md files</p>
                      </div>
                    )}
                  </div>
                </div>

                {sourceText && (
                  <div className="space-y-2">
                    <Label>Document Preview</Label>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{sourceText.slice(0, 500)}{sourceText.length > 500 && '...'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{sourceText.length} characters loaded</p>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  AI will automatically determine the optimal number of pages based on your document content
                </div>
              </TabsContent>

              {/* Text Paste Mode */}
              <TabsContent value="text" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-title">Ebook Title *</Label>
                    <Input id="text-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Ebook Title" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text-age">Target Audience</Label>
                    <Select value={targetAge} onValueChange={setTargetAge}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3-5">Children (3-5)</SelectItem>
                        <SelectItem value="6-8">Children (6-8)</SelectItem>
                        <SelectItem value="9-12">Pre-teens (9-12)</SelectItem>
                        <SelectItem value="teen">Teenagers</SelectItem>
                        <SelectItem value="adult">Adults</SelectItem>
                        <SelectItem value="professional">Professionals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source-text">Paste Your Content *</Label>
                  <Textarea 
                    id="source-text" 
                    value={sourceText} 
                    onChange={(e) => setSourceText(e.target.value)} 
                    placeholder="Paste your content here. The AI will transform it into a beautifully formatted ebook with images, graphics, and tables..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{sourceText.length} characters</p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  AI will automatically determine the optimal number of pages based on your content
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleGenerate} disabled={loading || !canGenerate} className="w-full gap-2 mt-6" size="lg">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating Your Ebook... (This may take a few minutes)</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate Complete Ebook</>
              )}
            </Button>

            {loading && (
              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>Generating content and AI illustrations with Gemini...</p>
                <Progress value={undefined} className="h-1 mt-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>✨ AI generates images, graphics, tables and more for your ebook</p>
          <p>📝 Edit your ebook after generation: change text, add images, modify fonts</p>
          <p>📄 Download your finished ebook as a professionally formatted PDF!</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
