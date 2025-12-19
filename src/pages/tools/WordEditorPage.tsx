import { useState, useEffect } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { WordEditor } from '@/components/word-editor';
import { Loader2, FileEdit, ArrowLeft, MessageSquare, PanelRightClose, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/hooks/useFirebaseAuth';
import { DocumentAssistantChat } from '@/components/tools/DocumentAssistantChat';
import type { ChatSettings } from '@/components/tools/ChatSettingsPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  convertInchesToTwip,
} from 'docx';

interface LocationState {
  initialContent?: string;
}

export default function WordEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [documentHtml, setDocumentHtml] = useState(state?.initialContent || '');
  const [showChat, setShowChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const { toast } = useToast();

  // Show toast if document was loaded from Document Creator
  useEffect(() => {
    if (state?.initialContent) {
      toast({
        title: "Document loaded",
        description: "Your document is ready for editing",
      });
    }
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto">
            <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />
          </div>
          <p className="text-muted-foreground text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleExportDocx = async (html: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body;
      
      const children: (Paragraph | Table)[] = [];
      
      const processNode = async (node: ChildNode): Promise<(Paragraph | Table)[]> => {
        const result: (Paragraph | Table)[] = [];
        
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            result.push(new Paragraph({
              children: [new TextRun({ text })],
            }));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          
          switch (tagName) {
            case 'h1':
              result.push(new Paragraph({
                children: [new TextRun({ text: element.textContent || '', bold: true, size: 48 })],
                heading: HeadingLevel.HEADING_1,
              }));
              break;
            case 'h2':
              result.push(new Paragraph({
                children: [new TextRun({ text: element.textContent || '', bold: true, size: 36 })],
                heading: HeadingLevel.HEADING_2,
              }));
              break;
            case 'h3':
              result.push(new Paragraph({
                children: [new TextRun({ text: element.textContent || '', bold: true, size: 28 })],
                heading: HeadingLevel.HEADING_3,
              }));
              break;
            case 'p':
              const runs: TextRun[] = [];
              element.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                  runs.push(new TextRun({ text: child.textContent || '' }));
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                  const childEl = child as HTMLElement;
                  const childTag = childEl.tagName.toLowerCase();
                  const text = childEl.textContent || '';
                  
                  let run: TextRun;
                  switch (childTag) {
                    case 'strong':
                    case 'b':
                      run = new TextRun({ text, bold: true });
                      break;
                    case 'em':
                    case 'i':
                      run = new TextRun({ text, italics: true });
                      break;
                    case 'u':
                      run = new TextRun({ text, underline: {} });
                      break;
                    case 's':
                      run = new TextRun({ text, strike: true });
                      break;
                    default:
                      run = new TextRun({ text });
                  }
                  runs.push(run);
                }
              });
              
              const style = element.getAttribute('style') || '';
              let alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT;
              if (style.includes('text-align: center')) alignment = AlignmentType.CENTER;
              if (style.includes('text-align: right')) alignment = AlignmentType.RIGHT;
              if (style.includes('text-align: justify')) alignment = AlignmentType.JUSTIFIED;
              
              result.push(new Paragraph({ children: runs, alignment }));
              break;
            case 'ul':
              element.querySelectorAll(':scope > li').forEach((li) => {
                result.push(new Paragraph({
                  children: [new TextRun({ text: li.textContent || '' })],
                  bullet: { level: 0 },
                }));
              });
              break;
            case 'ol':
              element.querySelectorAll(':scope > li').forEach((li) => {
                result.push(new Paragraph({
                  children: [new TextRun({ text: li.textContent || '' })],
                  numbering: { reference: 'default-numbering', level: 0 },
                }));
              });
              break;
            case 'table':
              const rows = element.querySelectorAll('tr');
              const tableRows: TableRow[] = [];
              
              rows.forEach((row) => {
                const cells = row.querySelectorAll('th, td');
                const tableCells: TableCell[] = [];
                
                cells.forEach((cell) => {
                  tableCells.push(new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: cell.textContent || '',
                        bold: cell.tagName.toLowerCase() === 'th',
                      })],
                    })],
                  }));
                });
                
                if (tableCells.length > 0) {
                  tableRows.push(new TableRow({ children: tableCells }));
                }
              });
              
              if (tableRows.length > 0) {
                result.push(new Table({
                  rows: tableRows,
                  width: { size: 100, type: WidthType.PERCENTAGE },
                }));
              }
              break;
            case 'img':
              const src = element.getAttribute('src');
              if (src && src.startsWith('data:image')) {
                try {
                  const base64Data = src.split(',')[1];
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  result.push(new Paragraph({
                    children: [
                      new ImageRun({
                        data: bytes,
                        transformation: { width: 400, height: 300 },
                        type: 'png',
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                  }));
                } catch (e) {
                  console.error('Failed to process image:', e);
                }
              }
              break;
            case 'hr':
              result.push(new Paragraph({
                children: [new TextRun({ text: '─'.repeat(50), color: 'CCCCCC' })],
                alignment: AlignmentType.CENTER,
              }));
              break;
            default:
              for (const child of Array.from(element.childNodes)) {
                const childResults = await processNode(child);
                result.push(...childResults);
              }
          }
        }
        
        return result;
      };
      
      for (const child of Array.from(body.childNodes)) {
        const nodes = await processNode(child);
        children.push(...nodes);
      }
      
      const docxDoc = new Document({
        creator: 'mydocmaker.com',
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
              },
            },
          },
          children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun({ text: '' })] })],
        }],
        numbering: {
          config: [
            {
              reference: "default-numbering",
              levels: [
                {
                  level: 0,
                  format: "decimal" as any,
                  text: "%1.",
                  alignment: AlignmentType.LEFT,
                },
              ],
            },
          ],
        },
      });
      
      const blob = await Packer.toBlob(docxDoc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Document exported!",
        description: "Your document has been downloaded as .docx",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export document",
        variant: "destructive",
      });
    }
  };

  const handleChatMessage = async (message: string, settings?: ChatSettings): Promise<string> => {
    setChatLoading(true);
    try {
      let prompt = `Current document content (HTML):
${documentHtml}

User request: ${message}

Please provide updated HTML content based on the user's request. Maintain proper HTML structure with tags like <h1>, <h2>, <p>, <ul>, <li>, <strong>, etc.`;

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
        setDocumentHtml(data.html_content);
        return "I've updated the document based on your request. You can see the changes in the editor.";
      }
      return "I couldn't update the document. Please try again.";
    } catch (error: any) {
      console.error("Chat error:", error);
      return "Sorry, I encountered an error. Please try again.";
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <SEO
        title="Word Editor - Free Online Document Editor | mydocmaker"
        description="Create and edit Word documents online with our free AI-powered editor."
        keywords="online word editor, free document editor, ai word processor"
      />
      
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card">
        <div className="flex items-center gap-3">
          <Link to="/tools">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <FileEdit className="h-4 w-4 text-indigo-500" />
            </div>
            <span className="font-medium text-sm">Word Editor</span>
          </div>
        </div>
        
        <Button 
          variant={showChat ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowChat(!showChat)}
          className="gap-2"
        >
          {showChat ? (
            <>
              <PanelRightClose className="h-4 w-4" />
              <span className="hidden sm:inline">Hide AI</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </>
          )}
        </Button>
      </div>
      
      {/* Main Content with Optional Chat Panel */}
      {showChat ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={65} minSize={40}>
            <WordEditor
              initialContent={documentHtml}
              onChange={setDocumentHtml}
              onExportDocx={handleExportDocx}
              className="h-full"
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={35} minSize={25}>
            <DocumentAssistantChat
              persistenceKey={user?.uid ? `chat:word-editor:${user.uid}` : undefined}
              onSendMessage={handleChatMessage}
              isLoading={chatLoading}
              showSettings={true}
              placeholder="Ask AI to help edit your document..."
              suggestions={[
                "Make it more professional",
                "Add a summary at the top",
                "Fix grammar and spelling",
                "Reformat as bullet points"
              ]}
              previewContent={
                <div className="prose prose-sm max-w-none dark:prose-invert p-4">
                  <div dangerouslySetInnerHTML={{ __html: documentHtml || '<p class="text-muted-foreground">Start typing in the editor to see a preview...</p>' }} />
                </div>
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <WordEditor
          initialContent={documentHtml}
          onChange={setDocumentHtml}
          onExportDocx={handleExportDocx}
          className="flex-1"
        />
      )}
    </div>
  );
}
