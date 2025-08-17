'use client';

import Image from 'next/image';
import type { Poll } from '@/types/profiles';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useCallback, useState, useRef, useEffect } from 'react';
import { 
  FaShare, 
  FaRegCopy, 
  FaCheck, 
  FaRegThumbsUp, 
  FaRegComment,
  FaTwitter,
  FaFacebookF,
  FaWhatsapp,
  FaLinkedinIn,
  FaEnvelope,
  FaInstagram,
} from 'react-icons/fa';
import { SiMessenger } from 'react-icons/si';
import { 
  TwitterShareButton, 
  FacebookShareButton, 
  WhatsappShareButton,
  LinkedinShareButton,
  EmailShareButton,
  FacebookMessengerShareButton
} from 'react-share';
import html2canvas from 'html2canvas';

interface PollOptionsProps {
  poll: Poll;
  votes?: Record<string, number>;
  userVote: string | null;
  totalVotes: number;
  handleVote: (option: string) => void;
  handleDeleteVote: () => void;
  isAuthenticated?: boolean;
  commentCount?: number;
  shareUrls?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
    email?: string;
    directUrl: string;
    imageUrl?: string;
    title?: string;
    description?: string;
  };
}

export default function PollOptions({
  poll,
  votes = {},
  userVote,
  totalVotes,
  handleVote,
  handleDeleteVote,
  isAuthenticated = false,
  commentCount = 0,
  shareUrls,
}: PollOptionsProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShowShareOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculatePercentage = useCallback(
    (voteCount: number) => totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : '0',
    [totalVotes]
  );

  const handleOptionClick = (optionText: string) => {
    if (!userVote && isAuthenticated) {
      setSelectedOption(optionText);
      setTimeout(() => {
        handleVote(optionText);
        setSelectedOption(null);
      }, 500);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrls?.directUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateSocialCard = async () => {
    setIsGeneratingCard(true);
    try {
      const hasImages = poll.options.some(option => option.image_url);
      const baseHeight = hasImages ? 1350 : 800; // Reduced height when no images
      const baseWidth = hasImages ? 1000 : 800; // Reduced height when no images
      
      const cardElement = document.createElement('div');
      cardElement.style.position = 'fixed';
      cardElement.style.left = '-9999px';
      cardElement.style.width = `${baseWidth}px`;
      cardElement.style.height = `${baseHeight}px`;
      cardElement.style.background = '#ffffff';
      cardElement.style.color = '#7C3AED';
      cardElement.style.borderRadius = '0';
      cardElement.style.boxShadow = '0';
      cardElement.style.display = 'flex';
      cardElement.style.flexDirection = 'column';
      cardElement.style.padding = '40px';
      cardElement.style.paddingBottom = '100px';
      cardElement.style.position = 'relative';
      cardElement.style.fontFamily = 'Arial, sans-serif';

      // Build the images section only if there are images
      const imagesSection = hasImages ? `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; padding: 30px; margin-top: 20px;">
          ${poll.options
            .map(
              (option, index) => `
                ${option.image_url ? `
                  <div style="flex: 1 1 auto; max-width: ${
                    poll.options.filter(opt => opt.image_url).length === 1 ? '800px' :
                    poll.options.filter(opt => opt.image_url).length === 2 ? '500px' : '350px'
                  }; margin: 15px 0;">
                    <img src="${option.image_url}" alt="${option.text}" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                ` : ''}
              `
            )
            .join('')}
        </div>
      ` : '';

      cardElement.innerHTML = `
        <div style="flex: 1; text-align: center;">
          <h2 style="font-size: 48px; font-weight: bold; margin-bottom: 40px;">${poll.question}</h2>
          <div style="margin-bottom: 40px;">
            ${poll.options
              .map(
                (option, index) => `
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <span style="flex: 1; text-align: left; font-size: 32px; font-weight: 600;">${option.text}</span>
                    <div style="flex: 2; height: 16px; background: #bc97fcff; border-radius: 8px; overflow: hidden; margin: 0 20px;">
                      <div style="height: 100%; background: #7C3AED; border-radius: 8px; width: ${calculatePercentage(
                        votes[option.text] || 0
                      )}%; transition: width 0.3s ease;"></div>
                    </div>
                    <span style="flex: 0.5; font-size: 32px; font-weight: bold;">${calculatePercentage(
                      votes[option.text] || 0
                    )}%</span>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
        ${imagesSection}
        <div style="
          background: #7C3AED;
          color: #ffffff;
          padding: 24px 48px;
          border-radius: 12px;
          font-size: 28px;
          font-weight: 600;
          line-height: 1.3;
          text-align: center;
          margin: 0 auto;
          max-width: 80%;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
          font-family: 'Helvetica Neue', Arial, sans-serif;
        ">
          Exprimez votre opinion • Partagez votre voix
        </div>
        <div style="position: absolute; bottom: 20px; right: 30px; font-size: 20px; opacity: 0.7; color: #7C3AED; text-align: right;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: #7C3AED; padding: 8px; border-radius: 8px; transition: transform 0.3s ease;">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12v-1.5a1.5 1.5 0 011.5-1.5h1a1.5 1.5 0 011.5 1.5V12a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 013 12zM3 6.5V5a1.5 1.5 0 011.5-1.5h1A1.5 1.5 0 017 5v1.5A1.5 1.5 0 015.5 8h-1A1.5 1.5 0 013 6.5zM3 17.5V16a1.5 1.5 0 011.5-1.5h1a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 013 17.5zM13 6v5h5V6h-5z"/>
                <path d="M13 13h5v5h-5v-5z"/>
              </svg>
            </div>
            <h1 style="font-size: 24px; font-weight: bolder; color: #7C3AED;">Lisolo</h1>
          </div>
        </div>
      `;

      document.body.appendChild(cardElement);

      const canvas = await html2canvas(cardElement, {
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `sondage-${poll.id}-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      document.body.removeChild(cardElement);
    } catch (error) {
      console.error('Error generating social card:', error);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Use provided shareUrls or fallback to current page URL
  const currentShareUrl = shareUrls?.directUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const currentShareTitle = shareUrls?.title || `Votez sur ce sondage : "${poll.question}"`;
  const currentShareImage = shareUrls?.imageUrl || poll.options[0]?.image_url || '';
  const currentShareDescription = shareUrls?.description || `${totalVotes} personnes ont voté • ${commentCount} commentaires`;

  const emailBody = encodeURIComponent(`
    ${currentShareDescription}

    <img src="${currentShareImage}" alt="share image" style="max-width:300px;" />

    Read more: ${currentShareUrl}
  `);

  return (
    <section className="w-full max-w-7xl mx-auto px-0 sm:px-0 lg:px-0 py-8">
      {/* Poll Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          {poll.question}
        </h2>
        
        {/* Share Button */}
        <div className="relative self-end md:self-center" ref={shareRef}>
          <button
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
            aria-label="Partager ce sondage"
          >
            <FaShare className="text-sm" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          
          {showShareOptions && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={clsx(
                "absolute mt-2 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg z-50 p-4",
                "right-0 md:right-0"
              )}
            >
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Partager ce sondage
              </h3>
              
              {/* Social Icons Grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
                <TwitterShareButton 
                  url={currentShareUrl} 
                  title={`${currentShareTitle}\n${currentShareDescription}\n${currentShareImage}\n`}
                  className="flex justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white hover:bg-blue-500 transition-colors">
                    <FaTwitter className="text-lg" />
                  </div>
                </TwitterShareButton>
                
                <FacebookShareButton 
                  url={currentShareUrl} 
                  className="flex justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                    <FaFacebookF className="text-lg" />
                  </div>
                </FacebookShareButton>


                <FacebookMessengerShareButton
                  url={currentShareUrl}
                  appId="YOUR_FB_APP_ID"
                  className="flex justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white hover:bg-blue-500 transition-colors">
                    <SiMessenger className="text-lg" />
                  </div>
                </FacebookMessengerShareButton>
                
                <WhatsappShareButton 
                  url={currentShareUrl} 
                  title={`${currentShareTitle}\n${currentShareDescription}`} 
                  className="flex justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors">
                    <FaWhatsapp className="text-lg" />
                  </div>
                </WhatsappShareButton>

                <LinkedinShareButton
                  url={currentShareUrl}
                  title={currentShareTitle}
                  summary={currentShareDescription}
                  className="flex justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white hover:bg-blue-800 transition-colors">
                    <FaLinkedinIn className="text-lg" />
                  </div>
                </LinkedinShareButton>

<EmailShareButton
  url={currentShareUrl} // still needed for mailto link
  subject={currentShareTitle}
  body={emailBody}
  className="flex justify-center"
>
  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
    <FaEnvelope className="text-lg" />
  </div>
</EmailShareButton>

                <button
                  onClick={copyToClipboard}
                  className="flex justify-center"
                  aria-label="Copier le lien pour Instagram"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white hover:from-purple-600 hover:to-pink-600 transition-colors">
                    <FaInstagram className="text-lg" />
                  </div>
                </button>
              </div>
              
              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
              
              {/* Download Card Button */}
              {/* <button
                onClick={generateSocialCard}
                disabled={isGeneratingCard}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isGeneratingCard ? (
                  <ClipLoader size={16} color="#6b7280" />
                ) : (
                  <>
                    <FiDownload />
                    <span>Télécharger une image pour les réseaux</span>
                  </>
                )}
              </button> */}
              
              {/* Link Copy Section */}
              <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mt-3">
                <input 
                  type="text" 
                  value={currentShareUrl} 
                  readOnly 
                  className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-300 truncate" 
                  aria-label="URL du sondage"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  aria-label={copied ? "Copié !" : "Copier le lien"}
                >
                  {copied ? <FaCheck className="text-green-500" /> : <FaRegCopy />}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <div className="flex items-center gap-1">
          <FaRegThumbsUp />
          <span>{totalVotes} votes</span>
        </div>
        <div className="flex items-center gap-1">
          <FaRegComment />
          <span>{commentCount} commentaires</span>
        </div>
      </div>

      {/* Poll Options */}
      <div className="grid gap-6 sm:grid-cols-2">
        {poll.options.map((option) => {
          const voteCount = votes[option.text] || 0;
          const percentage = calculatePercentage(voteCount);
          const isSelected = selectedOption === option.text || userVote === option.text;
          const isDisabled = !!userVote || !isAuthenticated;

          return (
            <motion.div
              key={option.text}
              className={clsx(
                'relative rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-gray-800',
                'transition-transform',
                isDisabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl',
                isSelected && 'ring-2 ring-indigo-500 dark:ring-indigo-400'
              )}
              onClick={() => !isDisabled && handleOptionClick(option.text)}
              whileHover={isDisabled ? {} : { scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              {/* Image Background */}
              {option.image_url && (
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src={option.image_url}
                    alt={option.text}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              {/* Content */}
              <div className={clsx(
                'p-5 sm:p-6',
                option.image_url ? 'absolute inset-0 flex flex-col justify-end' : 'relative'
              )}>
                <h3 className={clsx(
                  'text-lg sm:text-xl font-semibold',
                  option.image_url ? 'text-white' : 'text-gray-900 dark:text-white'
                )}>
                  {option.text}
                </h3>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-3 mb-2">
                  <motion.div
                    className={clsx(
                      'h-2.5 rounded-full',
                      isSelected ? 'bg-indigo-600' : 'bg-indigo-400'
                    )}
                    initial={{ width: '0%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                {/* Vote Stats */}
                <div className={clsx(
                  'flex justify-between text-sm font-medium',
                  option.image_url ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'
                )}>
                  <span>{percentage}%</span>
                  <span>
                    {voteCount} vote{voteCount !== 1 ? 's' : ''}
                    {isSelected && <span className="ml-2">✓</span>}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* User Actions */}
      <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        {userVote ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Vous avez voté pour <span className="font-semibold text-indigo-600 dark:text-indigo-400">{userVote}</span>
            </p>
            <button
              onClick={handleDeleteVote}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Changer de vote
            </button>
          </>
        ) : !isAuthenticated ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <a href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Connectez-vous
            </a>{' '}
            pour participer à ce sondage
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sélectionnez une option pour voter
          </p>
        )}
      </div>
    </section>
  );
}