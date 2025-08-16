// lib/shareUtils.ts
interface GenerateShareUrlsParams {
  pollId: number;
  question: string;
  imageUrl?: string; // Now properly marked as optional with string | undefined
  totalVotes: number;
  commentCount: number;
}

export function generateShareUrls({
  pollId,
  question,
  imageUrl,
  totalVotes,
  commentCount
}: GenerateShareUrlsParams) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000/';
  const url = `${baseUrl}/polls/${pollId}`;
  const title = encodeURIComponent(question);
  const description = encodeURIComponent(
    `${totalVotes} votes • ${commentCount} commentaires`
  );
  
  // Handle null or undefined imageUrl by providing a default
  const safeImageUrl = imageUrl ?? `${baseUrl}/default-poll-image.jpg`;
  const image = encodeURIComponent(safeImageUrl);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}&hashtags=Sondage`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${description}`,
    whatsapp: `https://wa.me/?text=${title}%0A%0A${url}`,
    email: `mailto:?subject=${title}&body=${description}%0A%0A${url}`,
    directUrl: url,
    imageUrl: safeImageUrl,
    title: question,
    description: `${totalVotes} votes • ${commentCount} commentaires`
  };
}