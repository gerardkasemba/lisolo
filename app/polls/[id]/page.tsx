// app/polls/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import PollDetail from '@/components/profile/polls/PollDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params; // Await params to get id
  const pollId = Number(id);
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lisolo.com';

  if (isNaN(pollId)) {
    return {
      title: 'Lisolo | Sondage Introuvable',
      description: 'Ce sondage n\'existe pas. Explorez d\'autres sondages sur Lisolo!',
    };
  }

  const supabase = createClient();

  const { data: poll, error } = await supabase
    .from('polls')
    .select(`
      id,
      question,
      options,
      image_url,
      category,
      created_at,
      created_by
    `)
    .eq('id', pollId)
    .single();

  if (!poll || error) {
    return {
      title: 'Lisolo | Sondage Introuvable',
      description: 'Ce sondage n\'existe pas ou a été supprimé.',
    };
  }

  const title = `${poll.question} | Lisolo`;
  const description = `Participez à ce sondage: "${poll.question.substring(0, 100)}..."`;
  const imageUrl = poll.image_url
    ? new URL(poll.image_url, SITE_URL).toString()
    : new URL('/default-poll-image.jpg', SITE_URL).toString();
  const url = new URL(`/polls/${pollId}`, SITE_URL).toString();

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: poll.created_at,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Sondage: ${poll.question}`,
        },
      ],
      siteName: 'Lisolo',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PollPage({ params }: PageProps) {
  const { id } = await params; // Await params to get id
  const pollId = Number(id);

  if (isNaN(pollId)) {
    notFound();
  }

  return <PollDetail pollId={pollId} />;
}

export async function generateStaticParams() {
  const supabase = createClient();
  const { data: polls, error } = await supabase
    .from('polls')
    .select('id')
    .limit(100);

  return polls?.map((poll) => ({
    id: poll.id.toString(),
  })) || [];
}