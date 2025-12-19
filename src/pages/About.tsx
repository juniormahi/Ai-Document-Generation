import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { InteractiveLogo } from "@/components/InteractiveLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Target, Users, Zap, Globe, Shield, Heart } from "lucide-react";

export default function About() {
  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're on a mission to democratize professional document creation, making it accessible to everyone regardless of writing skill or technical expertise.",
    },
    {
      icon: Users,
      title: "User-Focused",
      description: "Every feature we build starts with understanding our users' needs. Your success is our success.",
    },
    {
      icon: Zap,
      title: "Innovation First",
      description: "We leverage cutting-edge AI technology to continuously improve and deliver the best document generation experience.",
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Supporting 50+ languages, we serve users worldwide, breaking down language barriers in professional communication.",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Your documents are encrypted and secure. We never share your content with third parties.",
    },
    {
      icon: Heart,
      title: "Community",
      description: "We're building more than a product – we're building a community of creators, professionals, and innovators.",
    },
  ];

  const stats = [
    { number: "1M+", label: "Documents Created" },
    { number: "50K+", label: "Happy Users" },
    { number: "50+", label: "Languages" },
    { number: "99.9%", label: "Uptime" },
  ];

  const team = [
    { name: "AI Document Team", role: "Engineering", description: "Building the future of document creation" },
    { name: "Design Team", role: "Product Design", description: "Crafting intuitive user experiences" },
    { name: "Support Team", role: "Customer Success", description: "Here to help you succeed" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About Us - MyDocMaker"
        description="Learn about MyDocMaker's mission to revolutionize document creation with AI. Discover our story, values, and the team behind the platform."
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Empowering Everyone to Create
              <span className="text-primary"> Professional Documents</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              MyDocMaker was founded with a simple belief: creating professional documents shouldn't require hours of work or specialized skills. AI can help everyone communicate more effectively.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                MyDocMaker started with a frustration we've all experienced: spending hours formatting a document, struggling with writer's block, or trying to make a presentation look professional. We knew there had to be a better way.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                In 2024, we launched MyDocMaker with a vision to harness the power of AI to transform how people create documents. What started as a simple tool to generate reports has evolved into a comprehensive platform supporting documents, presentations, spreadsheets, and more.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Today, MyDocMaker serves over 50,000 users worldwide – from students writing their first research papers to Fortune 500 companies streamlining their documentation workflows. We're just getting started.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              These principles guide everything we do at MyDocMaker.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-3xl p-8 sm:p-12 border border-primary/20"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Join thousands of users who are already creating amazing documents with AI.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 px-8">
                Start Creating <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
