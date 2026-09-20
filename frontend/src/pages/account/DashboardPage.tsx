import { Shell } from '@/components/layout/Shell';
import { CustomerDashboard } from '@/components/account/CustomerDashboard';

export function DashboardPage() {
  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CustomerDashboard />
      </main>
    </Shell>
  );
}

export default DashboardPage;
