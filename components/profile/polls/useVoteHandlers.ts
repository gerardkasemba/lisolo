import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useVoteHandlers(
  pollId: number,
  isAuthenticated: boolean,
  userVote: string | null,
  setUserVote: (vote: string | null) => void
) {
  const router = useRouter();

  const handleVote = async (option: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirectedFrom=/polls/${pollId}`);
      return;
    }
    if (userVote) {
      alert('Vous avez déjà voté pour ce sondage.');
      return;
    }
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Get user's profile with region information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('region_id, regions(name)')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Check if region_id is missing
      if (!profile?.region_id) {
        alert('Erreur lors du vote : Veuillez sélectionner une région dans votre profil avant de voter.');
        return;
      }

      // Extract region information (handle regions as an array)
      const regionData = profile?.regions as { name: string }[] | null;
      const regionName = regionData && regionData.length > 0 ? regionData[0].name : null;

      // Record the vote with region information
      const { error } = await supabase.from('votes').insert({
        poll_id: pollId,
        user_id: user.id,
        option,
        region_id: profile.region_id,
        region_name: regionName
      });

      if (error) throw error;
      setUserVote(option);
    } catch (error) {
      console.error('Error voting:', error);
      alert('Erreur lors du vote. Veuillez réessayer.');
    }
  };

  const handleDeleteVote = async () => {
    if (!isAuthenticated || !userVote) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');
      
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserVote(null);
    } catch (error) {
      console.error('Error deleting vote:', error);
      alert('Erreur lors de la suppression du vote. Veuillez réessayer.');
    }
  };

  return { handleVote, handleDeleteVote };
}