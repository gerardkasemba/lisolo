// app/about/page.tsx
import type { Metadata } from 'next'
import ClientPage from './clientpage';

export const metadata: Metadata = {
  title: 'PamojaKongo | Engagez-vous dans les Conversations du Congo',
  description: 'Rejoignez Lisolo pour participer à des sondages et discussions sur la politique, la culture, la société et plus encore. Partagez votre voix et connectez-vous avec la communauté congolaise !'
};

export default function PrivacyPolicy() {
  return (
    <main className="privacy-policy">
      <ClientPage />
    </main>
  )
}
