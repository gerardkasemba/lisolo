// components/CategoriesSection.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { FaPlus, FaArrowRight, FaFilm, FaVoteYea, FaLaptop, FaFutbol, FaUtensils, FaPlane, FaHeartbeat, FaBook } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoriesSectionProps {
  user: any; // Replace with proper Supabase User type if available
}

// Helper function for category colors
const getCategoryColor = (category: string) => {
  const colors: { [key: string]: { bg: string; text: string } } = {
    Divertissement: { bg: 'bg-blue-500', text: 'text-blue-500' },
    Politique: { bg: 'bg-red-500', text: 'text-red-500' },
    Technologie: { bg: 'bg-green-500', text: 'text-green-500' },
    Sports: { bg: 'bg-yellow-500', text: 'text-yellow-500' },
    Cuisine: { bg: 'bg-orange-500', text: 'text-orange-500' },
    Voyages: { bg: 'bg-purple-500', text: 'text-purple-500' },
    Santé: { bg: 'bg-pink-500', text: 'text-pink-500' },
    Éducation: { bg: 'bg-indigo-500', text: 'text-indigo-500' },
  };
  return colors[category] || { bg: 'bg-gray-500', text: 'text-gray-500' };
};

// Helper function for category icons using react-icons
const getCategoryIcon = (category: string, size: 'sm' | 'md' = 'md'): React.ReactElement => {
  const iconSize = size === 'sm' ? 'text-lg' : 'text-2xl';
  const icons: { [key: string]: React.ReactElement } = {
    Divertissement: <FaFilm className={`${iconSize} text-white`} />,
    Politique: <FaVoteYea className={`${iconSize} text-white`} />,
    Technologie: <FaLaptop className={`${iconSize} text-white`} />,
    Sports: <FaFutbol className={`${iconSize} text-white`} />,
    Cuisine: <FaUtensils className={`${iconSize} text-white`} />,
    Voyages: <FaPlane className={`${iconSize} text-white`} />,
    Santé: <FaHeartbeat className={`${iconSize} text-white`} />,
    Éducation: <FaBook className={`${iconSize} text-white`} />,
  };
  return icons[category] || <span className={`${iconSize} text-white`}>❓</span>;
};

// Helper function for category descriptions
const getCategoryDescription = (category: string) => {
  const descriptions: { [key: string]: string } = {
    Divertissement: 'Films, séries et plus',
    Politique: 'Débats et actualités',
    Technologie: 'Innovations et gadgets',
    Sports: 'Événements et compétitions',
    Cuisine: 'Recettes et saveurs',
    Voyages: 'Destinations et aventures',
    Santé: 'Bien-être et médecine',
    Éducation: 'Apprentissage et savoir',
  };
  return descriptions[category] || 'Explorez cette catégorie';
};

export default function CategoriesSection({ user }: CategoriesSectionProps) {
  return (
    <section className="bg-indigo-50 dark:bg-gray-800 py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
            Nos Catégories
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-base md:text-lg text-gray-600 dark:text-gray-300">
            Choisissez une catégorie pour explorer les sondages
          </p>
        </div>

        {/* Desktop Grid - 4 columns */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            'Divertissement',
            'Politique',
            'Technologie',
            'Sports',
            'Cuisine',
            'Voyages',
            'Santé',
            'Éducation',
          ].map((category) => (
            <Link
              key={category}
              href={`/category/${encodeURIComponent(category)}`}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 text-center group border border-gray-100 dark:border-gray-600"
            >
              <div
                className={`mx-auto ${getCategoryColor(category).bg} w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors`}
              >
                {getCategoryIcon(category)}
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">{category}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {getCategoryDescription(category)}
              </p>
            </Link>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden pb-2">
          <div
            className="flex overflow-x-auto gap-3 px-1 py-2 -mx-1 snap-x snap-mandatory"
            role="region"
            aria-label="Carrousel de catégories"
          >
            {[
              'Divertissement',
              'Politique',
              'Technologie',
              'Sports',
              'Cuisine',
              'Voyages',
              'Santé',
              'Éducation',
            ].map((category) => (
              <Link
                key={category}
                href={`/category/${encodeURIComponent(category)}`}
                className="flex-shrink-0 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-xs hover:shadow-sm p-4 text-center border border-gray-100 dark:border-gray-600 snap-center"
              >
                <div
                  className={`mx-auto ${getCategoryColor(category).bg} w-10 h-10 rounded-full flex items-center justify-center mb-2`}
                >
                  {getCategoryIcon(category, 'sm')}
                </div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-white">{category}</h3>
              </Link>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, repeat: 3, repeatType: 'reverse' }}
            className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center"
            aria-label="Instruction pour glisser"
          >
            <FaArrowRight className="mr-2 w-4 h-4" aria-hidden="true" />
            Glissez pour voir plus
          </motion.div>
        </div>

        {/* CTA Button */}
        <div className="text-center mt-10">
          <Link
            href={user ? '/creer-sondage' : '/auth/login'}
            className="inline-flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <FaPlus className="mr-2" />
            {user ? 'Créer un sondage' : 'Commencer maintenant'}
          </Link>
        </div>
      </div>
    </section>
  );
}