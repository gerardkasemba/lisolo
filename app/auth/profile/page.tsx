'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FiMessageSquare, FiPieChart } from 'react-icons/fi';
import { FaPoll } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Image from 'next/image';
import UserInfo from '@/components/profile/UserInfo';
import UserPolls from '@/components/profile/UserPolls';
import UserActivities from '@/components/profile/UserActivities';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  region: string | null;
  stats?: {
    polls: number;
    votes: number;
    comments: number;
  };
}

function ProfileContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('polls');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          // Fetch additional stats
          const { count: pollsCount } = await supabase
            .from('polls')
            .select('*', { count: 'exact' })
            .eq('created_by', session.user.id);

          const { count: votesCount } = await supabase
            .from('votes')
            .select('*', { count: 'exact' })
            .eq('user_id', session.user.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .eq('user_id', session.user.id);

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Utilisateur',
            avatar: session.user.user_metadata?.avatar_url || null,
            region: session.user.user_metadata?.region || null,
            stats: {
              polls: pollsCount || 0,
              votes: votesCount || 0,
              comments: commentsCount || 0,
            },
          });
        } else {
          router.push(`/auth/login?callbackUrl=${encodeURIComponent('/auth/profile')}`);
        }
      } catch (error) {
        console.error('Erreur de session:', error);
        router.push('/auth/login?error=auth-failed');
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserData();
        const callbackUrl = searchParams.get('callbackUrl') || '/auth/profile';
        router.replace(decodeURIComponent(callbackUrl));
      } else if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
    });

    fetchUserData();

    return () => subscription?.unsubscribe();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white text-gray-800 pb-20">
      {/* Profile Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <UserInfo user={user} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-indigo-100">
                    <FaPoll className="text-indigo-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sondages créés</p>
                    <p className="text-2xl font-bold">{user.stats?.polls || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100">
                    <FiPieChart className="text-purple-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Votes</p>
                    <p className="text-2xl font-bold">{user.stats?.votes || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <FiMessageSquare className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Commentaires</p>
                    <p className="text-2xl font-bold">{user.stats?.comments || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('polls')}
                  className={`flex-1 py-4 px-1 text-center font-medium text-sm transition-colors ${
                    activeTab === 'polls' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FaPoll className="text-lg" />
                    <span>Mes Sondages</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 py-4 px-1 text-center font-medium text-sm transition-colors ${
                    activeTab === 'activity' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiPieChart className="text-lg" />
                    <span>Activité</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex-1 py-4 px-1 text-center font-medium text-sm transition-colors ${
                    activeTab === 'messages' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiMessageSquare className="text-lg" />
                    <span>Messages</span>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'polls' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <UserPolls userId={user.id} />
                  </motion.div>
                )}
                {activeTab === 'activity' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <UserActivities userId={user.id} />
                  </motion.div>
                )}
                {activeTab === 'messages' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <div className="text-center py-12">
                      <FiMessageSquare className="mx-auto text-4xl text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600">Aucun message</h3>
                      <p className="text-gray-400 mt-2">Vos messages apparaîtront ici</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}