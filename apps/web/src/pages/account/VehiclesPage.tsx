import { useState, useEffect } from 'react';
import { Bike } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Shell, SectionKicker, inputClass } from '@/components/layout/Shell';

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  registrationNumber: string;
  vehicleType: string;
}

export function VehiclesPage() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    brand: '',
    model: '',
    vehicleType: 'Motorcycle',
    registrationNumber: '',
  });
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('/api/account/vehicles', { credentials: 'include' })
      .then((res) => res.json())
      .then((result) => setVehicles(result.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    try {
      const response = await fetch('/api/account/vehicles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || t('vehicles.error'));
        return;
      }
      setForm({ brand: '', model: '', vehicleType: 'Motorcycle', registrationNumber: '' });
      setMessage(t('vehicles.added'));
      load();
    } catch {
      setMessage('Error adding vehicle.');
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
        <SectionKicker>{t('vehicles.kicker')}</SectionKicker>
        <h1 className="display-font text-6xl font-bold uppercase">{t('vehicles.title')}</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
              >
                <div>
                  <p className="font-bold">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {vehicle.registrationNumber} · {vehicle.vehicleType}
                  </p>
                </div>
                <Bike className="text-[hsl(var(--accent))]" />
              </div>
            ))}
            {!vehicles.length && (
              <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-sm text-[hsl(var(--muted-foreground))]">
                {t('vehicles.empty')}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-[hsl(var(--secondary))] p-6 text-[hsl(var(--background))]">
            <h2 className="display-font text-3xl font-bold uppercase">{t('vehicles.add')}</h2>
            <label className="mt-4 block text-sm font-bold">
              {t('vehicles.brand')}
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={`${inputClass} text-[hsl(var(--foreground))]`}
                required
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              {t('vehicles.model')}
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className={`${inputClass} text-[hsl(var(--foreground))]`}
                required
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              {t('vehicles.registration')}
              <input
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                className={`${inputClass} text-[hsl(var(--foreground))]`}
                required
              />
            </label>
            <button
              type="button"
              onClick={add}
              className="mt-6 w-full rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--secondary))]"
            >
              {t('vehicles.save')}
            </button>
            {message && <p className="mt-4 text-sm">{message}</p>}
          </div>
        </div>
      </main>
    </Shell>
  );
}

export default VehiclesPage;
