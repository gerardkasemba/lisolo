'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { FaUser, FaPoll, FaVoteYea, FaComment } from 'react-icons/fa';
import type { ActivityItem } from '@/types/activities';

export default function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    const baseClass = 'w-4 h-4';
    switch (type) {
      case 'poll':
        return <FaPoll className={`${baseClass} text-blue-600`} />;
      case 'vote':
        return <FaVoteYea className={`${baseClass} text-green-600`} />;
      case 'comment':
        return <FaComment className={`${baseClass} text-purple-600`} />;
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'poll':
        return 'a créé un nouveau sondage';
      case 'vote':
        return `a voté pour "${activity.vote_option}"`;
      case 'comment':
        return 'a posté un commentaire';
    }
  };

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune activité récente</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="p-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
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
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      {getActivityIcon(activity.type)}
                    </div>
                    <p className="font-semibold truncate">{activity.user_name}</p>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {getActivityDescription(activity)}
                    </span>
                  </div>

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
        ))
      )}
    </div>
  );
}
