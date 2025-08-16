// components/useCommentHandlers.ts
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useCommentHandlers(pollId: number, isAuthenticated: boolean, currentUserId: string | null) {
  const router = useRouter();

  const handleComment = async (content: string, commentId?: number, parentReplyId?: number, repliedToUserId?: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirectedFrom=/polls/${pollId}`);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');
      const finalContent = repliedToUserId ? `**${repliedToUserId.slice(0, 8)}**: ${content}` : content;
      if (commentId || parentReplyId) {
        const { error } = await supabase.from('comment_replies').insert({
          comment_id: commentId || null,
          user_id: user.id,
          content: finalContent,
          parent_reply_id: parentReplyId || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comments').insert({
          poll_id: pollId,
          user_id: user.id,
          content: finalContent,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error commenting:', error);
      alert('Erreur lors de l’envoi du commentaire. Veuillez réessayer.');
    }
  };

  const handleUpdateComment = async (commentId: number, newContent: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: newContent })
        .eq('id', commentId)
        .eq('user_id', currentUserId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Erreur lors de la mise à jour du commentaire. Veuillez réessayer.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Erreur lors de la suppression du commentaire. Veuillez réessayer.');
    }
  };

  const handleUpdateReply = async (replyId: number, newContent: string) => {
    try {
      const { error } = await supabase
        .from('comment_replies')
        .update({ content: newContent })
        .eq('id', replyId)
        .eq('user_id', currentUserId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating reply:', error);
      alert('Erreur lors de la mise à jour de la réponse. Veuillez réessayer.');
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    try {
      const { error } = await supabase
        .from('comment_replies')
        .delete()
        .eq('id', replyId)
        .eq('user_id', currentUserId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Erreur lors de la suppression de la réponse. Veuillez réessayer.');
    }
  };

  return { handleComment, handleUpdateComment, handleDeleteComment, handleUpdateReply, handleDeleteReply };
}