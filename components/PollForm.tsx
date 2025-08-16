'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FiPlus, FiTrash2, FiImage, FiX, FiExternalLink } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
import stringSimilarity from 'string-similarity';

const PollSchema = z.object({
  question: z.string().min(5, 'La question doit contenir au moins 5 caractères'),
  category: z.string().min(1, 'Veuillez sélectionner une catégorie'),
  region: z.string().nullable(),
  options: z
    .array(
      z.object({
        text: z.string().min(1, 'Le choix ne peut pas être vide'),
        image: z.any().optional(),
      })
    )
    .min(2, 'Au moins 2 choix sont nécessaires'),
  pollImage: z.any().optional(),
});

type PollFormData = z.infer<typeof PollSchema>;

interface SimilarPoll {
  id: number;
  question: string;
  similarity: number;
}

const categories = [
  'Divertissement',
  'Politique',
  'Polémique',
  'Technologie',
  'Sports',
  'Cuisine',
  'Voyages',
  'Santé',
  'Éducation',
  'Culture',
  'Musique',
  'Mode',
  'Société',
  'Économie',
  'Environnement',
  'Agriculture',
  'Religion',
  'Histoire',
  'Vie quotidienne',
  'Humour',
];

const regions = [
  'Partout',
  'Bas-Uele',
  'Équateur',
  'Haut-Katanga',
  'Haut-Lomami',
  'Haut-Uele',
  'Ituri',
  'Kasai',
  'Kasai-Central',
  'Kasai-Oriental',
  'Kinshasa',
  'Kongo-Central',
  'Kwango',
  'Kwilu',
  'Lomami',
  'Lualaba',
  'Mai-Ndombe',
  'Maniema',
  'Mongala',
  'Nord-Kivu',
  'Nord-Ubangi',
  'Sankuru',
  'Sud-Kivu',
  'Sud-Ubangi',
  'Tanganyika',
  'Tshopo',
  'Tshuapa',
];

