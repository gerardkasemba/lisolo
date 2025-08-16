// // components/profile/Conversations.tsx
// 'use client';

// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import CommentThread from './CommentThread';

// interface Comment {
//   id: number;
//   poll_id: number;
//   content: string;
//   user_id: string;
//   created_at: string;
//   parent_id: number | null;
// }

// interface ConversationsProps {
//   userId: string;
// }

// export default function Conversations({ userId }: ConversationsProps) {
//   const [comments, setComments] = useState<Comment[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchComments = async () => {
//       try {
//         // Fetch user's polls
//         const { data: polls, error: pollError } = await supabase
//           .from('polls')
//           .select('id')
//           .eq('created_by', userId);
//         if (pollError) throw pollError;

//         const pollIds = polls.map((poll) => poll.id);

//         // Fetch comments on user's polls
//         const { data, error } = await supabase
//           .from('comments')
//           .select('id, poll_id, content, user_id, created_at, parent_id')
//           .in('poll_id', pollIds)
//           .order('created_at', { ascending: true });
//         if (error) throw error;

//         // Build threaded comments
//         const threadedComments = buildThreadedComments(data || []);
//         setComments(threadedComments);
//       } catch (error) {
//         console.error('Error fetching comments:', error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchComments();
//   }, [userId]);

//   if (loading) {
//     return <div className="text-center">Loading conversations...</div>;
//   }

//   if (comments.length === 0) {
//     return <div className="text-center text-gray-600 dark:text-gray-300">No conversations yet.</div>;
//   }

//   return (
//     <div className="space-y-4">
//       <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Ongoing Conversations</h3>
//       {comments.map((comment) => (
//         <CommentThread key={comment.id} comment={comment} />
//       ))}
//     </div>
//   );
// }

// function buildThreadedComments(comments: Comment[]): Comment[] {
//   const map = new Map<number, Comment>();
//   const threaded: Comment[] = [];

//   comments.forEach((comment) => {
//     map.set(comment.id, { ...comment, children: [] });
//   });

//   comments.forEach((comment) => {
//     if (comment.parent_id) {
//       const parent = map.get(comment.parent_id);
//       if (parent) {
//         parent.children = parent.children || [];
//         parent.children.push(map.get(comment.id)!);
//       }
//     } else {
//       threaded.push(map.get(comment.id)!);
//     }
//   });

//   return threaded;
// }