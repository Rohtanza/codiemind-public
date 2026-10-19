import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/Spinner';

const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

export function SettingsRoute() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
