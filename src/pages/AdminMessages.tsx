import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { InteractiveLogo } from "@/components/InteractiveLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Mail, Trash2, RefreshCw, 
  MessageSquare, Clock, CheckCircle2, ShieldAlert, Send, Loader2, Reply
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "maheerkhan3a@gmail.com";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  read_at: string | null;
}

export default function AdminMessages() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Check admin access
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages((data as ContactMessage[]) || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMessages();
    }
  }, [isAdmin]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page.
          </p>
          <Link to="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      
      setMessages(messages.map(m => 
        m.id === id ? { ...m, status: "read", read_at: new Date().toISOString() } : m
      ));
      toast.success("Marked as read");
    } catch (error: any) {
      toast.error("Failed to update message");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMessages(messages.filter(m => m.id !== id));
      setSelectedMessage(null);
      toast.success("Message deleted");
    } catch (error: any) {
      toast.error("Failed to delete message");
    }
  };

  const openMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    if (message.status === "unread") {
      markAsRead(message.id);
    }
  };

  const openReplyDialog = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplySubject(`Re: ${message.subject}`);
    setReplyMessage("");
    setReplyDialogOpen(true);
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyMessage.trim()) {
      toast.error("Please enter a reply message");
      return;
    }

    setSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-reply-email", {
        body: {
          to: selectedMessage.email,
          subject: replySubject,
          message: replyMessage,
          originalMessage: selectedMessage.message,
          senderName: selectedMessage.name,
        },
      });

      if (error) throw error;

      // Update message status to replied
      await supabase
        .from("contact_messages")
        .update({ status: "replied" })
        .eq("id", selectedMessage.id);

      setMessages(messages.map(m => 
        m.id === selectedMessage.id ? { ...m, status: "replied" } : m
      ));

      toast.success("Reply sent successfully!");
      setReplyDialogOpen(false);
      setSelectedMessage(null);
      setReplyMessage("");
      setReplySubject("");
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const unreadCount = messages.filter(m => m.status === "unread").length;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact Messages - Admin | MyDocMaker"
        description="View and manage contact form submissions"
      />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <InteractiveLogo size="md" />
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                Contact Messages
              </h1>
              <p className="text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All messages read'}
              </p>
            </div>
            <Button onClick={fetchMessages} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Messages List */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-4">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground">Contact form submissions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => openMessage(message)}
                  className={`bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50 ${
                    message.status === "unread" ? "border-primary/30 bg-primary/5" : 
                    message.status === "replied" ? "border-green-500/30" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold truncate">{message.name}</span>
                        <span className="text-sm text-muted-foreground truncate">&lt;{message.email}&gt;</span>
                        {message.status === "unread" && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                        {message.status === "replied" && (
                          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">Replied</Badge>
                        )}
                      </div>
                      <h3 className="font-medium mb-1 truncate">{message.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedMessage?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>{" "}
                  <span className="font-medium">{selectedMessage.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">
                    {selectedMessage.email}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedMessage.status === "read" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Read {selectedMessage.read_at && `at ${new Date(selectedMessage.read_at).toLocaleString()}`}</span>
                    </>
                  )}
                  {selectedMessage.status === "replied" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Replied</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => {
                      setSelectedMessage(null);
                      setTimeout(() => openReplyDialog(selectedMessage), 100);
                    }}
                  >
                    <Reply className="h-4 w-4" />
                    Reply
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => deleteMessage(selectedMessage.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={(open) => {
        setReplyDialogOpen(open);
        if (!open) {
          setReplyMessage("");
          setReplySubject("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5" />
              Reply to {selectedMessage?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Replying to: <span className="text-foreground">{selectedMessage.email}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-subject">Subject</Label>
                <Input
                  id="reply-subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-message">Message</Label>
                <Textarea
                  id="reply-message"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Original message:</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{selectedMessage.message}</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setReplyDialogOpen(false)}
                  disabled={sendingReply}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendReply}
                  disabled={sendingReply || !replyMessage.trim()}
                  className="gap-2"
                >
                  {sendingReply ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
