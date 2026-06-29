import LoggerClientPage from './client-page';
import { getDictionary } from '../../getDictionary';

export default async function Page({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'ar' }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang);
  
  return <LoggerClientPage dict={dict} lang={resolvedParams.lang} />;
}
