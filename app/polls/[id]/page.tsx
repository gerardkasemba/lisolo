// app/polls/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import PollDetail from '@/components/profile/polls/PollDetail';

interface PollPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PollPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pollId = Number(resolvedParams.id);

  if (isNaN(pollId)) {
    return {
      title: 'Lisolo | Sondage Introuvable',
      description: 'Ce sondage n’existe pas. Explorez d’autres sondages sur Lisolo pour participer aux discussions de la communauté congolaise !',
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
      created_by,
      profiles:created_by(name)
    `)
    .eq('id', pollId)
    .single();

  if (!poll || error) {
    return {
      title: 'Lisolo | Sondage Introuvabless',
      description: 'Ce sondage n’existe pas. Explorez d’autres sondages sur Lisolo pour participer aux discussions de la communauté congolaise !',
    };
  }

  const title = `${poll.question} | Lisolo`;
  const description = `Participez au sondage : "${poll.question}" sur Lisolo. Rejoignez la communauté congolaise pour partager votre opinion !`;
  const imageUrl = poll.image_url || 'https://yourdomain.com/default-poll-image.jpg';
  const url = `https://yourdomain.com/polls/${pollId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: poll.question,
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

export default async function PollPage({ params }: PollPageProps) {
  const resolvedParams = await params;
  const pollId = Number(resolvedParams.id);

  if (isNaN(pollId)) {
    notFound();
  }

  return <PollDetail pollId={pollId} />;
}

export async function generateStaticParams() {
  const supabase = createClient();
  const { data: polls } = await supabase.from('polls').select('id');

  return polls?.map((poll) => ({
    id: poll.id.toString(),
  })) || [];
}