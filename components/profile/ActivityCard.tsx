'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { FaUser, FaPoll, FaVoteYea, FaComment } from 'react-icons/fa';
import type { ActivityItem } from '@/types/activities';

export default function ActivityCard({ 
  activity,
  isInteraction = false
}: { 
  activity: ActivityItem;
  isInteraction?: boolean;
}) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'poll': 
        return <FaPoll className="text-blue-600" />;
      case 'vote': 
        return <FaVoteYea className="text-green-600" />;
      case 'comment': 
        return <FaComment className="text-purple-600" />;
    }
  };

  const getActivityDescription = () => {
    switch (activity.type) {
      case 'poll': return isInteraction ? 'created a poll' : 'created a new poll';
      case 'vote': return `voted for "${activity.vote_option}"`;
      case 'comment': return 'commented';
    }
  };

  return (
    <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <Link href={`/poll/${activity.poll_id}`} className="block">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {activity.user_avatar ? (
              <img
                src={activity.user_avatar}
                alt={activity.user_name}
                className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <FaUser className="text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Icon in badge */}
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {getActivityIcon()}
              </div>
              <p className="font-semibold truncate">{activity.user_name}</p>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {getActivityDescription()}
              </span>
            </div>

            {/* Poll question / comment */}
            <div className="mt-1">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                {activity.poll_question}
              </h3>
              {activity.type === 'comment' && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {activity.comment_content}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 capitalize">
                {activity.type}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
