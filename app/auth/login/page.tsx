'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FcGoogle } from 'react-icons/fc';
import { FaArrowRight } from 'react-icons/fa';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden w-full max-w-md">
        <div className="bg-indigo-600 dark:bg-indigo-700 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Bienvenue sur Lisolo</h1>
          <p className="text-indigo-100 mt-2">
            Connectez-vous pour participer aux sondages
          </p>
        </div>
        
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white text-center">
              Connexion
            </h2>
            <p className="text-gray-500 dark:text-gray-300 text-center mt-1">
              Accédez à votre compte en un clic
            </p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 px-6 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <FcGoogle className="text-2xl" />
            <span className="font-medium">Continuer avec Google</span>
            <FaArrowRight className="ml-auto text-gray-400" />
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              En continuant, vous acceptez nos{' '}
              <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Conditions d'utilisation
              </a>{' '}
              et notre{' '}
              <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Politique de confidentialité
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Chargement en cours...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}