// app/category/[category]/page.tsx
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';
import type { Metadata } from 'next'

// Define the categories array
const categories = [
  'Divertissement',
  'Politique',
  'Polémique',
  'Technologie',
  'Sports',
  'Cuisine',
  'Voyages',
  'Santé',
  'Éducation',
  'Culture',
  'Musique',
  'Mode',
  'Société',
  'Économie',
  'Environnement',
  'Agriculture',
  'Religion',
  'Histoire',
  'Vie quotidienne',
  'Humour',
];

// Define the props interface
interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export const metadata: Metadata = {
  title: 'Lisolo | Découvrez les Catégories et Sondages du Congo',
  description: 'Explorez des catégories comme la politique, la culture, et la société sur Lisolo. Participez à des sondages interactifs et partagez votre voix avec la communauté congolaise !'
};
export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const { category } = resolvedParams;

  if (!categories.includes(category)) {
    notFound();
  }

  return <CategoryPageClient category={category} />;
}

export async function generateStaticParams() {
  return categories.map((category) => ({
    category: category,
  }));
}