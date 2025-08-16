export type ActivityType = 'poll' | 'vote' | 'comment';

export interface PollOption {
  text: string;
  image_url: string | null;
}

export type ActivityItem = {
  id: string;
  type: ActivityType;
  created_at: string;
  user_name: string;
  user_avatar: string;
  poll_id: number;
  poll_question: string;
  poll_image?: string;
  vote_option?: string;
  comment_content?: string;
};

export type PollWithStats = {
  id: number;
  question: string;
  image_url?: string;
  created_at: string;
  total_votes: number;
  comment_count: number;
  votes_count: number;
  options: PollOption[];
  region: string | null;
  category: string | null;
  comments_count: number;
  votes_by_region: {
    region_id: number;
    region_name: string;
    vote_count: number;
  }[];
};

export type InteractionItem = {
  id: string;
  type: 'vote' | 'comment' | 'reply';
  created_at: string;
  user_name: string;
  user_avatar: string;
  poll_id: number;
  poll_question: string;
  poll_image?: string;
  vote_option?: string;
  comment_content?: string;
};

interface Voter {
  user_id: string;
  email: string;
  username: string;
  region_name: string;
  voted_at: string;
}