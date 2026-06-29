import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'ar' }> }) {
  const resolvedParams = await params;
  redirect(`/${resolvedParams.lang}/dashboard`);
}
