import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Part } from '@workspace/api-client-react';
import { Shell, SectionKicker } from '@/components/layout/Shell';

export type CartLine = { part: Part; quantity: number };
export const cartKey = 'shriram-cart';
export const partPrice = (part: Part) => 350 + (Number(part.id) || 1) * 125;

export function CartPage() {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(cartKey) || '[]');
    } catch {
      return [];
    }
  });

  const update = (id: string, quantity: number) => {
    const next = cart
      .map((line) => (line.part.id === id ? { ...line, quantity } : line))
      .filter((line) => line.quantity > 0);
    setCart(next);
    localStorage.setItem(cartKey, JSON.stringify(next));
  };

  const total = cart.reduce((sum, line) => sum + partPrice(line.part) * line.quantity, 0);

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
        <SectionKicker>{t('cart.kicker')}</SectionKicker>
        <h1 className="display-font text-6xl font-bold uppercase">{t('cart.title')}</h1>

        {cart.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[hsl(var(--border))] p-12 text-center">
            <ShoppingCart className="mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
            <p className="font-bold">{t('cart.empty')}</p>
            <Link
              href="/shop"
              className="mt-5 inline-flex rounded-lg bg-[hsl(var(--secondary))] px-4 py-3 text-sm font-bold text-[hsl(var(--background))]"
            >
              {t('shop.title')}
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5">
              {cart.map((line) => (
                <div
                  key={line.part.id}
                  className="flex items-center justify-between gap-4 border-b border-[hsl(var(--border))] py-5 last:border-0"
                >
                  <div>
                    <p className="font-bold">{line.part.name}</p>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      ₹{partPrice(line.part).toLocaleString('en-IN')} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      aria-label={`${line.part.name} quantity`}
                      type="number"
                      min="0"
                      value={line.quantity}
                      onChange={(event) => update(line.part.id, Number(event.target.value))}
                      className="w-16 rounded-lg border border-[hsl(var(--border))] px-2 py-2 text-center text-sm"
                    />
                    <span className="w-20 text-right font-bold">
                      ₹{(partPrice(line.part) * line.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-2xl bg-[hsl(var(--secondary))] p-6 text-[hsl(var(--background))]">
              <p className="mono-font text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">
                {t('cart.summary')}
              </p>
              <div className="mt-5 flex justify-between border-t border-[hsl(var(--background)/.15)] pt-5">
                <span>{t('cart.total')}</span>
                <strong>₹{total.toLocaleString('en-IN')}</strong>
              </div>
              <Link
                href="/checkout"
                className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--secondary))]"
              >
                {t('cart.checkout')} <ArrowRight size={15} />
              </Link>
            </aside>
          </div>
        )}
      </main>
    </Shell>
  );
}

export default CartPage;
