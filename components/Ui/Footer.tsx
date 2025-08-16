// components/Footer.tsx
import Link from 'next/link';
import { FaPoll } from 'react-icons/fa';

export default function Footer() {
  return (
    <>
      {/* Footer Content - with bottom padding for mobile nav */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pt-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            
            {/* Branding */}
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <div className="bg-indigo-600 dark:bg-indigo-500 p-1.5 rounded-lg">
                <FaPoll className="text-white text-lg" />
              </div>
              <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">Lisolo</span>
            </div>
            
            {/* Links - centered on mobile, left on desktop */}
            <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm">
              {/* <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                À propos
              </Link>
              <Link href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Confidentialité
              </Link>
              <Link href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Conditions
              </Link>
              <Link href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Contact
              </Link> */}
            </div>
          </div>
          
          {/* Copyright - always centered */}
          <div className="mt-6 text-center">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Lisolo. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}