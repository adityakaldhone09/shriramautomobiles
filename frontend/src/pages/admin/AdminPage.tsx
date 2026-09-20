import { useListBookings, getListBookingsQueryKey } from '@workspace/api-client-react';
import type { Booking } from '@workspace/api-client-react';
import { CircleAlert, ToolCase } from 'lucide-react';
import { Shell, SectionKicker } from '@/components/layout/Shell';

export function BookingRow({ booking }: { booking: Booking }) {
  return (
    <div
      className="grid gap-3 border-b border-[hsl(var(--border))] px-5 py-5 last:border-0 md:grid-cols-[1fr_1fr_150px_130px] md:items-center"
      data-testid={`row-booking-${booking.id}`}
    >
      <div>
        <p className="font-bold">{booking.fullName}</p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{booking.phone}</p>
      </div>
      <div>
        <p className="font-bold">
          {booking.vehicleBrand} {booking.vehicleModel}
        </p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {booking.selectedServices.join(', ')}
        </p>
      </div>
      <div>
        <p className="text-sm font-bold">{booking.appointmentDate}</p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{booking.timeSlot}</p>
      </div>
      <span className="w-fit rounded-full bg-[hsl(var(--primary)/.25)] px-3 py-1 text-[10px] font-bold uppercase text-[hsl(var(--secondary))]">
        {booking.status}
      </span>
    </div>
  );
}

export function AdminPage() {
  const bookingsQuery = useListBookings({ query: { queryKey: getListBookingsQueryKey() } });
  const bookings = bookingsQuery.data ?? [];

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-5 border-b border-[hsl(var(--border))] pb-8 md:flex-row md:items-end">
          <div>
            <SectionKicker>Future-ready view</SectionKicker>
            <h1 className="display-font text-6xl font-bold uppercase leading-[.88]">
              Booking<br />
              <span className="text-[hsl(var(--accent))]">desk.</span>
            </h1>
          </div>
          <div className="rounded-xl bg-[hsl(var(--muted))] px-4 py-3">
            <span className="mono-font block text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
              Total requests
            </span>
            <span className="display-font text-3xl font-bold">{bookings.length}</span>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          {bookingsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))] animate-pulse">
              Loading bookings...
            </div>
          ) : bookingsQuery.isError ? (
            <div className="p-8 text-center">
              <CircleAlert className="mx-auto mb-2 text-[hsl(var(--accent))]" />
              <p className="font-bold">Failed to load bookings</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <ToolCase className="mx-auto mb-3" />
              <p className="font-bold">No booking requests found</p>
            </div>
          ) : (
            <div>
              <div className="hidden grid-cols-[1fr_1fr_150px_130px] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.55)] px-5 py-3 md:grid">
                <span className="mono-font text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Rider
                </span>
                <span className="mono-font text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Vehicle / service
                </span>
                <span className="mono-font text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Appointment
                </span>
                <span className="mono-font text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Status
                </span>
              </div>
              <div>
                {bookings.map((booking) => (
                  <BookingRow booking={booking} key={booking.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}

export default AdminPage;
