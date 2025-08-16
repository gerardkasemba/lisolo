'use client';

import { useState, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaReply, FaEdit, FaTrash, FaSpinner, FaPlus } from 'react-icons/fa';
import type { Comment, Reply } from '@/types/profiles';
import { formatRelativeTime } from '@/lib/utils';

interface CommentThreadProps {
  comment: Comment;
  currentUserId: string | null;
  isAuthenticated: boolean;
  onReply: (content: string, commentId?: number, parentReplyId?: number, repliedToUserId?: string) => Promise<void> | void;
  onUpdateComment: (commentId: number, newContent: string) => Promise<void> | void;
  onDeleteComment: (commentId: number) => Promise<void> | void;
  onUpdateReply: (replyId: number, newContent: string) => Promise<void> | void;
  onDeleteReply: (replyId: number) => Promise<void> | void;
}

interface ReplyProps {
  reply: Reply;
  level: number;
  commentId: number;
  currentUserId: string | null;
  isAuthenticated: boolean;
  onReply: (content: string, commentId?: number, parentReplyId?: number, repliedToUserId?: string) => Promise<void> | void;
  onUpdateReply: (replyId: number, newContent: string) => Promise<void> | void;
  onDeleteReply: (replyId: number) => Promise<void> | void;
}

const MAX_LEVEL = 5;
const REPLIES_PER_PAGE = 5; // Nombre de réponses à charger par clic

