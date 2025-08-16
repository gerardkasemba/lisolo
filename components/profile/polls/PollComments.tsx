'use client';

import { useState, useRef, FormEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSpinner } from 'react-icons/fa';
import CommentThread from '../CommentThread';
import type { Comment } from '@/types/profiles';

interface PollCommentsProps {
  comments?: Comment[];
  currentUserId: string | null;
  isAuthenticated: boolean;
  handleComment: (content: string, commentId?: number, parentReplyId?: number, repliedToUserId?: string) => Promise<void> | void;
  handleUpdateComment: (commentId: number, newContent: string) => Promise<void> | void;
  handleDeleteComment: (commentId: number) => Promise<void> | void;
  handleUpdateReply: (replyId: number, newContent: string) => Promise<void> | void;
  handleDeleteReply: (replyId: number) => Promise<void> | void;
}

export default function PollComments({
  comments = [],
  currentUserId,
  isAuthenticated,
  handleComment,
  handleUpdateComment,
  handleDeleteComment,
  handleUpdateReply,
  handleDeleteReply,
}: PollCommentsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleComments, setVisibleComments] = useState(5); // Nombre initial de commentaires affichés
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false); // État pour le chargement
  const commentsPerPage = 5; // Nombre de commentaires à charger par clic
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mémorisation du tri des commentaires
  const sortedComments = useCallback(() => {
    return [...comments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [comments]);

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    const formData = new FormData(e.currentTarget);
    const content = formData.get('content') as string;

    if (!content.trim()) {
      setError('Le commentaire ne peut pas être vide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await handleComment(content);
      formRef.current?.reset();
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Échec de la publication du commentaire :', error);
      setError('Échec de la publication du commentaire. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mémorisation des props de CommentThread
  const getCommentThreadProps = useCallback(
    (comment: Comment) => ({
      comment,
      currentUserId,
      isAuthenticated,
      onReply: handleComment,
      onUpdateComment: handleUpdateComment,
      onDeleteComment: handleDeleteComment,
      onUpdateReply: handleUpdateReply,
      onDeleteReply: handleDeleteReply,
    }),
    [
      currentUserId,
      isAuthenticated,
      handleComment,
      handleUpdateComment,
      handleDeleteComment,
      handleUpdateReply,
      handleDeleteReply,
    ]
  );

  // Charger plus de commentaires
  const handleLoadMoreComments = () => {
    setIsLoadingMoreComments(true);
    setTimeout(() => {
      setVisibleComments((prev) => prev + commentsPerPage);
      setIsLoadingMoreComments(false);
    }, 500); // Simuler un délai pour une meilleure UX
  };

  // Vérifier s'il y a plus de commentaires à charger
  const hasMoreComments = visibleComments < comments.length;

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-900">
      <section
        aria-labelledby="comments-heading"
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* En-tête des commentaires */}
        <h2
          id="comments-heading"
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight"
        >
          Commentaires
          {comments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({comments.length})
            </span>
          )}
        </h2>

        {/* Formulaire de commentaire */}
        {isAuthenticated ? (
          <motion.form
            ref={formRef}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <label htmlFor="comment-content" className="sr-only">
              Ajouter un commentaire
            </label>
            <textarea
              ref={textareaRef}
              id="comment-content"
              name="content"
              placeholder="Partagez vos pensées..."
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
              rows={4}
              required
              disabled={isSubmitting}
              minLength={1}
              maxLength={500}
              aria-describedby={error ? 'comment-error' : undefined}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {500 - (textareaRef.current?.value.length || 0)} caractères restants
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Publication...
                  </>
                ) : (
                  'Publier le commentaire'
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
                  id="comment-error"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 p-6 bg-gray-100 dark:bg-gray-700 rounded-xl text-center"
          >
            <p
              id="auth-required-message"
              className="text-sm text-gray-600 dark:text-gray-300"
            >
              <a
                href="/connexion"
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Connectez-vous
              </a>{' '}
              pour ajouter un commentaire
            </p>
          </motion.div>
        )}

        {/* Liste des commentaires */}
        <AnimatePresence>
          {sortedComments().length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"
            >
              <p className="text-base text-gray-600 dark:text-gray-300">
                Aucun commentaire pour l'instant. Soyez le premier à partager vos pensées !
              </p>
            </motion.div>
          ) : (
            <ul className="space-y-6">
              {sortedComments()
                .slice(0, visibleComments)
                .map((comment) => (
                  <motion.li
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CommentThread {...getCommentThreadProps(comment)} />
                  </motion.li>
                ))}
            </ul>
          )}
        </AnimatePresence>

        {/* Bouton Charger plus pour les commentaires */}
        {hasMoreComments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 text-center"
          >
            <button
              onClick={handleLoadMoreComments}
              disabled={isLoadingMoreComments}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200 text-sm font-medium"
              aria-label="Charger plus de commentaires"
            >
              {isLoadingMoreComments ? (
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
      </section>
    </div>
  );
}