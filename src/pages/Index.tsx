import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, Presentation, FileSpreadsheet, Mic, 
  MessageSquare, Sparkles, ArrowRight, Check,
  Zap, Shield, Clock, Download, Infinity, MousePointerClick,
  UserX, ChevronRight, FileType, PenTool, Share2,
  Lightbulb, Globe, Edit3, Building, GraduationCap,
  Users, Star, Award, TrendingUp, Layers, Target,
  BookOpen, Briefcase, Heart, Rocket, CheckCircle2,
  BarChart3, Brain, Wand2, Languages, RefreshCw,
  Lock, Headphones, Image, Table, ChevronDown
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { InteractiveLogo } from "@/components/InteractiveLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Import real images
import heroMain from "@/assets/hero-main.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import documentInterface from "@/assets/document-interface.jpg";
import editingInterface from "@/assets/editing-interface.jpg";
import presentationCreation from "@/assets/presentation-creation.jpg";
import voiceGeneration from "@/assets/voice-generation.jpg";
import aiWriting from "@/assets/ai-writing.jpg";
import collaboration from "@/assets/collaboration.jpg";

const toolTabs = [
  { id: "doc", icon: FileText, label: "Doc", color: "bg-primary" },
  { id: "pdf", icon: FileType, label: "PDF", color: "bg-red-500" },
  { id: "slides", icon: Presentation, label: "Slides", color: "bg-orange-500" },
  { id: "excel", icon: FileSpreadsheet, label: "Excel", color: "bg-green-500" },
  { id: "audio", icon: Mic, label: "Audio", color: "bg-purple-500" },
  { id: "chat", icon: MessageSquare, label: "Chat", color: "bg-pink-500" },
];

const featureBadges = [
  { icon: Sparkles, text: "1 Free Credit to Try" },
  { icon: MousePointerClick, text: "1-Click Generate" },
  { icon: Download, text: "Free Downloads" },
  { icon: Users, text: "10 Credits/Day After Signup" },
];

const steps = [
  { step: 1, icon: FileText, title: "Prompt to create", desc: "Enter your prompt to create a document" },
  { step: 2, icon: MessageSquare, title: "Chat with AI to edit", desc: "Refine and edit with AI assistance" },
  { step: 3, icon: Download, title: "Download and export", desc: "Export to Word, PDF, or other formats" },
];

const stats = [
  { number: "1M+", label: "Documents Generated", icon: FileText },
  { number: "50K+", label: "Happy Users", icon: Users },
  { number: "99.9%", label: "Uptime", icon: Shield },
  { number: "4.9/5", label: "User Rating", icon: Star },
];

const trustLogos = [
  { name: "Harvard", icon: GraduationCap },
  { name: "Stanford", icon: GraduationCap },
  { name: "MIT", icon: GraduationCap },
  { name: "Yale", icon: GraduationCap },
  { name: "Cornell", icon: GraduationCap },
  { name: "NYU", icon: GraduationCap },
  { name: "Microsoft", icon: Building },
  { name: "Google", icon: Building },
];

const keyFeatures = [
  { icon: PenTool, title: "AI Writer + Editor", desc: "Use our AI writing generator to write and edit documents with AI.", image: aiWriting },
  { icon: FileType, title: "Powerful AI PDF Generator", desc: "Generate a PDF with AI with a simple prompt.", image: documentInterface },
  { icon: FileText, title: "Use AI to Generate a Report", desc: "Ideal for creating reports and proposals with an AI report generator.", image: editingInterface },
  { icon: MessageSquare, title: "ChatGPT Integration", desc: "Draft documents fast with ChatGPT integration.", image: collaboration },
  { icon: Share2, title: "Easy Export & Share", desc: "Export to Google Drive, Office 365, and Microsoft Word.", image: dashboardPreview },
  { icon: FileSpreadsheet, title: "Smart AI Excel Generator", desc: "Easily generate and edit Excel spreadsheets with AI.", image: documentInterface },
  { icon: Presentation, title: "Fast AI PowerPoint Generator", desc: "Create PowerPoint presentations with our AI generator.", image: presentationCreation },
  { icon: Sparkles, title: "AI Story Generator", desc: "Generate creative AI stories with a simple prompt.", image: aiWriting },
];

