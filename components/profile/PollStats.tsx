// components/PollStats.tsx
'use client';

import { FaChartBar } from 'react-icons/fa';
import VotersModal from './VotersModal';
import type { PollWithStats } from '@/types/activities';

type PollStatsProps = 
  | { polls: PollWithStats[]; variant?: 'list' } 
  | { votes: number; pollId: number; variant?: 'single' };

export default function PollStats(props: PollStatsProps) {
  // Shared stats display component
  const StatsDisplay = ({ votes, pollId }: { votes: number; pollId?: number }) => (
    <VotersModal 
      pollId={pollId!} 
      votesCount={votes}
      trigger={
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer">
          <FaChartBar className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{votes}</span>
        </div>
      }
    />
  );

  // List view for multiple polls
  if ('polls' in props) {
    return (
      <div className="grid gap-4">
        {props.polls.map((poll) => (
          <div key={poll.id} className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-800 dark:text-white line-clamp-2 pr-2">
                {poll.question}
              </h3>
              <StatsDisplay votes={poll.votes_count} pollId={poll.id} />
            </div>
            {poll.category && (
              <span className="inline-block mt-3 text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full">
                {poll.category}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Single stat display
  if ('votes' in props && 'pollId' in props) {
    return <StatsDisplay votes={props.votes} pollId={props.pollId} />;
  }

  // Fallback for invalid props
  return null;
}