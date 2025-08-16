// utils/commentUtils.ts
import { Comment, Reply } from '@/types/profiles';

export function buildThreadedComments(comments: Comment[], replies: Reply[]): Comment[] {
  const replyMap = new Map<number, Reply[]>();
  replies.forEach((reply) => {
    const commentReplies = replyMap.get(reply.comment_id) || [];
    commentReplies.push(reply);
    replyMap.set(reply.comment_id, commentReplies);
  });

  return comments.map((comment) => ({
    ...comment,
    children: replyMap.get(comment.id) || [],
  }));
}