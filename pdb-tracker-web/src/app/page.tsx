import { Suspense } from 'react';
import PdbTracker from '@/components/pdb-tracker';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-claude-bg overflow-hidden">
      <main className="flex-1 flex min-h-0">
        <Suspense fallback={null}>
          <PdbTracker />
        </Suspense>
      </main>
    </div>
  );
}
