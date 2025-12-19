import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { InteractiveLogo } from "@/components/InteractiveLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ServicePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Service Policy - MyDocMaker"
        description="Learn about MyDocMaker's service delivery policy, including how our AI document generation services work and what to expect."
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
        >
          <h1 className="text-4xl font-bold mb-4">Service Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 19, 2025</p>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Overview</h2>
              <p className="text-muted-foreground">
                MyDocMaker is a digital service platform that provides AI-powered document generation tools. As a purely digital service, we do not ship physical products. All services are delivered electronically through our web-based platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Delivery</h2>
              <p className="text-muted-foreground mb-4">
                Our services are delivered instantly upon use:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Document Generation:</strong> Documents are generated in real-time and available for immediate download</li>
                <li><strong>AI Chat:</strong> Responses are provided instantly within our platform</li>
                <li><strong>Presentations & Spreadsheets:</strong> Created on-demand and ready for export immediately</li>
                <li><strong>Voice Generation:</strong> Audio files are generated and available for download within seconds</li>
                <li><strong>Image Generation:</strong> AI images are created and delivered instantly</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Subscription Activation</h2>
              <p className="text-muted-foreground mb-4">
                Premium subscriptions are activated immediately upon successful payment:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access to premium features is granted instantly after payment confirmation</li>
                <li>Monthly credits are added to your account immediately</li>
                <li>You will receive a confirmation email with your subscription details</li>
                <li>No waiting period or manual activation required</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
              <p className="text-muted-foreground mb-4">
                We strive to maintain 99.9% uptime for our services:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Our platform is available 24/7 from anywhere in the world</li>
                <li>Scheduled maintenance is announced in advance via email</li>
                <li>Emergency maintenance may occur without notice to protect service integrity</li>
                <li>Service status updates are available on our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Credit System</h2>
              <p className="text-muted-foreground mb-4">
                Our services operate on a credit-based system:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Free Users:</strong> Receive 10 daily credits for document generation and 2 daily credits for video generation</li>
                <li><strong>Premium Users:</strong> Receive enhanced monthly credit allocations based on subscription tier</li>
                <li>Credits reset according to your billing cycle</li>
                <li>Unused credits do not roll over to the next period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">File Storage & Downloads</h2>
              <p className="text-muted-foreground mb-4">
                Generated content is handled as follows:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Generated documents are stored in your account for easy access</li>
                <li>Files can be downloaded in multiple formats (PDF, DOCX, PPTX, XLSX, etc.)</li>
                <li>Free users have limited storage; premium users have expanded storage</li>
                <li>We recommend downloading important files as backup</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Limitations</h2>
              <p className="text-muted-foreground mb-4">
                Please be aware of the following limitations:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>AI-generated content may require review and editing for accuracy</li>
                <li>Generation quality depends on the clarity and detail of your prompts</li>
                <li>Some complex formatting may require manual adjustment after export</li>
                <li>Large documents may take slightly longer to generate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Customer Support</h2>
              <p className="text-muted-foreground mb-4">
                We provide comprehensive customer support:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Email Support:</strong> <a href="mailto:maheerkhan3a@gmail.com" className="text-primary hover:underline">maheerkhan3a@gmail.com</a></li>
                <li><strong>Phone Support:</strong> <a href="tel:+923369183893" className="text-primary hover:underline">+92 336 9183893</a></li>
                <li><strong>Response Time:</strong> Within 24 hours for email inquiries</li>
                <li><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (PKT)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify, suspend, or discontinue any part of our service at any time. We will provide reasonable notice for significant changes that affect your subscription. Continued use of the service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground">
                For any questions about our service policy, please contact us at{" "}
                <a href="mailto:maheerkhan3a@gmail.com" className="text-primary hover:underline">maheerkhan3a@gmail.com</a>{" "}
                or call <a href="tel:+923369183893" className="text-primary hover:underline">+92 336 9183893</a>.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
