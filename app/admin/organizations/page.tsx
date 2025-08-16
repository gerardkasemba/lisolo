'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Organization = {
  id: number;
  user_id: string;
  organization_name: string;
  organization_type: string;
  contact_email: string;
  social_handles: string[];
  is_active: boolean;
};

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || user.user_metadata?.role !== 'admin') {
        router.push('/auth/login');
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('verified_organizations')
        .select('id, user_id, organization_name, organization_type, contact_email, social_handles, is_active');
      if (fetchError) {
        setError('Erreur lors de la récupération des organisations');
        return;
      }
      setOrganizations(data || []);
    };
    checkAdmin();
  }, [router]);

  const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('verified_organizations')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (error) {
      setError('Erreur lors de la mise à jour du statut');
      return;
    }
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, is_active: !currentStatus } : org))
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        Gestion des organisations
      </h1>
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 mb-6">
          {error}
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b dark:border-gray-600">
              <th className="p-3">Organisation</th>
              <th className="p-3">Type</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Pseudos sociaux</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b dark:border-gray-600">
                <td className="p-3">{org.organization_name}</td>
                <td className="p-3">{org.organization_type}</td>
                <td className="p-3">{org.contact_email}</td>
                <td className="p-3">{org.social_handles.join(', ')}</td>
                <td className="p-3">{org.is_active ? 'Actif' : 'Inactif'}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActiveStatus(org.id, org.is_active)}
                    className={`py-1 px-3 rounded-lg ${
                      org.is_active
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {org.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}