const advancedFeatures = [
  { icon: Brain, title: "20+ AI Models", desc: "Access to the most advanced AI models including GPT-5, Gemini Pro, and Claude for highest-quality output." },
  { icon: Wand2, title: "Smart Formatting", desc: "AI automatically formats your documents with proper headings, bullet points, and professional layouts." },
  { icon: Languages, title: "50+ Languages", desc: "Create documents in over 50 languages with native-quality translations and localization." },
  { icon: Image, title: "AI Image Generation", desc: "Generate and embed AI images directly into your documents, presentations, and reports." },
  { icon: Table, title: "Data Tables & Charts", desc: "Automatically create data tables, charts, and visualizations from your data." },
  { icon: RefreshCw, title: "Version History", desc: "Track all changes with complete version history and restore previous versions anytime." },
  { icon: Lock, title: "Enterprise Security", desc: "Bank-level encryption and security for all your documents and data." },
  { icon: Headphones, title: "24/7 Support", desc: "Round-the-clock customer support to help you with any questions or issues." },
];

const freeTools = [
  { icon: FileText, title: "Free AI Document Generator", desc: "Simplify document creation using AI.", link: "/tools/document-creator" },
  { icon: Presentation, title: "Free AI PowerPoint Generator", desc: "Create professional presentations with ease.", link: "/tools/presentation-maker" },
  { icon: FileSpreadsheet, title: "Free AI Spreadsheet Maker", desc: "Generate Excel spreadsheets with AI.", link: "/tools/spreadsheet" },
  { icon: PenTool, title: "Free AI Text Generator", desc: "Write better content faster for any purpose.", link: "/tools/ai-writer" },
  { icon: FileType, title: "Free AI Word Generator", desc: "Generate Word documents instantly with AI.", link: "/tools/word-editor" },
  { icon: Sparkles, title: "Free AI Story Generator", desc: "Generate AI stories with a simple prompt.", link: "/tools/ai-story-generator" },
  { icon: Mic, title: "Free AI Voice Generator", desc: "Create realistic AI generated voiceovers effortlessly.", link: "/tools/voiceover" },
];

const useCases = [
  { icon: Briefcase, title: "Business Professionals", desc: "Create proposals, reports, and presentations that impress clients and stakeholders.", color: "text-blue-500" },
  { icon: GraduationCap, title: "Students & Educators", desc: "Generate research papers, lesson plans, and educational materials in minutes.", color: "text-green-500" },
  { icon: Rocket, title: "Startups & Entrepreneurs", desc: "Build pitch decks, business plans, and investor presentations that win funding.", color: "text-orange-500" },
  { icon: PenTool, title: "Content Creators", desc: "Write blog posts, articles, scripts, and social media content at scale.", color: "text-purple-500" },
  { icon: Building, title: "Enterprise Teams", desc: "Streamline documentation, SOPs, and internal communications across departments.", color: "text-red-500" },
  { icon: Heart, title: "Non-Profits", desc: "Create grant proposals, impact reports, and fundraising materials efficiently.", color: "text-pink-500" },
];

const benefits = [
  { title: "Effortless AI Document Generation", desc: "Simply provide your content to our AI document generation tool, and let AI create professional documents for you." },
  { title: "Overcome Writer's Block", desc: "Our AI document creator helps overcome writer's block by turning your ideas into clear, coherent text." },
  { title: "Save Time with Automation", desc: "Our AI document maker automates the entire writing process, saving you hours on drafting and proofreading." },
  { title: "Customizable Templates", desc: "Our AI document generator offers customizable templates, formatting options, and structure to match your requirements." },
  { title: "Multilingual Support", desc: "Our AI document generation tool supports multiple languages, allowing you to create documents for global audiences." },
  { title: "Easy Updates with AI", desc: "Simply make adjustments, and our AI document creator will automatically reformat and refine the document." },
  { title: "Professional & Business Use", desc: "Whether for business reports, proposals, or research papers, our AI generates professional, high-quality documents." },
  { title: "Streamlined Content Creation", desc: "Speed up the content creation process with our AI document generator - from blogs to business reports." },
  { title: "Works for Any Industry", desc: "Our AI document generation tool can provide documents for legal, educational, corporate, and creative purposes." },
  { title: "Enhanced Productivity", desc: "Boost productivity by letting our AI document creator handle the heavy lifting of writing and editing." },
];

