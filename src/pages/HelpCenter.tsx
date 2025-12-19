import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { InteractiveLogo } from "@/components/InteractiveLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Search, FileText, CreditCard, Settings, Users, 
  Shield, Zap, HelpCircle, BookOpen, Video, Image, Mic,
  ChevronRight, Phone, Mail
} from "lucide-react";
import { useState } from "react";

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
}

const categories = [
  { id: "getting-started", name: "Getting Started", icon: Zap, color: "text-green-500" },
  { id: "documents", name: "Documents & Files", icon: FileText, color: "text-blue-500" },
  { id: "ai-tools", name: "AI Tools", icon: BookOpen, color: "text-purple-500" },
  { id: "billing", name: "Billing & Subscription", icon: CreditCard, color: "text-orange-500" },
  { id: "account", name: "Account Settings", icon: Settings, color: "text-gray-500" },
  { id: "security", name: "Privacy & Security", icon: Shield, color: "text-red-500" },
];

const articles: Article[] = [
  // Getting Started
  { id: "1", title: "How to create your first document", description: "Learn how to generate your first AI-powered document in minutes", category: "getting-started" },
  { id: "2", title: "Understanding credits and usage", description: "How credits work and how to track your usage", category: "getting-started" },
  { id: "3", title: "Quick start guide for new users", description: "Everything you need to know to get started with MyDocMaker", category: "getting-started" },
  { id: "4", title: "Navigating the dashboard", description: "A complete guide to your MyDocMaker dashboard", category: "getting-started" },
  
  // Documents & Files
  { id: "5", title: "Exporting documents to different formats", description: "How to export your documents as PDF, DOCX, PPTX, and more", category: "documents" },
  { id: "6", title: "Managing your document library", description: "Organize, search, and manage your generated documents", category: "documents" },
  { id: "7", title: "Editing AI-generated content", description: "Tips for refining and customizing your documents", category: "documents" },
  { id: "8", title: "Creating presentations with AI", description: "Generate professional PowerPoint presentations", category: "documents" },
  
  // AI Tools
  { id: "9", title: "Using the AI Image Generator", description: "Create stunning images with our AI image tool", category: "ai-tools" },
  { id: "10", title: "AI Voice Generator guide", description: "Generate realistic voiceovers for your content", category: "ai-tools" },
  { id: "11", title: "Chat with AI assistant", description: "Get help and generate content through conversation", category: "ai-tools" },
  { id: "12", title: "AI Story Generator tips", description: "Create engaging stories with AI assistance", category: "ai-tools" },
  
  // Billing
  { id: "13", title: "Subscription plans explained", description: "Compare free and premium plans", category: "billing" },
  { id: "14", title: "How to upgrade your plan", description: "Step-by-step guide to upgrading your subscription", category: "billing" },
  { id: "15", title: "Cancellation and refund policy", description: "Understanding our refund and cancellation process", category: "billing" },
  { id: "16", title: "Payment methods and billing", description: "Accepted payment methods and billing information", category: "billing" },
  
  // Account
  { id: "17", title: "Updating your profile", description: "Change your name, email, and profile picture", category: "account" },
  { id: "18", title: "Changing your password", description: "How to update your account password", category: "account" },
  { id: "19", title: "Managing notifications", description: "Customize your email and app notifications", category: "account" },
  { id: "20", title: "Deleting your account", description: "How to permanently delete your MyDocMaker account", category: "account" },
  
  // Security
  { id: "21", title: "How we protect your data", description: "Our security measures and data protection practices", category: "security" },
  { id: "22", title: "Two-factor authentication", description: "Enable 2FA for extra account security", category: "security" },
  { id: "23", title: "Privacy settings", description: "Control your privacy and data sharing preferences", category: "security" },
  { id: "24", title: "Reporting security issues", description: "How to report vulnerabilities or security concerns", category: "security" },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedArticles = categories.map((cat) => ({
    ...cat,
    articles: filteredArticles.filter((a) => a.category === cat.id),
  }));

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Help Center - MyDocMaker"
        description="Find answers, guides, and support articles to help you get the most out of MyDocMaker's AI document generation platform."
      />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <InteractiveLogo size="md" />
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HelpCircle className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Search our knowledge base or browse categories below
            </p>
            
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {categories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.id ? null : category.id
                )}
                className={`p-4 rounded-xl border transition-all text-center ${
                  selectedCategory === category.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-card"
                }`}
              >
                <category.icon className={`h-8 w-8 mx-auto mb-2 ${category.color}`} />
                <span className="text-sm font-medium">{category.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Articles by Category */}
          {selectedCategory ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {categories.find((c) => c.id === selectedCategory)?.name}
                </h2>
                <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
                  View all categories
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {groupedArticles.map((group) => (
                group.articles.length > 0 && (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <group.icon className={`h-6 w-6 ${group.color}`} />
                      <h2 className="text-xl font-semibold">{group.name}</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {group.articles.slice(0, 4).map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  </motion.div>
                )
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-muted-foreground mb-8">
            Our support team is here to assist you with any questions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:maheerkhan3a@gmail.com">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Email Support
              </Button>
            </a>
            <a href="tel:+923369183893">
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                Call Us
              </Button>
            </a>
            <Link to="/contact">
              <Button className="gap-2">
                Contact Us
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
      <h3 className="font-medium mb-2 group-hover:text-primary transition-colors">
        {article.title}
      </h3>
      <p className="text-sm text-muted-foreground">{article.description}</p>
      <div className="flex items-center gap-1 mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Read article <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}
