import { NextResponse } from 'next/server';
import natural from 'natural';
import { supabase } from '@/lib/supabase';

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

export async function POST(request: Request) {
  const { question } = await request.json();

  // Fetch existing poll questions
  const { data: polls, error } = await supabase.from('polls').select('question');
  if (error) return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });

  const tfidf = new TfIdf();
  polls.forEach((poll: { question: string }) => tfidf.addDocument(tokenizer.tokenize(poll.question)));

  const newTokens = tokenizer.tokenize(question);
  let isDuplicate = false;
  let maxSimilarity = 0;

  tfidf.tfidfs(newTokens, (i, measure) => {
    if (measure > maxSimilarity) maxSimilarity = measure;
  });

  if (maxSimilarity > 0.7) isDuplicate = true;  // Adjustable threshold

  return NextResponse.json({ isDuplicate, similarity: maxSimilarity });
}