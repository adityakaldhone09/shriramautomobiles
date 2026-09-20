import { Shell } from '@/components/layout/Shell';
import { ServiceBookingWizard } from '@/components/booking/ServiceBookingWizard';

export function BookingPage() {
  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ServiceBookingWizard />
      </main>
    </Shell>
  );
}

export default BookingPage;
