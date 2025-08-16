'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FiEdit2, FiCheck, FiX, FiLogOut } from 'react-icons/fi';
import { FaPoll, FaVoteYea, FaComment } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface UserInfoProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    region: string | null;
    region_id?: string | null;
    stats?: {
      polls?: number;
      votes?: number;
      comments?: number;
    };
  };
  onUpdate?: () => void;
}

interface Region {
  id: string;
  name: string;
}

export default function UserInfo({ user, onUpdate }: UserInfoProps) {
  const router = useRouter();
  const [regionId, setRegionId] = useState<string | null>(user?.region_id || null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const memoizedRegions = useMemo(() => regions, [regions]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('id, name')
          .order('name', { ascending: true });

        if (regionsError) throw regionsError;
        setRegions(regionsData || []);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('region_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setRegionId(profileData?.region_id || null);
      } catch (error: any) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error(error.message || 'Échec du chargement du profil');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user.id]);

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
      toast.success('Déconnexion réussie');
    } catch (error: any) {
      console.error('Erreur de déconnexion:', error);
      toast.error(error.message || 'Échec de la déconnexion');
    }
  }, [router]);

  const handleRegionUpdate = useCallback(async () => {
    if (!user?.id) {
      toast.error('Veuillez vous connecter');
      return;
    }

    if (!regionId) {
      toast.error('Veuillez sélectionner une région');
      return;
    }

    const isValidRegion = memoizedRegions.some(r => r.id === regionId);
    if (!isValidRegion) {
      toast.error('Veuillez sélectionner une région valide');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Mise à jour de la région...');

    try {
      const selectedRegion = memoizedRegions.find(r => r.id === regionId);
      if (!selectedRegion) throw new Error('Région non trouvée');

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          { 
            id: user.id,
            region_id: regionId,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (upsertError) throw upsertError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          region: selectedRegion.name,
          region_id: regionId 
        }
      });

      if (authError) throw authError;

      toast.success('Région mise à jour avec succès', { id: toastId });
      if (onUpdate) onUpdate();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Erreur de mise à jour:', error);
      toast.error(error.message || 'Échec de la mise à jour', { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [user, regionId, memoizedRegions, onUpdate]);

  const getRegionName = () => {
    if (!regionId) return 'Aucune région sélectionnée';
    const region = memoizedRegions.find(r => r.id === regionId);
    return region ? region.name : user.region || 'Aucune région sélectionnée';
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
      <div className="p-4">
        {/* Avatar and Basic Info */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-3">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name || 'Avatar utilisateur'}
                width={80}
                height={80}
                className="rounded-full object-cover h-20 w-20 border-2 border-indigo-100"
                priority
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-indigo-100">
                <span className="text-2xl font-bold text-indigo-600">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          
          <h2 className="text-lg font-bold text-gray-800 truncate max-w-full">
            {user.name || user.email.split('@')[0]}
          </h2>
          <p className="text-sm text-gray-600 truncate max-w-full">{user.email}</p>
        </div>

        {/* Region Section */}
        <div className="mb-4">
          {isEditing ? (
            <div className="space-y-2">
              <select
                value={regionId || ''}
                onChange={(e) => setRegionId(e.target.value || null)}
                className="w-full text-sm p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="">Sélectionner une région</option>
                {memoizedRegions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={handleRegionUpdate}
                  disabled={loading || !regionId}
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${loading ? 'bg-gray-100' : 'bg-green-100 hover:bg-green-200'} text-green-600 transition-colors`}
                >
                  <FiCheck className="text-sm" />
                  <span>Valider</span>
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setRegionId(user.region_id || null);
                  }}
                  disabled={loading}
                  className="px-3 py-1 rounded-md text-sm flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                >
                  <FiX className="text-sm" />
                  <span>Annuler</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-700">Région:</span>
                <span className="text-sm font-medium text-gray-800">{getRegionName()}</span>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors"
                  aria-label="Modifier la région"
                >
                  <FiEdit2 className="text-xs" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        {/* <div className="flex justify-center">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md border border-red-200 hover:bg-red-50 transition-colors"
          >
            <FiLogOut className="text-sm" />
            <span>Se déconnecter</span>
          </button>
        </div> */}

        {/* Stats Section */}
        {user.stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-center">
            <div className="p-3 bg-indigo-50 rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[80px] w-full">
              <div className="sm:hidden text-sm text-indigo-600 font-bold tracking-tight">Sondages</div>
              <FaPoll className="hidden sm:block text-indigo-600 text-lg mb-1" />
              <p className="text-md text-gray-600 tracking-tight truncate">
                {user.stats.polls || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[80px] w-full">
              <div className="sm:hidden  text-sm text-indigo-600 font-bold  tracking-tight">Votes</div>
              <FaVoteYea className="hidden sm:block text-indigo-600 text-lg mb-1" />
              <p className="text-md text-gray-600 tracking-tight truncate">
                {user.stats.votes || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[80px] w-full">
              <div className="sm:hidden  text-sm text-indigo-600 font-bold  tracking-tight">Commentaires</div>
              <FaComment className="hidden sm:block text-indigo-600 text-lg mb-1" />
              <p className="text-md text-gray-600 tracking-tight truncate">
                {user.stats.comments || 0}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}