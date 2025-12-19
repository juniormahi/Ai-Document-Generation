import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { InteractiveLogo } from "@/components/InteractiveLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/data/faqs";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="FAQ - Frequently Asked Questions | MyDocMaker"
        description="Find answers to common questions about MyDocMaker's AI document generation, pricing, features, and more."
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find answers to common questions about MyDocMaker's AI-powered document generation platform.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mb-8"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${faq.id}`}
                className="bg-card border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No questions found matching your search.</p>
            </div>
          )}
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center bg-muted/30 rounded-2xl p-8"
        >
          <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for? We're here to help.
          </p>
          <Link to="/contact">
            <Button>Contact Us</Button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