const faqs = [
  { q: "What is an AI document generator?", a: "An AI document generator is a tool that uses machine learning to create documents from prompts, allowing users to produce high-quality, formatted content quickly. Our AI understands context, formatting requirements, and professional standards to deliver polished documents in seconds." },
  { q: "How can an AI document generator improve efficiency?", a: "Our AI document generator automates the formatting, structuring, and drafting of documents, making it ideal for users who need professional-quality results quickly. It can save you hours of manual work on every document you create." },
  { q: "What kinds of documents can your AI create?", a: "Our AI document generator is versatile and can create a wide range of documents, including business reports, proposals, presentations, spreadsheets, research papers, blog posts, stories, scripts, and even creative content like poetry and fiction." },
  { q: "Can I customize the writing from your AI?", a: "Yes, our AI document creator offers extensive customization options. You can modify the tone, style, length, and structure to ensure the document aligns with your specific needs. You can also chat with AI to make iterative improvements." },
  { q: "Is your AI document generator free to use?", a: "Yes, we offer a free tier that allows users to generate documents instantly. You can start creating professional content without any upfront costs. Premium plans are available for users who need more features and higher usage limits." },
  { q: "Can I export documents in different formats?", a: "Absolutely! You can export your documents in PDF, DOCX, PPTX, XLSX, HTML, and other popular formats for easy sharing and collaboration. We also support direct export to Google Drive and OneDrive." },
  { q: "Does your AI support multiple languages?", a: "Yes, our AI document generator supports over 50 languages including English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, and many more. You can create documents in any language or translate existing content." },
  { q: "How secure is my data?", a: "We take security seriously. All data is encrypted in transit and at rest using bank-level AES-256 encryption. We never share your documents with third parties and you can delete your data at any time." },
  { q: "Can I collaborate with my team?", a: "Yes, our platform supports real-time collaboration. You can invite team members to view, edit, and comment on documents. We also offer enterprise plans with advanced team management features." },
  { q: "What AI models do you use?", a: "We use a combination of the latest AI models including GPT-5, Gemini Pro, and other advanced language models to ensure the highest quality output. Our system automatically selects the best model for each task." },
];

const testimonials = [
  { quote: "You've got all the text-generating capabilities of ChatGPT, but also with an easy way to get that text into a shareable, standard format.", source: "Wired", role: "Tech Publication" },
  { quote: "This method is great for making documents, spreadsheets, and presentations... Your documents can include ad copy, formulas, taglines, and more!", source: "PC Guide", role: "Tech Review" },
  { quote: "It's designed to offer users a seamless experience in creating a diverse range of documents... producing documents like PDFs, DOCX becomes a breeze.", source: "Geeky Gadgets", role: "Tech Blog" },
];

const userTestimonials = [
  { quote: "mydocmaker has forever changed how I make presentations. I can now turn any idea into a professional document in minutes.", name: "Sarah Chen", role: "Marketing Director", avatar: "S" },
  { quote: "Beyond saving me hours of labor, this tool has made me something of a hero at my company. Everyone asks how I create such polished documents so fast.", name: "Michael Rodriguez", role: "Business Consultant", avatar: "M" },
  { quote: "As a teacher, I need to create lesson plans and educational materials constantly. This AI tool has been a game-changer for my productivity.", name: "Emily Thompson", role: "High School Teacher", avatar: "E" },
  { quote: "Our startup uses mydocmaker for everything from pitch decks to investor updates. It's helped us raise our seed round with professional materials.", name: "David Kim", role: "Startup Founder", avatar: "D" },
  { quote: "The AI understands exactly what I need. I just describe my document and it creates something better than I could have written myself.", name: "Jessica Martinez", role: "Content Creator", avatar: "J" },
  { quote: "I've tried many AI writing tools, but this is the only one that truly delivers on the promise of professional document generation.", name: "Robert Williams", role: "Project Manager", avatar: "R" },
];

