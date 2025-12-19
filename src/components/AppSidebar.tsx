import { 
  FileText, Presentation, Table2, Mic, MessageSquare, LayoutDashboard, 
  Files, Clock, PenTool, BookOpen, Upload, Settings, CreditCard,
  ImageIcon, Video, FolderOpen, Zap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fileHistoryDb } from "@/lib/databaseProxy";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const documentTools = [
  { title: "Document Creator", url: "/tools/document-creator", icon: FileText },
  { title: "Word Editor", url: "/tools/word-editor", icon: PenTool },
  { title: "Presentation Maker", url: "/tools/presentation-maker", icon: Presentation },
  { title: "Spreadsheet", url: "/tools/spreadsheet-maker", icon: Table2 },
];

const aiTools = [
  { title: "AI Chat", url: "/tools/chat", icon: MessageSquare },
  { title: "Chat with PDF", url: "/tools/chat-pdf", icon: Upload },
  { title: "Voice Generator", url: "/tools/voice-generator", icon: Mic },
  { title: "Story Generator", url: "/tools/story-generator", icon: BookOpen },
  { title: "AI Writer", url: "/tools/writer", icon: PenTool },
  { title: "Image Generator", url: "/tools/image-generator", icon: ImageIcon },
  { title: "Video Generator", url: "/tools/video-generator", icon: Video },
];

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "All Files", url: "/files", icon: Files },
  { title: "Gallery", url: "/gallery", icon: FolderOpen },
];

const accountItems = [
  { title: "Credits", url: "/dashboard/credits", icon: Zap },
  { title: "Subscription", url: "/dashboard/subscription", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface RecentFile {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
}

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    const loadRecentFiles = async () => {
      if (!user?.uid) return;
      
      try {
        const { data, error } = await fileHistoryDb.getAll({
          order: { column: "created_at", ascending: false }
        });

        if (error) throw error;
        setRecentFiles((data || []).slice(0, 5));
      } catch (error) {
        console.error("Error loading recent files:", error);
      }
    };

    loadRecentFiles();
  }, [user?.uid]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b">
          {open ? (
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">mydocmaker</span>
            </div>
          ) : (
            <FileText className="h-6 w-6 text-primary mx-auto" />
          )}
        </div>

        {/* Main */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Document Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {documentTools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiTools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recents */}
        {recentFiles.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recents</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentFiles.map((file) => (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton asChild>
                      <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded-md">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs truncate">{file.title}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
