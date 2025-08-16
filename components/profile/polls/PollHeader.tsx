// components/PollHeader.tsx
import Image from 'next/image';
import { Poll } from '@/types/profiles';

interface PollHeaderProps {
  poll: Poll;
  totalVotes: number;
}

export default function PollHeader({ poll, totalVotes }: PollHeaderProps) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{poll.question}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Catégorie: {poll.category} | Région: {poll.region || 'Partout'} | Total des votes: {totalVotes}
      </p>
      {poll.image_url && (
        <Image
          src={poll.image_url}
          alt="Poll Image"
          width={300}
          height={300}
          className="rounded-lg border mt-2"
        />
      )}
    </div>
  );
}