const blogPosts = [
  { title: "How to Use AI to Write Professional Business Reports in 2025", excerpt: "Learn the best practices for leveraging AI document generators to create compelling business reports that impress stakeholders.", readTime: "5 min read", date: "Dec 15, 2025" },
  { title: "The Complete Guide to AI Presentation Makers", excerpt: "Discover how AI presentation tools are revolutionizing the way professionals create slides and pitch decks.", readTime: "7 min read", date: "Dec 12, 2025" },
  { title: "AI Document Generation for Academic Success", excerpt: "A comprehensive guide for students and researchers on using AI tools ethically and effectively for academic writing.", readTime: "6 min read", date: "Dec 10, 2025" },
  { title: "Maximizing Productivity with AI Spreadsheet Generators", excerpt: "Tips and tricks for using AI to create complex spreadsheets, formulas, and data analysis documents.", readTime: "4 min read", date: "Dec 8, 2025" },
];

const comparisonFeatures = [
  { feature: "AI Document Generation", us: true, others: true },
  { feature: "20+ AI Models", us: true, others: false },
  { feature: "Free Tier Available", us: true, others: false },
  { feature: "No Signup Required", us: true, others: false },
  { feature: "50+ Languages", us: true, others: false },
  { feature: "Real-time Collaboration", us: true, others: true },
  { feature: "Export to All Formats", us: true, others: false },
  { feature: "AI Image Generation", us: true, others: false },
  { feature: "24/7 Support", us: true, others: false },
];

