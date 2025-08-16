// types/profiles.ts
export interface Poll {
  id: number;
  question: string;
  category: string | null;
  region: string | null;
  options: { text: string; image_url?: string }[];
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_votes?: number;
  comment_count?: number;
}

export interface Comment {
  id: number;
  poll_id: number;
  content: string;
  user_id: string;
  created_at: string;
  parent_id?: number | null; // Optional to match database schema
  children?: Reply[]; // Children are Reply[], not Comment[]
}

export interface Reply {
  id: number;
  comment_id: number;
  content: string;
  user_id: string;
  created_at: string;
  parent_reply_id?: number | null;
  user_name?: string; // From user_metadata.full_name
}

export interface Reply {
  id: number;
  comment_id: number; // Links to the parent comment
  content: string; // Reply text, may include mention (e.g., "**userId**: content")
  user_id: string; // ID of the user who posted the reply
  created_at: string; // Timestamp
  parent_reply_id?: number | null; // Changed to number | null | undefined to match profiles.ts
}