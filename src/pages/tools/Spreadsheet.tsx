import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileSpreadsheet, Edit, FileText, Download, Palette } from "lucide-react";
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
import { createXlsxFile } from "@/lib/fileGenerators";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";
import { SEO } from "@/components/SEO";
import { fileHistoryDb, userRolesDb } from "@/lib/databaseProxy";
import { ToolHero, PromptInput, InsightCard, ToolSuggestionCards } from "@/components/tools";
import { DocumentAssistantChat } from "@/components/tools/DocumentAssistantChat";
import type { ChatSettings } from "@/components/tools/ChatSettingsPanel";
import { motion } from "framer-motion";
import { SEOArticle } from "@/components/seo/SEOArticle";
import { aiSpreadsheetGeneratorArticle } from "@/data/toolSEOArticles";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useEffect } from "react";

export default function Spreadsheet() {
  const { user, loading: authLoading } = useAuth();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<string[][]>([]);
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
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what kind of spreadsheet you need",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeneratedContent("");

    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-spreadsheet', {
        body: { description },
        headers
      });

      if (error) throw error;
      if (!data?.content) throw new Error("No content generated");

      setGeneratedContent(data.content);
      setEditedData(parseCSV(data.content));

      await fileHistoryDb.insert({
        title: description.substring(0, 50),
        content: data.content,
        file_type: 'spreadsheet',
      });

      toast({
        title: "Spreadsheet generated!",
        description: "Your spreadsheet is ready",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate spreadsheet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatMessage = async (message: string, settings?: ChatSettings): Promise<string> => {
    try {
      let prompt = `Current spreadsheet data (CSV format):
${generatedContent}

User request: ${message}

Please update the spreadsheet based on the user's request. Return the updated data in CSV format.`;

      if (settings) {
        const lengthMap = { short: "brief", medium: "moderate", long: "comprehensive" };
        prompt += `

Response preferences:
- Length: ${lengthMap[settings.responseLength]}
- Tone: ${settings.tone}
- Language: ${settings.language === 'en' ? 'English' : settings.language}`;
      }

      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('generate-spreadsheet', {
        body: { description: prompt },
        headers
      });

      if (error) throw error;
      if (data?.content) {
        setGeneratedContent(data.content);
        setEditedData(parseCSV(data.content));
        return "I've updated the spreadsheet based on your request. You can see the changes in the preview.";
      }
      return "I couldn't update the spreadsheet. Please try again.";
    } catch (error: any) {
      console.error("Chat error:", error);
      return "Sorry, I encountered an error. Please try again.";
    }
  };

  const handleDownload = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!generatedContent) return;
    
    const filename = (description || 'spreadsheet')
      .substring(0, 50)
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    if (format === 'csv') {
      const csvContent = isEditing 
        ? editedData.map(row => row.join(',')).join('\n')
        : generatedContent;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV Downloaded!",
        description: "Your spreadsheet has been saved as .csv",
      });
      return;
    }
    
    const blob = await createXlsxFile(generatedContent);
    const properBlob = new Blob([blob], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(properBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Spreadsheet Downloaded!",
      description: "Your spreadsheet has been saved as .xlsx",
    });
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').filter(line => line.trim());
    return lines.map(line => line.split(',').map(cell => cell.trim()));
  };

  const downloadOptions = [
    { label: 'CSV (.csv)', format: 'csv', icon: <FileText className="h-5 w-5 text-green-500" /> },
    { label: 'Excel (.xlsx)', format: 'xlsx', icon: <FileSpreadsheet className="h-5 w-5 text-green-600" /> },
  ];

  // Spreadsheet View with Chat
  if (generatedContent && !loading) {
    const rows = isEditing ? editedData : parseCSV(generatedContent);
    const headers = rows[0] || [];
    const dataRows = rows.slice(1);

    const handleCellEdit = (rowIdx: number, cellIdx: number, value: string) => {
      const newData = [...editedData];
      newData[rowIdx + 1][cellIdx] = value;
      setEditedData(newData);
    };

    return (
      <DashboardLayout>
        <SEO
          title="AI Spreadsheet Maker - Free Excel Generator | mydocmaker"
          description="Create Excel spreadsheets instantly with AI."
          canonical="/tools/spreadsheet-maker"
        />
        
        <div className="h-[calc(100vh-120px)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-success to-primary hover:opacity-90 text-white">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {downloadOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.format}
                    onClick={() => handleDownload(option.format as 'xlsx' | 'csv')}
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
            {/* Spreadsheet Preview Panel */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full overflow-auto bg-card">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-x-auto"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        {headers.map((header, idx) => (
                          <TableHead 
                            key={idx} 
                            className="font-bold text-foreground border-r border-border/50 px-4 py-3 text-sm whitespace-nowrap"
                          >
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataRows.map((row, rowIdx) => (
                        <TableRow key={rowIdx} className="hover:bg-muted/30">
                          {row.map((cell, cellIdx) => (
                            <TableCell 
                              key={cellIdx} 
                              className="border-r border-border/50 px-4 py-2 whitespace-nowrap"
                            >
                              {isEditing ? (
                                <Input
                                  value={cell}
                                  onChange={(e) => handleCellEdit(rowIdx, cellIdx, e.target.value)}
                                  className="min-w-[100px] h-8"
                                />
                              ) : (
                                <span className="text-sm">{cell}</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>

                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  {dataRows.length} rows × {headers.length} columns
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
                  <div className="space-y-2">
                    <h3 className="font-bold">{description.substring(0, 50) || "Spreadsheet"}</h3>
                    <p className="text-sm text-muted-foreground">{dataRows.length} rows × {headers.length} columns</p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Columns:</strong> {headers.join(", ")}
                    </div>
                  </div>
                }
                suggestions={[
                  "Add a totals row",
                  "Add more columns",
                  "Sort by first column",
                  "Add sample data"
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
        title="AI Spreadsheet Maker - Free Excel Generator | mydocmaker"
        description="Create Excel spreadsheets instantly with AI. Free AI spreadsheet generator with formulas, data analysis, and instant downloads."
        keywords="ai spreadsheet maker, excel generator, ai excel"
        canonical="/tools/spreadsheet-maker"
      />
      
      <div className="max-w-3xl mx-auto">
        <ToolHero
          icon={FileSpreadsheet}
          iconColor="text-green-500"
          title="AI Excel Generator"
          subtitle="Create an Excel spreadsheet in seconds using AI."
        />

        {/* Prompt Input */}
        <PromptInput
          value={description}
          onChange={setDescription}
          onSubmit={handleGenerate}
          placeholder="Create a 2022 monthly sales spreadsheet for Canon imageCLASS LBP236dw with projected sales. Include a separate tab for technical information with color coding for readability, and charts to visualize the data."
          loading={loading}
          disabled={loading}
          exampleText="Example"
          onExampleClick={() => setDescription("Create a monthly budget tracker with income sources, expense categories, monthly totals, and year-to-date summaries with formulas.")}
          showExample={!description}
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
        <ToolSuggestionCards excludeLinks={["/tools/spreadsheet-maker"]} />

        {/* SEO Article */}
        <SEOArticle article={aiSpreadsheetGeneratorArticle} />
      </div>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <FileSpreadsheet className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-lg font-medium">Creating Spreadsheet</p>
              <p className="text-sm text-muted-foreground">Organizing your data...</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
