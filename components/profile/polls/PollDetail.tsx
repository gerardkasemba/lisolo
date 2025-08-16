'use client';

import { useEffect } from 'react';
import { usePollData } from './usePollData';
import { useVoteHandlers } from './useVoteHandlers';
import { useCommentHandlers } from './useCommentHandlers';
import PollOptions from './PollOptions';
import PollComments from './PollComments';
import type { Poll, Comment } from '@/types/profiles';
import { generateShareUrls } from '@/lib/shareUtils';
import MorePolls from './MorePolls';

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
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-100 dark:bg-gray-900 flex flex-col lg:flex-row gap-8">
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
              <div className="lg:w-1/3 py-8">
                <div className="">
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
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      <span className="ml-3">Chargement...</span>
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
      <p className="font-medium">Erreur lors du chargement du sondage</p>
      <p className="text-sm mt-1">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 px-3 py-1 rounded"
      >
        Réessayer
      </button>
    </div>
  );
}

function NotFoundDisplay() {
  return (
    <div className="text-center p-4 text-gray-600 dark:text-gray-300">
      Sondage introuvable.
    </div>
  );
}