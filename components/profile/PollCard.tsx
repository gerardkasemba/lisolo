'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FaComment, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import PollOptionsPreview from './PollOptionsPreview';
import VotersModal from './VotersModal';

interface Poll {
  id: number;
  question: string;
  options: { text: string; image_url: string | null }[];
  image_url?: string;
  region: string | null;
  category: string | null;
  created_at: string;
  votes_count: number;
  comments_count: number;
}

interface PollCardProps {
  poll: Poll;
  onDelete: () => void;
  showActions?: boolean;
  className?: string;
}

export default function PollCard({ 
  poll, 
  onDelete, 
  showActions = true,
  className = '' 
}: PollCardProps) {
  return (
    <div className={`h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 flex flex-col hover:shadow-md transition-shadow ${className}`}>
      {/* Poll Image */}
      {poll.image_url && (
        <div className="relative h-40 w-full mb-3 overflow-hidden rounded-lg">
          <Image
            src={poll.image_url}
            alt={poll.question}
            fill
            className="object-cover hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={poll.id === 0} // Only prioritize first image
          />
        </div>
      )}

      {/* Poll Question */}
      <Link 
        href={`/polls/${poll.id}`} 
        className="group mb-2 flex-grow"
        aria-label={`View poll: ${poll.question}`}
      >
        <h4 className="text-lg font-medium text-gray-800 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {poll.question}
        </h4>
      </Link>

      {/* Category Badge */}
      {poll.category && (
        <span className="inline-block text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full mb-2">
          {poll.category}
        </span>
      )}

      {/* Options Preview */}
      <PollOptionsPreview options={poll.options} />
      
      {/* Stats and Region */}
      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-2 mt-auto">
        <span className="truncate max-w-[120px]">{poll.region || 'Global'}</span>
        <div className="flex gap-3">
          <VotersModal 
            pollId={poll.id} 
            votesCount={poll.votes_count} 
            trigger={
              <button className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <FaEye className="w-3 h-3" />
                <span>{poll.votes_count}</span>
              </button>
            }
          />
          <span className="flex items-center gap-1">
            <FaComment className="w-3 h-3" />
            {poll.comments_count}
          </span>
        </div>
      </div>

      {/* Creation Date */}
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Created on {format(new Date(poll.created_at), 'PPP', { locale: fr })}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex justify-end gap-2 mt-auto">
          <Link
            href={`/polls/edit/${poll.id}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            aria-label="Edit poll"
            onClick={(e) => e.stopPropagation()}
          >
            <FaEdit className="w-3 h-3" /> Edit
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
            aria-label="Delete poll"
          >
            <FaTrash className="w-3 h-3" /> Delete
          </button>
          <Link
            href={`/polls/${poll.id}`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
            aria-label="View poll"
          >
            View <FaEye className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}