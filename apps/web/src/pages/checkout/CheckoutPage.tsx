import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shell, SectionKicker, inputClass } from '@/components/layout/Shell';
import { cartKey, partPrice, type CartLine } from '@/pages/cart/CartPage';

export function CheckoutPage() {
  const { t } = useTranslation();
  const [cart] = useState<CartLine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(cartKey) || '[]');
    } catch {
      return [];
    }
  });
  const [deliveryMethod, setDeliveryMethod] = useState('PICKUP');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [message, setMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const submit = async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMethod,
          paymentMethod,
          items: cart.map((line) => ({ productId: Number(line.part.id), quantity: line.quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || t('checkout.error'));
        return;
      }
      setOrderNumber(result.data.orderNumber);
      localStorage.removeItem(cartKey);
      setMessage(t('checkout.pending'));
    } catch {
      setMessage('Failed to place order. Please call the shop directly.');
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
        <SectionKicker>{t('checkout.kicker')}</SectionKicker>
        <h1 className="display-font text-6xl font-bold uppercase">{t('checkout.title')}</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h2 className="display-font text-3xl font-bold uppercase">{t('checkout.delivery')}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod('PICKUP')}
                className={`rounded-xl border p-4 text-left font-bold ${
                  deliveryMethod === 'PICKUP'
                    ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.16)]'
                    : 'border-[hsl(var(--border))]'
                }`}
              >
                {t('checkout.pickup')}
                <span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">
                  {t('checkout.pickupAddress')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('DELIVERY')}
                className={`rounded-xl border p-4 text-left font-bold ${
                  deliveryMethod === 'DELIVERY'
                    ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.16)]'
                    : 'border-[hsl(var(--border))]'
                }`}
              >
                {t('checkout.deliveryHome')}
              </button>
            </div>

            <h2 className="display-font mt-9 text-3xl font-bold uppercase">{t('checkout.payment')}</h2>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClass}
            >
              <option value="CASH">{t('checkout.cash')}</option>
              <option value="COD">{t('checkout.cod')}</option>
              <option value="ONLINE">{t('checkout.onlinePending')}</option>
            </select>

            <button
              type="button"
              disabled={!cart.length || Boolean(orderNumber)}
              onClick={submit}
              className="mt-8 w-full rounded-lg bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))] disabled:opacity-40"
            >
              {t('checkout.place')}
            </button>

            {message && (
              <p className="mt-5 rounded-lg bg-[hsl(var(--muted))] p-4 text-sm font-bold">
                {message}
                {orderNumber && <span className="mt-2 block font-mono">{orderNumber}</span>}
              </p>
            )}
          </div>

          <aside className="h-fit rounded-2xl bg-[hsl(var(--secondary))] p-6 text-[hsl(var(--background))]">
            <p className="mono-font text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">
              {t('cart.summary')}
            </p>
            <div className="mt-5 space-y-3 text-sm">
              {cart.map((line) => (
                <div key={line.part.id} className="flex justify-between gap-3">
                  <span>
                    {line.part.name} × {line.quantity}
                  </span>
                  <span>₹{(partPrice(line.part) * line.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </Shell>
  );
}

export default CheckoutPage;
