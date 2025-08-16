// components/profile/CreatePollButton.tsx
'use client';

import Link from 'next/link';

export default function CreatePollButton() {
  return (
    <Link
      href="/auth/create"
      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded text-center transition-colors mb-8"
    >
      Create New Poll
    </Link>
  );
}