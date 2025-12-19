import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/hooks/useFirebaseAuth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  signInWithGithub: () => Promise<{ isNewUser: boolean }>;
  signInWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const sendLoginNotification = async (user: User, loginMethod: string) => {
    try {
      await supabase.functions.invoke("send-login-notification", {
        body: {
          email: user.email,
          name: user.displayName || user.email?.split("@")[0],
          loginMethod,
          userAgent: navigator.userAgent,
        },
      });
    } catch (error) {
      console.error("Failed to send login notification:", error);
    }
  };

  const sendWelcomeEmail = async () => {
    try {
      const headers = await getAuthHeaders();
      await supabase.functions.invoke("send-welcome-email", { headers });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      // Send login notification in background
      sendLoginNotification(result.user, "Email & Password");
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Account created!",
        description: "Welcome to MyDocMaker. Check your email for a welcome message!",
      });
      // Send welcome email in background (after a short delay to ensure profile is created)
      setTimeout(async () => {
        await sendWelcomeEmail();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser ?? false;
      toast({
        title: isNewUser ? "Welcome!" : "Welcome back!",
        description: `You've successfully signed in with Google.`,
      });
      // Send appropriate email
      if (isNewUser) {
        setTimeout(async () => {
          await sendWelcomeEmail();
        }, 2000);
      } else {
        sendLoginNotification(result.user, "Google");
      }
      return { isNewUser };
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithGithub = async (): Promise<{ isNewUser: boolean }> => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser ?? false;
      toast({
        title: isNewUser ? "Welcome!" : "Welcome back!",
        description: `You've successfully signed in with GitHub.`,
      });
      // Send appropriate email
      if (isNewUser) {
        setTimeout(async () => {
          await sendWelcomeEmail();
        }, 2000);
      } else {
        sendLoginNotification(result.user, "GitHub");
      }
      return { isNewUser };
    } catch (error: any) {
      toast({
        title: "GitHub sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      toast({
        title: "Verification code sent",
        description: "Check your phone for the verification code.",
      });
      return confirmationResult;
    } catch (error: any) {
      toast({
        title: "Phone sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signInWithGoogle, signInWithGithub, signInWithPhone, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
