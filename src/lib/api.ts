import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { supabase } from "@/integrations/supabase/client";

/**
 * Get Firebase ID token for authenticated requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please sign in to continue");
  }

  const token = await user.getIdToken();
  // Do NOT override Authorization (platform JWT verification). See _shared/auth.ts.
  return {
    "x-client-info": `firebase:${token}`,
  };
}

/**
 * Invoke a Supabase edge function with Firebase authentication
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers,
  });

  if (error) {
    console.error(`Edge function ${functionName} error:`, error);
    throw error;
  }

  return data as T;
}

export async function generateContent(prompt: string, type: "document" | "presentation" | "story" | "writer" = "document") {
  try {
    const data = await invokeEdgeFunction<{ content: string }>('generate-content', { prompt, type });
    
    if (!data?.content) throw new Error("No content generated");

    return data.content;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

export async function saveGeneratedFile(
  userId: string,
  title: string,
  content: string,
  fileType: "document" | "presentation" | "story" | "writer"
) {
  try {
    const docRef = await addDoc(collection(db, "generated_files"), {
      user_id: userId,
      title,
      content,
      file_type: fileType,
      created_at: serverTimestamp(),
    });

    return { id: docRef.id };
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
}
