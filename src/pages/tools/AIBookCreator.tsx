import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Download, ChevronLeft, ChevronRight, Sparkles, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { SEO } from "@/components/SEO";
import { useTierCredits, calculateCredits } from "@/hooks/useTierCredits";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
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
  pages: BookPage[];
  creditCost: number;
}

export default function AIBookCreator() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedBook, setGeneratedBook] = useState<GeneratedBook | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Form state
  const [title, setTitle] = useState("");
  const [targetAge, setTargetAge] = useState("3-5");
  const [theme, setTheme] = useState("");
  const [mainCharacter, setMainCharacter] = useState("");
  const [setting, setSetting] = useState("");
  const [moral, setMoral] = useState("");
  const [pageCount, setPageCount] = useState("8");

  const {
    creditLimit,
    creditsUsed,
    isPremium,
    loading: creditsLoading,
    getUpgradeMessage,
    refetch
  } = useTierCredits('books_generated');
  
  const estimatedCredits = calculateCredits('book', parseInt(pageCount));
  const canGenerate = creditsUsed + estimatedCredits <= creditLimit;

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
    if (!title.trim() || !theme.trim() || !mainCharacter.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title, theme, and main character at minimum.",
        variant: "destructive",
      });
      return;
    }

    if (!canGenerate) {
      toast({
        title: "Insufficient Credits",
        description: `This book requires ${estimatedCredits} credits. You have ${creditLimit - creditsUsed} remaining.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeneratedBook(null);
    setCurrentPage(0);

    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-book', {
        body: {
          bookDetails: {
            title,
            targetAge,
            theme,
            mainCharacter,
            setting: setting || "a magical world",
            moral: moral || "being kind to others",
            pageCount: parseInt(pageCount),
          }
        },
        headers
      });

      if (error) throw error;
      if (!data?.book) throw new Error("No book generated");

      setGeneratedBook(data.book);
      refetch();

      toast({
        title: "Book Created!",
        description: `Your picture book "${data.book.title}" is ready with ${data.book.pages.length} pages!`,
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error?.message || "Failed to generate book. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedBook) return;

    toast({
      title: "Creating PDF...",
      description: "Please wait while your book is being prepared for download.",
    });

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Cover page
      pdf.setFillColor(147, 51, 234); // Purple
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.text(generatedBook.title, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      pdf.setFontSize(16);
      pdf.text(`A story for ages ${generatedBook.targetAge}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Featuring: ${generatedBook.mainCharacter}`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });

      // Content pages
      for (const page of generatedBook.pages) {
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Add image if available
        if (page.imageBase64) {
          try {
            const imgData = page.imageBase64.startsWith('data:') 
              ? page.imageBase64 
              : `data:image/png;base64,${page.imageBase64}`;
            
            const imgWidth = pageWidth * 0.5;
            const imgHeight = pageHeight * 0.7;
            const imgX = 10;
            const imgY = (pageHeight - imgHeight) / 2;
            
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
          } catch (imgError) {
            console.error('Failed to add image to PDF:', imgError);
          }
        }

        // Add text
        pdf.setTextColor(30, 30, 30);
        pdf.setFontSize(18);
        const textX = pageWidth * 0.55;
        const textWidth = pageWidth * 0.4;
        const textY = pageHeight / 2 - 20;
        
        const lines = pdf.splitTextToSize(page.text, textWidth);
        pdf.text(lines, textX, textY);

        // Page number
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${page.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // End page
      pdf.addPage();
      pdf.setFillColor(147, 51, 234);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text("The End", pageWidth / 2, pageHeight / 2, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text("Created with MyDocMaker AI Book Creator", pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

      const filename = generatedBook.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf';
      pdf.save(filename);

      toast({
        title: "Downloaded!",
        description: "Your picture book has been saved as a PDF.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to create PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Book Preview View
  if (generatedBook && !loading) {
    const currentPageData = generatedBook.pages[currentPage];
    
    return (
      <DashboardLayout>
        <SEO
          title={`${generatedBook.title} - AI Book Creator | mydocmaker`}
          description="View your AI-generated children's picture book."
          canonical="/tools/book-creator"
        />
        
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">{generatedBook.title}</h1>
              <p className="text-muted-foreground">For ages {generatedBook.targetAge}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setGeneratedBook(null)}>
                Create New Book
              </Button>
            </div>
          </div>

          {/* Book Preview */}
          <Card className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-2 min-h-[500px]"
              >
                {/* Image Side */}
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-8">
                  {currentPageData?.imageBase64 ? (
                    <img
                      src={currentPageData.imageBase64}
                      alt={`Page ${currentPage + 1} illustration`}
                      className="max-w-full max-h-[400px] rounded-lg shadow-xl object-contain"
                    />
                  ) : (
                    <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Text Side */}
                <div className="flex flex-col justify-center p-8 bg-card">
                  <div className="space-y-6">
                    <Badge variant="secondary" className="mb-4">
                      Page {currentPage + 1} of {generatedBook.pages.length}
                    </Badge>
                    <p className="text-xl leading-relaxed font-serif">
                      {currentPageData?.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <Button
                variant="ghost"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {generatedBook.pages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      currentPage === idx ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => setCurrentPage(Math.min(generatedBook.pages.length - 1, currentPage + 1))}
                disabled={currentPage === generatedBook.pages.length - 1}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto py-4 mt-4">
            {generatedBook.pages.map((page, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  currentPage === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
              >
                {page.imageBase64 ? (
                  <img src={page.imageBase64} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                    {idx + 1}
                  </div>
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
      <SEO
        title="AI Book Creator - Create Children's Picture Books | mydocmaker"
        description="Create beautiful AI-generated picture books for children. Enter your story details and let AI generate illustrations and text for your custom children's book."
        keywords="ai book creator, children's book maker, picture book generator, kids story creator"
        canonical="/tools/book-creator"
      />
      
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
            <BookOpen className="h-8 w-8 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">AI Book Creator</h1>
          <p className="text-muted-foreground text-lg">
            Create beautiful picture books for children with AI-generated illustrations
          </p>
        </div>

        {/* Credits Info */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Book Credits</span>
              <span className="text-sm text-muted-foreground">
                {creditsUsed} / {creditLimit} used
              </span>
            </div>
            <Progress value={(creditsUsed / creditLimit) * 100} className="h-2" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Estimated cost: {estimatedCredits} credits ({parseInt(pageCount)} pages)
              </span>
              {!isPremium && (
                <Link to="/subscription" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  {getUpgradeMessage()}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Book Details
            </CardTitle>
            <CardDescription>
              Fill in the details and we'll create a unique picture book for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The Magical Adventure"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Target Age Group</Label>
                <Select value={targetAge} onValueChange={setTargetAge}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-2">0-2 years (Baby)</SelectItem>
                    <SelectItem value="3-5">3-5 years (Preschool)</SelectItem>
                    <SelectItem value="6-8">6-8 years (Early Reader)</SelectItem>
                    <SelectItem value="9-12">9-12 years (Middle Grade)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="character">Main Character *</Label>
                <Input
                  id="character"
                  value={mainCharacter}
                  onChange={(e) => setMainCharacter(e.target.value)}
                  placeholder="A brave little bunny named Bella"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setting">Setting</Label>
                <Input
                  id="setting"
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                  placeholder="An enchanted forest"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Story Theme *</Label>
              <Textarea
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="A story about making new friends and overcoming shyness"
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moral">Moral/Lesson</Label>
                <Input
                  id="moral"
                  value={moral}
                  onChange={(e) => setMoral(e.target.value)}
                  placeholder="Kindness and friendship"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pages">Number of Pages</Label>
                <Select value={pageCount} onValueChange={setPageCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 pages (3 credits)</SelectItem>
                    <SelectItem value="8">8 pages (5 credits)</SelectItem>
                    <SelectItem value="10">10 pages (5 credits)</SelectItem>
                    <SelectItem value="12">12 pages (7 credits)</SelectItem>
                    <SelectItem value="15">15 pages (7 credits)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={loading || !canGenerate}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Your Book... (This may take a few minutes)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Picture Book ({estimatedCredits} credits)
                </>
              )}
            </Button>

            {loading && (
              <div className="text-center text-sm text-muted-foreground">
                <p>Generating story and illustrations... This typically takes 1-3 minutes.</p>
                <Progress value={undefined} className="h-1 mt-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Each page includes AI-generated illustrations and story text.</p>
          <p>Download your finished book as a PDF to print or share!</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
