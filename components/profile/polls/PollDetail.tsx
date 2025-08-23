'use client';

import { useEffect, useState } from 'react';
import { usePollData } from './usePollData';
import { useVoteHandlers } from './useVoteHandlers';
import { useCommentHandlers } from './useCommentHandlers';
import PollOptions from './PollOptions';
import PollComments from './PollComments';
import type { Poll, Comment } from '@/types/profiles';
import { generateShareUrls } from '@/lib/shareUtils';
import MorePolls from './MorePolls';
import { ShareIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PollDetailProps {
  pollId: number;
}

export default function PollDetail({ pollId }: PollDetailProps) {
  const {
    poll,
    votes,
    userVote,
    setUserVote,
    comments,
    loading,
    error,
    isAuthenticated,
    currentUserId,
  } = usePollData(pollId);

  const { handleVote, handleDeleteVote } = useVoteHandlers(
    pollId,
    isAuthenticated,
    userVote,
    setUserVote
  );

  const {
    handleComment,
    handleUpdateComment,
    handleDeleteComment,
    handleUpdateReply,
    handleDeleteReply,
  } = useCommentHandlers(pollId, isAuthenticated, currentUserId);

  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalVotes = votes ? Object.values(votes).reduce((sum, count) => sum + count, 0) : 0;

  // Generate share URLs when poll data is available
  const shareUrls = poll
    ? generateShareUrls({
        pollId,
        question: poll.question,
        imageUrl: poll.options[0]?.image_url ?? undefined,
        totalVotes,
        commentCount: comments?.length || 0,
      })
    : null;

  // Copy link to clipboard
  const copyToClipboard = () => {
    if (shareUrls?.directUrl) {
      navigator.clipboard.writeText(shareUrls.directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Remove dynamic meta tags (rely on generateMetadata in page.tsx instead)
  useEffect(() => {
    if (!poll || !shareUrls) return;

    const metaTags = [
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: shareUrls.directUrl },
      { property: 'og:title', content: `Votez sur ce sondage : "${poll.question}"` },
      {
        property: 'og:description',
        content: `${totalVotes} personnes ont voté • ${comments?.length || 0} commentaires`,
      },
      {
        property: 'og:image',
        content: poll.options[0]?.image_url || '/default-poll-image.jpg',
      },
      { property: 'og:image:width', content: '1080' },
      { property: 'og:image:height', content: '1350' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: poll.question },
      {
        name: 'twitter:description',
        content: `Participez à ce sondage avec ${totalVotes} votes déjà enregistrés`,
      },
      {
        name: 'twitter:image',
        content: poll.options[0]?.image_url || '/default-poll-image.jpg',
      },
    ];

    // Add or update meta tags
    metaTags.forEach(({ property, name, content }) => {
      let meta = document.querySelector(
        property ? `meta[property="${property}"]` : `meta[name="${name}"]`
      );

      if (!meta) {
        meta = document.createElement('meta');
        if (property) meta.setAttribute('property', property);
        if (name) meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Cleanup on unmount
    return () => {
      metaTags.forEach(({ property, name }) => {
        const meta = document.querySelector(
          property ? `meta[property="${property}"]` : `meta[name="${name}"]`
        );
        if (meta && meta.parentNode) {
          meta.parentNode.removeChild(meta);
        }
      });
    };
  }, [poll, shareUrls, totalVotes, comments]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!poll) {
    return <NotFoundDisplay />;
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <PollOptions
          poll={poll}
          votes={votes ?? {}}
          userVote={userVote}
          totalVotes={totalVotes}
          handleVote={handleVote}
          handleDeleteVote={handleDeleteVote}
          isAuthenticated={isAuthenticated}
          commentCount={comments?.length || 0}
          shareUrls={
            shareUrls ?? {
              twitter: '',
              facebook: '',
              linkedin: '',
              whatsapp: '',
              email: '',
              directUrl: '',
              imageUrl: '/default-poll-image.jpg',
              title: poll.question,
              description: `${totalVotes} votes • ${comments?.length || 0} commentaires`,
            }
          }
        />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 min-h-screen mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Comments Section */}
            <div className="flex-1">
              <PollComments
                comments={comments ?? []}
                currentUserId={currentUserId}
                isAuthenticated={isAuthenticated}
                handleComment={handleComment}
                handleUpdateComment={handleUpdateComment}
                handleDeleteComment={handleDeleteComment}
                handleUpdateReply={handleUpdateReply}
                handleDeleteReply={handleDeleteReply}
              />
            </div>
            {/* More Polls for You Section */}
            <div className="lg:w-1/3">
              <div className="sticky top-6">
                <h4
                  id="comments-heading"
                  className="text-xl sm:text-1xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight"
                >
                  Plus de sondages pour vous
                </h4>
                <div className="space-y-4">
                  <MorePolls currentPollId={pollId} category={poll.category} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
      <span className="text-gray-600 dark:text-gray-400">Chargement du sondage...</span>
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-red-700 dark:text-red-300 max-w-md w-full">
        <div className="flex items-center gap-3 mb-3">
          <ExclamationTriangleIcon className="w-8 h-8" />
          <p className="font-medium text-lg">Erreur lors du chargement du sondage</p>
        </div>
        <p className="text-sm mt-1 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 px-4 py-2 rounded transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Réessayer
        </button>
      </div>
    </div>
  );
}

function NotFoundDisplay() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg max-w-md w-full">
        <ExclamationTriangleIcon className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Sondage introuvable</h3>
        <p className="text-yellow-600 dark:text-yellow-300 text-sm">
          Le sondage que vous recherchez n'existe pas ou a été supprimé.
        </p>
      </div>
    </div>
  );
}