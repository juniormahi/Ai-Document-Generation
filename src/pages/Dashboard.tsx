import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Presentation,
  Table2,
  Mic,
  Clock,
  Sparkles,
  MessageSquare,
  BookOpen,
  PenTool,
  ArrowRight,
  Upload,
  ImageIcon,
  Video,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UsageStats } from "@/components/UsageStats";
import { useEffect, useState } from "react";
import { fileHistoryDb, profilesDb } from "@/lib/databaseProxy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const allTools = [
  {
    icon: ImageIcon,
    title: "AI Image Generator",
    description: "Create stunning images from text descriptions",
    link: "/tools/image-generator",
    color: "bg-gradient-to-br from-pink-500 to-purple-600",
    badge: "PRO",
    badgeColor: "bg-amber-500",
  },
  {
    icon: Video,
    title: "AI Video Generator",
    description: "Transform images into animated videos",
    link: "/tools/video-generator",
    color: "bg-gradient-to-br from-red-500 to-orange-500",
    badge: "NEW",
    badgeColor: "bg-green-500",
  },
  {
    icon: FileText,
    title: "Document Creator",
    description: "Create professional Word documents and PDFs instantly",
    link: "/tools/document-creator",
    color: "bg-blue-500",
  },
  {
    icon: PenTool,
    title: "Word Editor",
    description: "Full-featured document editor with AI assistance",
    link: "/tools/word-editor",
    color: "bg-indigo-500",
  },
  {
    icon: Presentation,
    title: "Presentation Maker",
    description: "Generate stunning PowerPoint slides automatically",
    link: "/tools/presentation-maker",
    color: "bg-purple-500",
  },
  {
    icon: Table2,
    title: "Spreadsheet Generator",
    description: "Create Excel files with data and formulas",
    link: "/tools/spreadsheet-maker",
    color: "bg-green-500",
  },
  {
    icon: Mic,
    title: "Voice Generator",
    description: "Convert text to natural-sounding speech",
    link: "/tools/voice-generator",
    color: "bg-orange-500",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description: "Chat with AI for any task or question",
    link: "/tools/chat",
    color: "bg-cyan-500",
  },
  {
    icon: Upload,
    title: "Chat with PDF",
    description: "Upload and chat with your PDF documents",
    link: "/tools/chat-pdf",
    color: "bg-teal-500",
  },
  {
    icon: BookOpen,
    title: "Story Generator",
    description: "Create engaging stories and narratives",
    link: "/tools/story-generator",
    color: "bg-pink-500",
  },
];

interface RecentFile {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;
      
      try {
        const [filesResult, profileResult] = await Promise.all([
          fileHistoryDb.getAll({ order: { column: "created_at", ascending: false } }),
          profilesDb.get(),
        ]);

        setRecentFiles((filesResult.data || []).slice(0, 5));
        
        if (profileResult.data?.full_name) {
          setUserName(profileResult.data.full_name);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const firstName = userName.split(" ")[0] || user.displayName?.split(" ")[0] || "there";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <DashboardLayout>
      <motion.div 
        className="space-y-8 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="text-center py-8">
          <motion.div 
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="h-4 w-4" />
            AI-Powered Document Suite
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome back, {firstName}!
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Create professional documents, presentations, and more with the power of AI
          </p>
        </motion.div>

        {/* Usage Stats */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <UsageStats />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tools Grid */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">AI Tools</h2>
            <Link to="/tools">
              <Button variant="ghost" size="sm" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ y: -5 }}
              >
                <Link to={tool.link}>
                  <Card className={`h-full hover:shadow-lg transition-all cursor-pointer group border hover:border-primary/30 relative overflow-hidden ${index < 2 ? 'ring-2 ring-primary/20' : ''}`}>
                    {(tool as any).badge && (
                      <div className={`absolute top-2 right-2 ${(tool as any).badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                        {(tool as any).badge === 'PRO' && <Crown className="h-3 w-3" />}
                        {(tool as any).badge}
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                        <tool.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                        {tool.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Upload */}
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quick Upload</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Drag and drop files here or click to upload
              </p>
              <Link to="/tools/chat-pdf">
                <Button variant="outline">Upload & Analyze</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Files */}
        {recentFiles.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Recent Files</h2>
              </div>
              <Link to="/files">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-3">
              {recentFiles.map((file) => (
                <Card key={file.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {file.file_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
