// src/lib/api.ts

// --- Configuration ---
// Use environment variable if available, otherwise default to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// --- Types & Interfaces ---

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  // ✅ Added role for RBAC (Role Based Access Control)
  role: "user" | "admin"; 
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  refresh_token: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  is_summarized: boolean;
}

// --- Helper: Auth Headers ---
const getHeaders = (isJson = true) => {
  const headers: HeadersInit = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  
  const token = localStorage.getItem("accessToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
};

// --- Helper: Generic Fetch Wrapper ---
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(options.headers?.hasOwnProperty("Content-Type") ? false : true),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API Request Failed");
  }

  // Return null for 204 No Content
  if (response.status === 204) return null as T;

  return response.json();
}

// ==========================================
// 🔐 AUTH METHODS (Standalone for Auth Pages)
// ==========================================

/**
 * Authenticate user.
 * Used by: LoginPage
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data;
}

/**
 * Register new user.
 * Used by: SignupPage
 */
export async function signup(full_name: string, email: string, password: string): Promise<User> {
  const data = await request<User>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
  return data;
}

// ==========================================
// 🚀 MAIN API OBJECT (For Chat & App Logic)
// ==========================================

export const api = {
  
  // --- Auth Wrappers ---
  auth: {
    login, // Reuses function above
    signup, // Reuses function above
    logout: () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("user");
      localStorage.removeItem("authSession");
      // Optional: Redirect to login
      window.location.href = "/login";
    },
  },

 // --- Users ---
  user: {
    getProfile: () => 
      request<User>("/users/me"),
    
    // Updated to accept avatar_url and password
    updateProfile: (data: { full_name?: string; avatar_url?: string; password?: string }) => 
      request<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // --- Chat Management (Sidebar) ---
  chat: {
    list: () => 
      request<ChatSession[]>("/chat/history"),

    getDetails: (threadId: string) => 
      request<Message[]>(`/chat/history/${threadId}`),

    delete: (threadId: string) => 
      request<{ status: string; id: string }>(`/chat/history/${threadId}`, {
        method: "DELETE",
      }),

    rename: (threadId: string, title: string) => 
      request<{ id: string; title: string }>(`/chat/history/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
  },

  // --- Message Handling ---
  streamMessage: async (
    message: string, 
    threadId: string | null,
    onChunk: (content: string, threadId?: string) => void,
    onError: (error: string) => void,
    onDone: () => void,
    signal?: AbortSignal
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/message/stream`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message, thread_id: threadId }),
        signal: signal, 
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Stream connection failed");
      }
      
      if (!response.body) throw new Error("No readable stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                onError(parsed.error);
              } else if (parsed.content) {
                onChunk(parsed.content, parsed.thread_id);
              }
            } catch (e) { }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Stream stopped by user");
        onDone(); 
      } else {
        onError(err.message || "Stream failed");
      }
    }
  },

  // --- Edit Message ---
  editMessage: async (
    messageId: string, 
    newContent: string,
    onChunk: (content: string) => void,
    onDone: () => void,
    signal?: AbortSignal
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/message/edit`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message_id: messageId, new_content: newContent }),
        signal: signal,
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              
              if (parsed.error) {
                console.error("Stream Error:", parsed.error);
                onChunk(`\n\n**Error:** ${parsed.error}`); 
              } else if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Edit stream failed", err);
    }
  }
};