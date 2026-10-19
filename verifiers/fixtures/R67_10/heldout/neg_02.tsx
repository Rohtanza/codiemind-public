import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/Spinner';

const Settings = lazy(() => import('../pages/Settings'));

export function SettingsRoute() {
  return (
    <Suspense fallback={<Spinner />}>
      <Settings />
    </Suspense>
  );
}
