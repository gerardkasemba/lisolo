'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FiCheck, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';

const OrganizationVerificationSchema = z.object({
  organizationName: z.string().min(3, 'Le nom de l’organisation doit contenir au moins 3 caractères'),
  organizationType: z.string().min(1, 'Veuillez sélectionner un type d’organisation'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  contactEmail: z.string().email('Adresse e-mail invalide').min(1, 'L’e-mail de contact est requis'),
  contactPhone: z.string().optional(),
  socialHandles: z
    .array(z.object({ handle: z.string().min(3, 'Le pseudo doit contenir au moins 3 caractères') }))
    .min(1, 'Au moins un pseudo de réseau social est requis'),
  websiteUrl: z.string().url('URL invalide').optional().or(z.literal('')),
});

type OrganizationVerificationFormData = z.infer<typeof OrganizationVerificationSchema>;

const organizationTypes = [
  'Non-profit',
  'Entreprise',
  'Gouvernement',
  'Institution éducative',
  'Autre',
];

export default function OrganizationVerificationForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrganizationVerificationFormData>({
    resolver: zodResolver(OrganizationVerificationSchema),
    defaultValues: {
      organizationName: '',
      organizationType: '',
      address: '',
      city: '',
      country: '',
      contactEmail: '',
      contactPhone: '',
      socialHandles: [{ handle: '' }],
      websiteUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'socialHandles',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/auth/login?redirectedFrom=/verify');
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('verified_organizations')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        setError('Erreur lors de la vérification de l’état de soumission');
      }
      if (data) {
        setError('Vous avez déjà soumis une demande de vérification. Veuillez attendre l’approbation de l’administrateur.');
      }
    };
    checkAuth();
  }, [router]);

const onSubmit = async (data: OrganizationVerificationFormData) => {
  try {
    setIsSubmitting(true);
    setError(null);
    console.log('Submitting data:', data); // Add this line

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Utilisateur non authentifié');
    console.log('Authenticated user:', user?.id); // Add this line

    const { error: insertError } = await supabase.from('verified_organizations').insert({
        user_id: user.id,
        organization_name: data.organizationName,
        organization_type: data.organizationType,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone || null,
        social_handle: data.socialHandles.map((item) => item.handle),
        website_url: data.websiteUrl || null,
    });

    if (insertError) {
      console.error('Supabase insert error details:', insertError); // Add this line
      throw insertError;
    }

    router.push('/auth/verify/confirmation');
  } catch (err) {
    console.error('Full verification error:', err);
    setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la soumission de la vérification');
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Vérification de l’organisation
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Veuillez fournir les détails de votre organisation ou entreprise pour vérification. Un administrateur examinera votre soumission.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom de l’organisation *
            </label>
            <input
              {...register('organizationName')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Nom de votre organisation"
            />
            {errors.organizationName && (
              <p className="mt-1 text-sm text-red-600">{errors.organizationName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type d’organisation *
            </label>
            <select
              {...register('organizationType')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sélectionnez un type</option>
              {organizationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.organizationType && (
              <p className="mt-1 text-sm text-red-600">{errors.organizationType.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adresse (facultatif)
            </label>
            <input
              {...register('address')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Adresse de l’organisation"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ville (facultatif)
              </label>
              <input
                {...register('city')}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Ville"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pays (facultatif)
              </label>
              <input
                {...register('country')}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Pays"
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mail de contact *
            </label>
            <input
              {...register('contactEmail')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="E-mail de contact"
              type="email"
            />
            {errors.contactEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.contactEmail.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Téléphone de contact (facultatif)
            </label>
            <input
              {...register('contactPhone')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Numéro de téléphone"
              type="tel"
            />
            {errors.contactPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.contactPhone.message}</p>
            )}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pseudos de réseaux sociaux *
              </label>
              <button
                type="button"
                onClick={() => append({ handle: '' })}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
              >
                <FiPlus className="mr-1" /> Ajouter un pseudo
              </button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3 mb-2">
                <div className="flex-1">
                  <input
                    {...register(`socialHandles.${index}.handle`)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ex. @username"
                  />
                  {errors.socialHandles?.[index]?.handle && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.socialHandles[index]?.handle?.message}
                    </p>
                  )}
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-3 text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
            {errors.socialHandles?.root && (
              <p className="mt-1 text-sm text-red-600">{errors.socialHandles.root.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site web (facultatif)
            </label>
            <input
              {...register('websiteUrl')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="https://example.com"
              type="url"
            />
            {errors.websiteUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.websiteUrl.message}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Soumission en cours...' : 'Soumettre pour vérification'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Annuler
            </button>
          </div>
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}