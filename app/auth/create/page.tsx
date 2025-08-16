// app/create-poll/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PollForm from '@/components/PollForm';

export default function CreatePollPage() {
  const router = useRouter();

  useEffect(() => {
    // Ensure user is authenticated
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/auth/login?redirectedFrom=/create');
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PollForm />
    </div>
  );
}