function Reply({
  reply,
  level,
  commentId,
  currentUserId,
  isAuthenticated,
  onReply,
  onUpdateReply,
  onDeleteReply,
}: ReplyProps) {
  const [editReplyContent, setEditReplyContent] = useState(reply.content);
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [showReplyToReplyForm, setShowReplyToReplyForm] = useState(false);
  const [replyToReplyContent, setReplyToReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleReplyToReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyToReplyContent.trim() || !isAuthenticated) {
      setError('La réponse ne peut pas être vide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onReply(replyToReplyContent, commentId, reply.id, reply.user_id);
      setReplyToReplyContent('');
      setShowReplyToReplyForm(false);
    } catch (error) {
      console.error('Échec de la publication de la réponse :', error);
      setError('Échec de la publication. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editReplyContent.trim()) {
      setError('La réponse ne peut pas être vide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdateReply(reply.id, editReplyContent);
      setIsEditingReply(false);
    } catch (error) {
      console.error('Échec de la mise à jour de la réponse :', error);
      setError('Échec de la mise à jour. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseReplyContent = (content: string) => {
    const match = content.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
    return {
      displayContent: match ? match[2] : content,
      repliedToUser: match ? match[1] : null,
    };
  };

  const { displayContent, repliedToUser } = parseReplyContent(reply.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`ml-${Math.min(level, MAX_LEVEL) * 6} mt-4 border-l-2 border-gray-200 dark:border-gray-600 pl-4`}
      data-level={level}
    >
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
        {repliedToUser && (
          <span className="font-medium text-indigo-600 dark:text-indigo-400 mr-1">
            @{repliedToUser}
          </span>
        )}
        <span>
          toi <span className='text-blue-300 font-bold'>{reply.user_id.slice(0, 8)}</span> · {formatRelativeTime(reply.created_at)}
        </span>
      </div>

      {isEditingReply ? (
        <form onSubmit={handleEditReplySubmit} className="mt-2">
          <textarea
            value={editReplyContent}
            onChange={(e) => setEditReplyContent(e.target.value)}
            className="
                w-full p-4 rounded-lg
                border border-gray-200 dark:border-gray-600
                dark:bg-gray-700 dark:text-white
                hover:border-indigo-400 dark:hover:border-indigo-300
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500
                transition-all
                resize-none
                outline-none
            "
            rows={3}
            required
            disabled={isSubmitting}
            aria-describedby={error ? 'edit-reply-error' : undefined}
          />
          <div className="flex gap-3 mt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FaEdit className="w-4 h-4 mr-2" aria-hidden="true" />
                  Enregistrer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingReply(false)}
              className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200 text-sm font-medium"
            >
              Annuler
            </button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-red-500 mt-2"
                id="edit-reply-error"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      ) : (
        <p className="text-base text-gray-800 dark:text-gray-100">{displayContent}</p>
      )}

      {isAuthenticated && (
        <div className="flex gap-4 mt-3 text-sm">
          <button
            onClick={() => setShowReplyToReplyForm(!showReplyToReplyForm)}
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            disabled={isSubmitting}
          >
            <FaReply className="w-4 h-4 mr-1" aria-hidden="true" />
            {showReplyToReplyForm ? 'Annuler' : 'Répondre'}
          </button>
          {currentUserId === reply.user_id && (
            <>
              <button
                onClick={() => setIsEditingReply(true)}
                className="inline-flex items-center text-yellow-600 dark:text-yellow-400 hover:underline font-medium"
                disabled={isSubmitting}
              >
                <FaEdit className="w-4 h-4 mr-1" aria-hidden="true" />
                Modifier
              </button>
              <button
                onClick={() => onDeleteReply(reply.id)}
                className="inline-flex items-center text-red-600 dark:text-red-400 hover:underline font-medium"
                disabled={isSubmitting}
              >
                <FaTrash className="w-4 h-4 mr-1" aria-hidden="true" />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {showReplyToReplyForm && (
          <motion.form
            ref={formRef}
            onSubmit={handleReplyToReplySubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl"
          >
            <textarea
              value={replyToReplyContent}
              onChange={(e) => setReplyToReplyContent(e.target.value)}
              placeholder={`Répondre à @${reply.user_id.slice(0, 8)}...`}
              className="
                  w-full p-4 rounded-lg
                  border border-gray-200 dark:border-gray-600
                  dark:bg-gray-700 dark:text-white
                  hover:border-indigo-400 dark:hover:border-indigo-300
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500
                  transition-all
                  resize-none
                  outline-none
              "
              rows={3}
              required
              disabled={isSubmitting}
              aria-describedby={error ? 'reply-error' : undefined}
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <FaReply className="w-4 h-4 mr-2" aria-hidden="true" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-red-500 mt-2"
                  id="reply-error"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CommentThread({
  comment,
  currentUserId,
  isAuthenticated,
  onReply,
  onUpdateComment,
  onDeleteComment,
  onUpdateReply,
  onDeleteReply,
}: CommentThreadProps) {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editCommentContent, setEditCommentContent] = useState(comment.content);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleReplies, setVisibleReplies] = useState(REPLIES_PER_PAGE); // Nombre initial de réponses affichées
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false); // État pour le chargement
  const formRef = useRef<HTMLFormElement>(null);

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !isAuthenticated) {
      setError('La réponse ne peut pas être vide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onReply(replyContent, comment.id);
      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Échec de la publication de la réponse :', error);
      setError('Échec de la publication. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editCommentContent.trim()) {
      setError('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdateComment(comment.id, editCommentContent);
      setIsEditingComment(false);
    } catch (error) {
      console.error('Échec de la mise à jour du commentaire :', error);
      setError('Échec de la mise à jour. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedReplies = comment.children
    ? [...comment.children].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  // Charger plus de réponses
  const handleLoadMoreReplies = () => {
    setIsLoadingMoreReplies(true);
    setTimeout(() => {
      setVisibleReplies((prev) => prev + REPLIES_PER_PAGE);
      setIsLoadingMoreReplies(false);
    }, 500); // Simuler un délai pour une meilleure UX
  };

  // Vérifier s'il y a plus de réponses à charger
  const hasMoreReplies = visibleReplies < sortedReplies.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-l-2 border-gray-200 dark:border-gray-600 px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
    >
      <header className="flex items-center text-md text-gray-500 dark:text-gray-400 mb-2">
        <span className="font-medium">
          Par <span className='text-blue-600'>{comment.user_id.slice(0, 8)}</span> · {formatRelativeTime(comment.created_at)}
        </span>
      </header>

      {isEditingComment ? (
        <form onSubmit={handleEditCommentSubmit} className="mt-2">
          <textarea
            value={editCommentContent}
            onChange={(e) => setEditCommentContent(e.target.value)}
            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none text-base"
            rows={4}
            required
            disabled={isSubmitting}
            aria-describedby={error ? 'edit-comment-error' : undefined}
          />
          <div className="flex gap-3 mt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FaEdit className="w-4 h-4 mr-2" aria-hidden="true" />
                  Enregistrer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingComment(false)}
              className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200 text-sm font-medium"
            >
              Annuler
            </button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-red-500 mt-2"
                id="edit-comment-error"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      ) : (
        <p className="text-base text-sm text-gray-800 dark:text-gray-100">{comment.content}</p>
      )}

      {isAuthenticated && (
        <div className="flex gap-4 mt-3 text-sm">
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            disabled={isSubmitting}
          >
            <FaReply className="w-4 h-4 mr-1" aria-hidden="true" />
            {showReplyForm ? 'Annuler' : 'Répondre'}
          </button>
          {currentUserId === comment.user_id && (
            <>
              <button
                onClick={() => setIsEditingComment(true)}
                className="inline-flex items-center text-yellow-600 dark:text-yellow-400 hover:underline font-medium"
                disabled={isSubmitting}
              >
                <FaEdit className="w-4 h-4 mr-1" aria-hidden="true" />
                Modifier
              </button>
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="inline-flex items-center text-red-600 dark:text-red-400 hover:underline font-medium"
                disabled={isSubmitting}
              >
                <FaTrash className="w-4 h-4 mr-1" aria-hidden="true" />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {showReplyForm && (
          <motion.form
            ref={formRef}
            onSubmit={handleReplySubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl"
          >
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Votre réponse..."
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none text-base"
              rows={3}
              required
              disabled={isSubmitting}
              aria-describedby={error ? 'reply-form-error' : undefined}
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <FaReply className="w-4 h-4 mr-2" aria-hidden="true" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-red-500 mt-2"
                  id="reply-form-error"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>

      {sortedReplies.length > 0 && (
        <div className="mt-4 space-y-4">
          {sortedReplies.slice(0, visibleReplies).map((reply) => (
            <Reply
              key={reply.id}
              reply={reply}
              level={1}
              commentId={comment.id}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              onReply={onReply}
              onUpdateReply={onUpdateReply}
              onDeleteReply={onDeleteReply}
            />
          ))}
          {hasMoreReplies && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 text-center"
            >
              <button
                onClick={handleLoadMoreReplies}
                disabled={isLoadingMoreReplies}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
                aria-label="Charger plus de réponses"
              >
                {isLoadingMoreReplies ? (
                  <>
                    <FaSpinner className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <FaPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                    Charger plus
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.article>
  );
}