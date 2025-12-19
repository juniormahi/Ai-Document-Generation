import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./contexts/AuthContext";
import { CookieConsent } from "./components/CookieConsent";
import { PageTransition } from "./components/PageTransition";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Files from "./pages/Files";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Settings from "./pages/Settings";
import Tools from "./pages/Tools";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Blog from "./pages/Blog";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import About from "./pages/About";
import DocumentCreator from "./pages/tools/DocumentCreator";
import PresentationMaker from "./pages/tools/PresentationMaker";
import AIWriter from "./pages/tools/AIWriter";
import AIStoryGenerator from "./pages/tools/AIStoryGenerator";
import Spreadsheet from "./pages/tools/Spreadsheet";
import Voiceover from "./pages/tools/Voiceover";
import Chat from "./pages/tools/Chat";
import ChatPDF from "./pages/tools/ChatPDF";
import WordEditorPage from "./pages/tools/WordEditorPage";
import ImageGenerator from "./pages/tools/ImageGenerator";
import VideoGenerator from "./pages/tools/VideoGenerator";
import Gallery from "./pages/Gallery";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Debug from "./pages/Debug";

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public homepage */}
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        
        {/* Auth routes */}
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PageTransition><Auth mode="signin" /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Auth mode="signup" /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        
        {/* Main dashboard */}
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/files" element={<PageTransition><Files /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/dashboard/subscription" element={<PageTransition><Subscription /></PageTransition>} />
        <Route path="/tools" element={<PageTransition><Tools /></PageTransition>} />
        <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
        {/* Tools */}
        <Route path="/tools/document-creator" element={<PageTransition><DocumentCreator /></PageTransition>} />
        <Route path="/tools/presentation-maker" element={<PageTransition><PresentationMaker /></PageTransition>} />
        <Route path="/tools/writer" element={<PageTransition><AIWriter /></PageTransition>} />
        <Route path="/tools/story-generator" element={<PageTransition><AIStoryGenerator /></PageTransition>} />
        <Route path="/tools/spreadsheet-maker" element={<PageTransition><Spreadsheet /></PageTransition>} />
        <Route path="/tools/voice-generator" element={<PageTransition><Voiceover /></PageTransition>} />
        <Route path="/tools/chat" element={<PageTransition><Chat /></PageTransition>} />
        <Route path="/tools/chat-pdf" element={<PageTransition><ChatPDF /></PageTransition>} />
        <Route path="/tools/word-editor" element={<PageTransition><WordEditorPage /></PageTransition>} />
        <Route path="/tools/image-generator" element={<PageTransition><ImageGenerator /></PageTransition>} />
        <Route path="/tools/video-generator" element={<PageTransition><VideoGenerator /></PageTransition>} />
        {/* Legacy routes - redirect */}
        <Route path="/tools/ai-writer" element={<Navigate to="/tools/writer" replace />} />
        <Route path="/tools/ai-story-generator" element={<Navigate to="/tools/story-generator" replace />} />
        <Route path="/tools/spreadsheet" element={<Navigate to="/tools/spreadsheet-maker" replace />} />
        <Route path="/tools/voiceover" element={<Navigate to="/tools/voice-generator" replace />} />
        <Route path="/tools/pdf-generator" element={<Navigate to="/tools/document-creator" replace />} />
        <Route path="/pricing" element={<Navigate to="/dashboard/subscription" replace />} />
        
        {/* Debug */}
        <Route path="/debug" element={<PageTransition><Debug /></PageTransition>} />
        
        {/* Catch-all */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