const showcaseImages = [
  { src: dashboardPreview, alt: "mydocmaker Dashboard", title: "Intuitive Dashboard" },
  { src: documentInterface, alt: "Document Editor Interface", title: "Document Editor" },
  { src: presentationCreation, alt: "Presentation Creator", title: "Slide Maker" },
  { src: voiceGeneration, alt: "Voice Generation", title: "Voice Generator" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState("doc");
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleGenerate = () => {
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="mydocmaker - Free AI Document Generator | Create Documents, Presentations & More"
        description="Create a 15 page report document instantly. Free AI generator for AI document generation for reports, PDF & Word files, and more. Try it free!"
        canonical="/"
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <InteractiveLogo size="md" />
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {/* Platform Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Platform
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2">
                  <Link to="/tools/document-creator" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Doc Maker</p>
                      <p className="text-xs text-muted-foreground">Generate reports, presentations, spreadsheets, and more</p>
                    </div>
                  </Link>
                  <Link to="/tools/presentation-maker" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Presentation className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Slide Maker</p>
                      <p className="text-xs text-muted-foreground">Create PowerPoint presentations fast with ChatGPT</p>
                    </div>
                  </Link>
                  <Link to="/tools/spreadsheet-maker" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <FileSpreadsheet className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Spreadsheet Maker</p>
                      <p className="text-xs text-muted-foreground">Prompt to create spreadsheets. Works with CSV, Excel</p>
                    </div>
                  </Link>
                  <Link to="/tools/voice-generator" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Mic className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Voice Generator</p>
                      <p className="text-xs text-muted-foreground">Generate high quality voiceovers in ChatGPT</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* AI Tools Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  AI Tools
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2">
                  <Link to="/tools/document-creator" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Document Creator</p>
                      <p className="text-xs text-muted-foreground">Generate documents with AI</p>
                    </div>
                  </Link>
                  <Link to="/tools/writer" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <PenTool className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Text Generator</p>
                      <p className="text-xs text-muted-foreground">Generate text with AI</p>
                    </div>
                  </Link>
                  <Link to="/tools/story-generator" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <BookOpen className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Story Generator</p>
                      <p className="text-xs text-muted-foreground">Generate stories with AI</p>
                    </div>
                  </Link>
                  <Link to="/tools/presentation-maker" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Presentation className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI PowerPoint Generator</p>
                      <p className="text-xs text-muted-foreground">Generate presentations with AI</p>
                    </div>
                  </Link>
                  <Link to="/tools/spreadsheet-maker" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <FileSpreadsheet className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Spreadsheet Maker</p>
                      <p className="text-xs text-muted-foreground">Generate spreadsheets with AI</p>
                    </div>
                  </Link>
                  <Link to="/tools/voice-generator" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Mic className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Voice Generator</p>
                      <p className="text-xs text-muted-foreground">Generate voiceovers with AI</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* ChatGPT Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  ChatGPT
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2">
                  <Link to="/tools/chat" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <MessageSquare className="h-5 w-5 text-pink-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Chat with AI</p>
                      <p className="text-xs text-muted-foreground">Chat with the latest AI models</p>
                    </div>
                  </Link>
                  <Link to="/tools/chat-pdf" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <FileType className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Chat with PDF</p>
                      <p className="text-xs text-muted-foreground">Upload and chat with your PDF files</p>
                    </div>
                  </Link>
                </div>
              </div>

              <Link to="/dashboard/subscription" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Feature Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {featureBadges.map((badge, i) => (
              <div 
                key={badge.text}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full text-sm font-medium"
              >
                <badge.icon className="h-4 w-4 text-primary" />
                {badge.text}
              </div>
            ))}
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Boost Productivity With An AI Generator — Your{" "}
              <span className="text-primary">AI Document Generator</span> For Smarter Documents
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-2">
              Create a 15 page report document instantly. Free AI generator for AI document generation for reports, PDF & Word files, and more.{" "}
              <Link to="/auth" className="text-primary font-medium hover:underline">Try it free!</Link>
            </p>
          </motion.div>

          {/* Tool Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10"
          >
            <div className="inline-flex flex-wrap justify-center bg-muted/50 p-1.5 rounded-xl border border-border/50 mb-6">
              {toolTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Prompt Input */}
            <div className="max-w-3xl mx-auto">
              <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
                <Textarea
                  placeholder="Create a 5-page proposal for using AI in digital marketing..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] border-0 bg-transparent resize-none focus-visible:ring-0 text-base"
                />
              </div>
              <Button 
                onClick={handleGenerate}
                size="lg" 
                className="mt-6 gap-2 px-8"
              >
                <Sparkles className="h-5 w-5" />
                Generate
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background text-sm font-bold mb-4">
                  Step {step.step}
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Logos */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm text-muted-foreground mb-8"
          >
            Over <span className="text-primary font-semibold">1 million files</span> generated, with users from
          </motion.p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {trustLogos.map((logo, i) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <logo.icon className="h-5 w-5" />
                <span className="font-semibold">{logo.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-primary">{stat.number}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Super Fast Section with Real Image */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-primary">Super Fast</span> AI Document Generator
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
              Transform your ideas into professional documents in seconds with AI
            </p>
          </motion.div>

          {/* Dashboard Preview Image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-b from-primary/20 to-transparent p-1 rounded-2xl">
              <img 
                src={dashboardPreview} 
                alt="mydocmaker AI Document Generator Dashboard Preview" 
                className="rounded-xl shadow-2xl w-full"
              />
            </div>
            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="absolute -left-4 top-1/4 bg-card border border-border rounded-lg p-3 shadow-lg hidden md:block"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">10x Faster</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="absolute -right-4 top-1/3 bg-card border border-border rounded-lg p-3 shadow-lg hidden md:block"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Pro Quality</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Product Showcase Gallery */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Build Anything, Beautifully</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From documents to presentations, spreadsheets to voiceovers - create professional content with AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {showcaseImages.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card hover:shadow-xl transition-all"
              >
                <img 
                  src={item.src} 
                  alt={item.alt}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-4">
                  <p className="font-semibold text-sm">{item.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features with Images */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">Key Features</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create professional documents, presentations, and more with AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {keyFeatures.slice(0, 4).map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-lg transition-all group"
              >
                <div className="flex-shrink-0">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-24 h-24 object-cover rounded-lg group-hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {keyFeatures.slice(4).map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Generator Section with Real Image */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                <span className="text-primary">AI Generator</span> for AI Document Generation
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Attach your files in prompt to import content and generate a new document with AI. Our advanced AI understands context and creates perfectly formatted documents.
              </p>
              <ul className="space-y-3">
                {["Import from existing documents", "Attach images and PDFs", "AI understands your context", "Generate in any format"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="mt-6 gap-2">
                  Try It Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img 
                src={documentInterface}
                alt="AI Document Generator Interface"
                className="rounded-2xl shadow-2xl border border-border"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Draft and Edit Section with Real Image */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <img 
                src={editingInterface}
                alt="AI Document Editing Interface"
                className="rounded-2xl shadow-2xl border border-border"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                <span className="text-primary">Draft and Edit Documents</span> with AI Generation
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Chat with AI to edit and draft documents faster with automated writing. Make iterative improvements and refine your content until it's perfect.
              </p>
              <ul className="space-y-3">
                {["Real-time AI editing", "Chat-based refinements", "Smart formatting", "Instant previews"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Advanced AI Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful capabilities that set us apart from other document generators
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {advancedFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-5 text-center hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Tools Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Free AI Tools</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Access all our AI-powered tools completely free. No credit card required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeTools.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={tool.link}
                  className="block bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg hover:border-primary/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <tool.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-primary mb-2">{tool.title}</h3>
                  <p className="text-muted-foreground text-sm">{tool.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Built for Everyone</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're a student, professional, or entrepreneur, mydocmaker adapts to your needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, i) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 ${useCase.color}`}>
                  <useCase.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{useCase.title}</h3>
                <p className="text-muted-foreground text-sm">{useCase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Press */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Featured in Top Publications</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See what leading tech publications are saying about mydocmaker
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.source}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <p className="font-bold text-xl mb-1">{t.source}</p>
                <p className="text-xs text-muted-foreground mb-4">{t.role}</p>
                <p className="text-muted-foreground italic text-sm leading-relaxed">"{t.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Loved by Thousands</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join over 50,000 happy users who trust mydocmaker for their document creation needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTestimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">"{t.quote}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Why Choose mydocmaker?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how we compare to other AI document generators
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold">
              <div>Feature</div>
              <div className="text-center text-primary">mydocmaker</div>
              <div className="text-center text-muted-foreground">Others</div>
            </div>
            {comparisonFeatures.map((item, i) => (
              <div key={item.feature} className={`grid grid-cols-3 p-4 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                <div className="text-sm">{item.feature}</div>
                <div className="text-center">
                  {item.us ? <CheckCircle2 className="h-5 w-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="text-center">
                  {item.others ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl p-8 sm:p-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-primary">
              Why mydocmaker for AI document generation?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-primary">Frequently Asked Questions</h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`}
                className="bg-card border border-border rounded-xl px-6"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-12"
          >
            <div>
              <h2 className="text-3xl font-bold mb-2">Exploring the Future of AI Document Generation</h2>
              <p className="text-muted-foreground">
                Explore the Latest Solutions and Best Practices in AI Document Generation
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogPosts.map((post, i) => (
              <motion.div
                key={post.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                <h3 className="font-semibold text-lg mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-primary" />
                    </div>
                    <span>mydocmaker</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-3xl p-8 sm:p-12 border border-primary/20"
          >
            <h2 className="text-3xl font-bold mb-4">Start Creating Powerful AI Documents Today</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Sign up now and see how AI can transform your document creation process.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 px-8">
                Get Started <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> No credit card required</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Free tier available</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <InteractiveLogo size="sm" />
              <p className="text-sm text-muted-foreground mt-4">
                AI-powered document generation for everyone.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/tools/document-creator" className="hover:text-foreground transition-colors">Doc Maker</Link></li>
                <li><Link to="/tools/presentation-maker" className="hover:text-foreground transition-colors">Slide Maker</Link></li>
                <li><Link to="/tools/spreadsheet" className="hover:text-foreground transition-colors">Spreadsheet Maker</Link></li>
                <li><Link to="/tools/voiceover" className="hover:text-foreground transition-colors">AI Voice Generator</Link></li>
                <li><Link to="/tools/chat-pdf" className="hover:text-foreground transition-colors">Chat PDF</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Generate with AI</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/tools/ai-writer" className="hover:text-foreground transition-colors">AI Text Generator</Link></li>
                <li><Link to="/tools/ai-story-generator" className="hover:text-foreground transition-colors">AI Story Generator</Link></li>
                <li><Link to="/tools/pdf-generator" className="hover:text-foreground transition-colors">AI PDF Generator</Link></li>
                <li><Link to="/tools/chat" className="hover:text-foreground transition-colors">AI Chat</Link></li>
                <li><Link to="/tools/word-editor" className="hover:text-foreground transition-colors">AI Word Generator</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/subscription" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link></li>
                <li><Link to="/status" className="hover:text-foreground transition-colors">System Status</Link></li>
                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookies Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
                <li><Link to="/service-policy" className="hover:text-foreground transition-colors">Service Policy</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6 border-t border-border">
            <a href="tel:+923369183893" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>📞</span> +92 336 9183893
            </a>
            <a href="mailto:maheerkhan3a@gmail.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>✉️</span> maheerkhan3a@gmail.com
            </a>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border gap-4">
            <p className="text-sm text-muted-foreground">
              AI-generated content can contain mistakes. Consider checking important information.
            </p>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} mydocmaker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
