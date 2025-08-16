'use client';

import { useRouter } from 'next/navigation';

export default function VerificationConfirmation() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Soumission reçue
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Votre demande de vérification a été soumise avec succès. Un administrateur examinera vos informations et activera votre compte une fois approuvé.
        </p>
        <button
          onClick={() => router.push('/auth/profile')}
          className="bg-indigo-600 text-white py-3 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Retourner au profil
        </button>
      </div>
    </div>
  );
}