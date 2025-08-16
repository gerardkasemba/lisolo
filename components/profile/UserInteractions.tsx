'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ActivityCard from './ActivityCard';
import { Skeleton } from '@/components/Ui/skeleton';
import type { ActivityItem } from '@/types/activities';

export default function UserInteractions({ interactions }: { interactions: ActivityItem[] }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mt-3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
        {error}
      </div>
    );
  }

  if (!interactions || interactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">No interactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction) => (
        <ActivityCard 
          key={interaction.id} 
          activity={interaction} 
          isInteraction 
        />
      ))}
    </div>
  );
}