export default function PollForm() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<{ [key: number]: string }>({});
  const [pollImagePreview, setPollImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [similarPolls, setSimilarPolls] = useState<SimilarPoll[] | null>(null);
  const [showSimilarPolls, setShowSimilarPolls] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<PollFormData>({
    resolver: zodResolver(PollSchema),
    defaultValues: {
      question: '',
      category: '',
      region: 'Partout',
      options: [{ text: '' }, { text: '' }],
      pollImage: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  // Check auth and verification (existing code remains the same)
  useEffect(() => {
    const checkAuthAndVerification = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError('Vous devez être connecté pour créer un sondage.');
          router.push('/auth/login?redirectedFrom=/create');
          return;
        }

        const { data: isVerified, error: funcError } = await supabase.rpc('is_user_verified');
        if (funcError) {
          console.error('Erreur lors de l\'appel de is_user_verified:', funcError);
          if (funcError.message.includes('permission denied for table users')) {
            setError('Erreur d\'autorisation lors de la vérification. Veuillez réessayer ou contacter le support.');
          } else {
            setError(`Erreur technique lors de la vérification: ${funcError.message}`);
          }
          return;
        }

        if (isVerified) return;

        const { data: orgData, error: orgError } = await supabase
          .from('verified_organizations')
          .select('id, is_active')
          .eq('user_id', user.id)
          .single();

        if (orgError) {
          if (orgError.code === 'PGRST116') {
            setShowVerificationPrompt(true);
            setVerificationMessage('La création de sondages est réservée aux comptes vérifiés. Veuillez vérifier votre organisation avant de continuer.');
          } else {
            console.error('Erreur lors de la vérification de l\'organisation:', orgError);
            setError(`Erreur lors de la vérification de votre organisation: ${orgError.message}`);
          }
          return;
        }

        if (!orgData.is_active) {
          setShowVerificationPrompt(true);
          setVerificationMessage('Votre organisation est en attente d\'approbation.');
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError('Une erreur technique est survenue.');
      }
    };
    checkAuthAndVerification();
  }, [router]);

const checkForSimilarPolls = async (question: string, category: string, region: string | null) => {
  try {
    // First try the PostgreSQL function
    try {
      const { data, error } = await supabase.rpc('check_similar_polls', {
        p_question: question,
        p_category: category,
        p_region: region === 'Partout' ? null : region
      });

      if (!error && data) {
        if (data.length > 0) {
          setSimilarPolls(data);
          setShowSimilarPolls(true);
          return true;
        }
        return false;
      }
    } catch (funcError) {
      console.warn('Function failed, falling back to direct query:', funcError);
    }

    // Fallback to direct query
    const { data: polls } = await supabase
      .from('polls')
      .select('id, question, category, region')
      .eq('category', category)
      .or(`region.eq.${region === 'Partout' ? null : region},region.is.null`);

    if (!polls) return false;

    const similarPolls = polls
      .map(poll => ({
        ...poll,
        similarity: stringSimilarity.compareTwoStrings(question, poll.question)
      }))
      .filter(poll => poll.similarity > 0.4)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    if (similarPolls.length > 0) {
      setSimilarPolls(similarPolls);
      setShowSimilarPolls(true);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error in duplicate check:', err);
    return false;
  }
};

  const proceedAnyway = () => {
    setShowSimilarPolls(false);
    handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: PollFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // First check for similar polls
      const hasSimilarPolls = await checkForSimilarPolls(
        data.question,
        data.category,
        data.region
      );
      
      if (hasSimilarPolls) {
        setIsSubmitting(false);
        return;
      }
      
      // Rest of submission logic
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      let pollImageUrl = null;
      if (data.pollImage) {
        const fileExt = data.pollImage.name.split('.').pop();
        const filePath = `public/${user.id}/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('polls').upload(filePath, data.pollImage);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('polls').getPublicUrl(filePath);
        pollImageUrl = urlData.publicUrl;
      }

      const optionsWithImages = await Promise.all(
        data.options.map(async (option, index) => {
          if (option.image) {
            const fileExt = option.image.name.split('.').pop();
            const filePath = `public/${user.id}/${Date.now()}-${index}.${fileExt}`;
            const { error } = await supabase.storage.from('poll_options').upload(filePath, option.image);
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('poll_options').getPublicUrl(filePath);
            return { ...option, imageUrl: urlData.publicUrl };
          }
          return option;
        })
      );

      const { error: insertError } = await supabase.from('polls').insert({
        question: data.question,
        category: data.category,
        region: data.region === 'Partout' ? null : data.region,
        options: optionsWithImages.map((opt) => ({
          text: opt.text,
          image_url: 'imageUrl' in opt ? opt.imageUrl : null,
        })),
        image_url: pollImageUrl,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      await new Promise((resolve) => setTimeout(resolve, 3000));
      setSubmissionSuccess(true);
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };
  const handleVerificationPrompt = (verify: boolean) => {
    if (verify && verificationMessage?.includes('soumettre une demande')) {
      router.push('/auth/verify');
    } else {
      router.push('/auth/profile');
    }
    setShowVerificationPrompt(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Seules les images JPEG/PNG sont autorisées');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('L’image doit être inférieure à 5 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof index === 'number') {
        setImagePreviews((prev) => ({ ...prev, [index]: reader.result as string }));
        setValue(`options.${index}.image`, file);
      } else {
        setPollImagePreview(reader.result as string);
        setValue('pollImage', file);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index?: number) => {
    if (typeof index === 'number') {
      const newPreviews = { ...imagePreviews };
      delete newPreviews[index];
      setImagePreviews(newPreviews);
      setValue(`options.${index}.image`, null);
    } else {
      setPollImagePreview(null);
      setValue('pollImage', null);
    }
  };
  const handleCreateNewPoll = () => {
    reset({
      question: '',
      category: '',
      region: 'Partout',
      options: [{ text: '' }, { text: '' }],
      pollImage: null,
    });
    setImagePreviews({});
    setPollImagePreview(null);
    setSubmissionSuccess(false);
  };

  const handleGoToProfile = () => {
    router.push('/auth/profile');
  };
  if (showVerificationPrompt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Vérification requise
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {verificationMessage}
          </p>
          <div className="flex justify-between gap-4">
            {verificationMessage?.includes('soumettre une demande') ? (
              <button
                onClick={() => handleVerificationPrompt(true)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Oui, vérifier maintenant
              </button>
            ) : null}
            <button
              onClick={() => handleVerificationPrompt(false)}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Retourner au profil
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Rest of your existing functions (handleVerificationPrompt, handleImageUpload, removeImage, etc.)
  // ... remain the same

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Similar Polls Modal */}
      {showSimilarPolls && similarPolls && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Sondages similaires existants
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Ces sondages existent déjà avec une question similaire :
            </p>
            
            <div className="space-y-3 mb-6">
              {similarPolls.map((poll) => (
                <div key={poll.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{poll.question}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Similarité: {Math.round(poll.similarity * 100)}%
                    </span>
                    <a 
                      href={`/polls/${poll.id}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                    >
                      Voir <FiExternalLink className="ml-1" size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setShowSimilarPolls(false)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Modifier ma question
              </button>
              <button
                onClick={proceedAnyway}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700"
              >
                Publier quand même
              </button>
            </div>
          </div>
        </div>
      )}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <ClipLoader
              color="rgb(99, 102, 241)"
              size={50}
              loading={true}
              cssOverride={{
                borderWidth: '5px',
                animation: 'spin 1s linear infinite, pulse 2s ease-in-out infinite',
              }}
            />
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
              }
            `}</style>
            <p className="mt-4 text-lg text-gray-800 dark:text-white">Création de votre sondage...</p>
          </div>
        </div>
      )}
      {submissionSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Sondage créé avec succès !
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Voulez-vous créer un nouveau sondage ou retourner à votre profil ?
            </p>
            <div className="flex justify-between gap-4">
              <button
                onClick={handleCreateNewPoll}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Créer un nouveau sondage
              </button>
              <button
                onClick={handleGoToProfile}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Aller au profil
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-md overflow-hidden">
        <div className=" p-6 text-white">
          <h1 className="text-2xl text-gray-800 font-bold">Créer un nouveau sondage</h1>
          <p className="text-gray-600">Partagez votre question avec la communauté</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question du sondage *
            </label>
            <input
              {...register('question')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Quelle est votre question ?"
            />
            {errors.question && (
              <p className="mt-1 text-sm text-red-600">{errors.question.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégorie *
            </label>
            <select
              {...register('category')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Région *
            </label>
            <select
              {...register('region')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="Partout">Partout (visible pour tous)</option>
              {regions.filter((r) => r !== 'Partout').map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            {errors.region && (
              <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image du sondage (facultative)
            </label>
            {pollImagePreview ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <img
                  src={pollImagePreview}
                  alt="Aperçu de l'image du sondage"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage()}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FiImage className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG (Max. 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e)}
                />
              </label>
            )}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Choix de réponse *
              </label>
              <button
                type="button"
                onClick={() => append({ text: '', image: null })}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
                disabled={fields.length >= 6}
              >
                <FiPlus className="mr-1" /> Ajouter un choix
              </button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <input
                      {...register(`options.${index}.text`)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder={`Option ${index + 1}`}
                    />
                    {errors.options?.[index]?.text && (
                      <p className="mt-1 text-sm text-red-600">{errors.options[index]?.text?.message}</p>
                    )}
                  </div>
                  {fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-3 text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  {imagePreviews[index] ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                      <img
                        src={imagePreviews[index]}
                        alt={`Aperçu de l'option ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex items-center justify-center px-3">
                        <FiImage className="w-4 h-4 mr-2 text-gray-400" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ajouter une image (facultative)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, index)}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
            {errors.options?.root && (
              <p className="mt-1 text-sm text-red-600">{errors.options.root.message}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={uploading || isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? 'Création en cours...' : 'Publier le sondage'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
            >
              Annuler
            </button>
          </div>
          {error && (
            <div
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300"
              dangerouslySetInnerHTML={{ __html: error }}
            />
          )}
        </form>
      </div>
      {/* Rest of your existing JSX (submission modals, form, etc.) */}
      {/* ... remains exactly the same */}
    </div>
  );
}