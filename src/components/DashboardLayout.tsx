import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Presentation, 
  Mic, 
  MessageSquare,
  FolderOpen,
  FileSpreadsheet,
  Crown,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Plus,
  Settings,
  Wrench,
  Bot
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { fileHistoryDb, userRolesDb } from "@/lib/databaseProxy";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HealthStatus } from "@/components/HealthStatus";

interface DashboardLayoutProps {
  children: ReactNode;
  showChatbox?: boolean;
}

interface RecentFile {
  id: string;
  title: string;
  file_type: string;
}

const getUserInitials = (email?: string | null, displayName?: string | null) => {
  if (displayName) {
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;

      try {
        const [filesResult, premiumResult] = await Promise.all([
          fileHistoryDb.getAll({ order: { column: "created_at", ascending: false } }),
          userRolesDb.isPremium()
        ]);

        if (filesResult.data) {
          setRecentFiles(filesResult.data.slice(0, 10));
        }
        setIsPremium(premiumResult);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    loadData();
  }, [user?.uid]);

  const createLinks = [
    { to: "/tools/document-creator", icon: FileText, label: "Document", color: "text-blue-500" },
    { to: "/tools/pdf-generator", icon: FileText, label: "PDF", color: "text-red-500" },
    { to: "/tools/presentation-maker", icon: Presentation, label: "Presentation", color: "text-orange-500" },
    { to: "/tools/spreadsheet-maker", icon: FileSpreadsheet, label: "Spreadsheet", color: "text-green-500" },
    { to: "/tools/voice-generator", icon: Mic, label: "Voiceover", color: "text-pink-500" },
    { to: "/tools/chat", icon: MessageSquare, label: "Chat", color: "text-cyan-500" },
  ];

  const dashboardLinks = [
    { to: "/files", icon: FolderOpen, label: "All Files" },
    { to: "/dashboard", icon: Wrench, label: "Tools" },
    { to: "/tools/chat", icon: Bot, label: "ChatGPT" },
  ];

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'document': 
      case 'document-json':
        return FileText;
      case 'presentation': return Presentation;
      case 'spreadsheet': return FileSpreadsheet;
      case 'pdf': return FileText;
      default: return FileText;
    }
  };

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border/40">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">mydocmaker</span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {/* Create Section */}
        <div className="px-3 mb-4">
          <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Create</h3>
          <nav className="space-y-0.5">
            {createLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all text-[13px]",
                  location.pathname === link.to
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50 text-foreground/80"
                )}
              >
                <link.icon className={cn("w-4 h-4", link.color)} />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Dashboard Section */}
        <div className="px-3 mb-4">
          <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Dashboard</h3>
          <nav className="space-y-0.5">
            {dashboardLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all text-[13px]",
                  location.pathname === link.to
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50 text-foreground/80"
                )}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Recents Section */}
        {recentFiles.length > 0 && (
          <div className="px-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Recents</h3>
            <nav className="space-y-0.5">
              {recentFiles.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                return (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <FileIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate flex-1 text-foreground/70">{file.title}</span>
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">•••</span>
                  </div>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border/40 space-y-1">
        {/* User Plan Status */}
        <div className="flex items-center justify-between px-2 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{isPremium ? 'Premium' : 'Standard'}</span>
          </div>
          <span className="text-muted-foreground">{isPremium ? '∞' : '4%'}</span>
        </div>
        
        {!isPremium && (
          <div className="flex items-center justify-between px-2 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Premium</span>
            </div>
            <Link 
              to="/dashboard/subscription" 
              onClick={onClose} 
              className="text-primary text-xs hover:underline"
            >
              Upgrade
            </Link>
          </div>
        )}

        {/* Theme & Logout */}
        <div className="flex items-center gap-1 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 px-2 text-xs h-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b border-border/40 px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">mydocmaker</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/tools/document-creator">
            <Button size="sm" className="h-8 gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" />
              Create New
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-60 bg-background z-50 flex flex-col shadow-xl"
            >
              <SidebarContent onClose={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-52 border-r border-border/40 bg-background flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-14 border-b border-border/40 items-center justify-between px-6">
          <HealthStatus />
          <div className="flex items-center gap-3">
            <Link to="/tools/document-creator">
              <Button size="sm" className="h-8 gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium">
                <Plus className="h-3.5 w-3.5" />
                Create New
              </Button>
            </Link>
            {!isPremium && (
              <Link to="/dashboard/subscription">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <div className="h-full p-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
