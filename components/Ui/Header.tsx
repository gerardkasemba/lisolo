// components/AppHeader.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaPoll, FaUser, FaPlus, FaHome, FaSignOutAlt, FaTags, FaChevronDown } from 'react-icons/fa';
import Image from 'next/image';

interface AppHeaderProps {
  user: any;
  onLogout: () => Promise<void>;
}

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await onLogout();
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Desktop Header (top) */}
      <header className={`hidden md:block fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 dark:bg-gray-900/95 shadow-sm backdrop-blur-sm' : 'bg-white dark:bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg group-hover:rotate-6 transition-transform">
                <FaPoll className="text-white text-xl" />
              </div>
              <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                Lisolo
              </h1>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link 
                href="/" 
                className={`text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${isActive('/') ? 'font-medium text-indigo-600 dark:text-indigo-400' : ''}`}
              >
                Accueil
              </Link>
              {/* <Link 
                href="/category" 
                className={`text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${isActive('/category') ? 'font-medium text-indigo-600 dark:text-indigo-400' : ''}`}
              >
                Catégories
              </Link>
               */}
              {/* Create Poll Button */}
              <Link 
                href="/auth/create" 
                className="flex items-center space-x-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-md transition-all hover:scale-[1.02]"
              >
                <FaPlus className="text-white" />
                <span>Créer un sondage</span>
              </Link>

              {user ? (
                <div className="relative ml-2">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        width={36}
                        height={36}
                        className="rounded-full border-2 border-indigo-500"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-2 border-indigo-500">
                        <FaUser className="text-indigo-600 dark:text-indigo-300" />
                      </div>
                    )}
                    <FaChevronDown className={`text-gray-500 dark:text-gray-400 text-xs transition-transform ${isProfileOpen ? 'transform rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                      onMouseLeave={() => setIsProfileOpen(false)}
                    >
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/auth/profile"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Mon profil
                        </Link>
                        {/* <Link
                          href="/auth/profile/settings"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Paramètres
                        </Link> */}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="text-sm bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Connexion
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header with Logo */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-40 py-2 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg">
            <FaPoll className="text-white text-xl" />
          </div>
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Lisolo</h1>
        </Link>
        {user && (
          <Link href="/auth/profile" className="flex items-center">
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full border border-indigo-500"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-500">
                <FaUser className="text-indigo-600 dark:text-indigo-300 text-sm" />
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Mobile Bottom Navigation (app-like) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="flex justify-around items-center py-2">
          <Link 
            href="/" 
            className={`flex flex-col items-center p-2 transition-colors ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
            aria-label="Accueil"
          >
            <FaHome className="text-xl mb-1" />
            <span className="text-xs">Accueil</span>
          </Link>
          
          <Link 
            href="/category" 
            className={`flex flex-col items-center p-2 transition-colors ${isActive('/category') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
            aria-label="Catégories"
          >
            <FaTags className="text-xl mb-1" />
            <span className="text-xs">Catégories</span>
          </Link>
          
          {/* Create Button */}
          <div className="flex flex-col items-center">
            <Link 
              href="/auth/create" 
              className="flex items-center justify-center bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-3 rounded-full shadow-md hover:shadow-lg transition-all"
              aria-label="Créer un sondage"
            >
              <FaPlus className="text-xl" />
            </Link>
            <span className="text-xs mt-1">Créer</span>
          </div>
          
          {user ? (
            <Link
              href="/auth/profile"
              className={`flex flex-col items-center p-2 transition-colors ${isActive('/auth/profile') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
              aria-label="Profil"
            >
              <FaUser className="text-xl mb-1" />
              <span className="text-xs">Profil</span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className={`flex flex-col items-center p-2 transition-colors ${isActive('/auth/login') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
              aria-label="Connexion"
            >
              <FaUser className="text-xl mb-1" />
              <span className="text-xs">Connexion</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Add padding to content to account for both top and bottom bars */}
      <div className="pt-12 pb-6 md:pt-16 md:pb-0"></div>
    </>
  );
}