import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  token: string;
  user: User;
  userId: string;
  email: string | null;
  role: string;
  expiresAt: string | null;
  githubProviderToken: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
