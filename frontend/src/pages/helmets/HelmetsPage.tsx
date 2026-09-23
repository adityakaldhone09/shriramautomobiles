import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Gauge, Search, ShieldCheck, SlidersHorizontal, Star } from 'lucide-react';
import { Link } from 'wouter';
import { Shell } from '@/components/layout/Shell';
import { helmetsApi } from '@/services/api';

function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `₹${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '0'}`;
}

function productStartingPrice(product: any) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) {
    return Number(product?.basePrice ?? 0);
  }

  const prices = variants.map((variant: any) => Number(variant?.mrp ?? product?.basePrice ?? 0));
  return Math.min(...prices);
}

function productStock(product: any) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.reduce((total: number, variant: any) => {
    return total + (Array.isArray(variant?.inventory) ? variant.inventory.reduce((sum: number, item: any) => sum + Number(item?.quantity ?? 0), 0) : 0);
  }, 0);
}

export function HelmetsPage() {
  const { data: brands = [] } = useQuery({
    queryKey: ['helmets-brands'],
    queryFn: helmetsApi.getBrands,
  });

  const { data: types = [] } = useQuery({
    queryKey: ['helmets-types'],
    queryFn: helmetsApi.getTypes,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['helmets-products'],
    queryFn: helmetsApi.getProducts,
  });

  const [brandFilter, setBrandFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const visibleProducts = useMemo(() => {
    return (products as any[]).filter((product) => {
      const matchesBrand = brandFilter === 'all' || String(product?.brand?.id ?? '') === brandFilter;
      const matchesType = typeFilter === 'all' || String(product?.type?.id ?? '') === typeFilter;
      const haystack = `${product?.name ?? ''} ${product?.description ?? ''} ${product?.brand?.name ?? ''} ${product?.type?.name ?? ''}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query.toLowerCase());
      return matchesBrand && matchesType && matchesSearch;
    });
  }, [brandFilter, products, query, typeFilter]);

  const comparisonProducts = (products as any[]).filter((product) => compareIds.includes(Number(product.id)));

  const toggleCompare = (productId: number) => {
    setCompareIds((current) => {
      if (current.includes(productId)) {
        return current.filter((value) => value !== productId);
      }
      if (current.length >= 3) {
        return [...current.slice(1), productId];
      }
      return [...current, productId];
    });
  };

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/.18),_transparent_45%),linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--secondary)/.95))] p-6 text-[hsl(var(--background))] shadow-[0_22px_48px_rgba(15,23,42,0.18)] md:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="mono-font mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">
                <span className="h-px w-7 bg-[hsl(var(--primary))]" />
                Premium Safety Gear
              </div>
              <h1 className="display-font text-4xl font-bold tracking-tight md:text-5xl">Built for every road, every ride.</h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-[hsl(var(--background)/.8)] md:text-base">
                Explore certified helmets designed for daily commuting, touring, and high-speed confidence. Compare styles, fitment, and pricing from one trusted catalog.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[hsl(var(--background)/.18)] bg-[hsl(var(--background)/.08)] px-4 py-3 backdrop-blur-sm">
                <div className="text-2xl font-black">5+</div>
                <div className="text-[10px] uppercase tracking-[.2em] text-[hsl(var(--background)/.7)]">Brands</div>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--background)/.18)] bg-[hsl(var(--background)/.08)] px-4 py-3 backdrop-blur-sm">
                <div className="text-2xl font-black">20+</div>
                <div className="text-[10px] uppercase tracking-[.2em] text-[hsl(var(--background)/.7)]">Variants</div>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--background)/.18)] bg-[hsl(var(--background)/.08)] px-4 py-3 backdrop-blur-sm">
                <div className="text-2xl font-black">24/7</div>
                <div className="text-[10px] uppercase tracking-[.2em] text-[hsl(var(--background)/.7)]">Support</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5">
              <Search size={18} className="text-[hsl(var(--muted-foreground))]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search helmet brand, type or model"
                className="w-full border-0 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2">
                <SlidersHorizontal size={16} className="text-[hsl(var(--muted-foreground))]" />
                <select
                  value={brandFilter}
                  onChange={(event) => setBrandFilter(event.target.value)}
                  className="bg-transparent text-sm text-[hsl(var(--foreground))] outline-none"
                >
                  <option value="all">All brands</option>
                  {(brands as any[]).map((brand) => (
                    <option key={brand.id} value={String(brand.id)}>{brand.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2">
                <Gauge size={16} className="text-[hsl(var(--muted-foreground))]" />
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="bg-transparent text-sm text-[hsl(var(--foreground))] outline-none"
                >
                  <option value="all">All styles</option>
                  {(types as any[]).map((type) => (
                    <option key={type.id} value={String(type.id)}>{type.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {comparisonProducts.length > 0 && (
          <section className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Helmet comparison</h2>
              <span className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">{comparisonProducts.length}/3 selected</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {comparisonProducts.map((product: any) => (
                <div key={product.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">{product?.brand?.name}</div>
                      <p className="mt-1 font-bold text-[hsl(var(--foreground))]">{product?.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCompare(Number(product.id))}
                      className="rounded-full border border-[hsl(var(--border))] px-2 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center justify-between"><span>Price</span><strong className="text-[hsl(var(--foreground))]">{formatPrice(productStartingPrice(product))}</strong></div>
                    <div className="flex items-center justify-between"><span>Style</span><strong className="text-[hsl(var(--foreground))]">{product?.type?.name}</strong></div>
                    <div className="flex items-center justify-between"><span>Stock</span><strong className="text-[hsl(var(--foreground))]">{productStock(product)} units</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center text-[hsl(var(--muted-foreground))]">
              No helmets match this filter yet. Try a different brand or style.
            </div>
          ) : (
            visibleProducts.map((product: any) => {
              const price = productStartingPrice(product);
              const stock = productStock(product);
              const accent = product?.type?.name?.includes('Open') ? 'from-amber-500/20 to-orange-500/10' : 'from-sky-500/15 to-blue-500/10';

              return (
                <article key={product.id} className="overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                  <div className={`relative h-52 bg-gradient-to-br ${accent}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--background)/.18),transparent_40%)]" />
                    <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--background)/.25)] bg-[hsl(var(--background)/.12)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--background))]">
                      <ShieldCheck size={12} />
                      {product?.brand?.name ?? 'Brand'}
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                      <div>
                        <div className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--background)/.78)]">{product?.type?.name ?? 'Helmet'}</div>
                        <div className="mt-2 text-2xl font-black text-[hsl(var(--background))]">{product?.name}</div>
                      </div>
                      <div className="rounded-full border border-[hsl(var(--background)/.25)] bg-[hsl(var(--background)/.1)] px-3 py-1 text-xs font-bold text-[hsl(var(--background))]">
                        {stock} in stock
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">From</div>
                        <div className="mt-1 text-2xl font-black text-[hsl(var(--foreground))]">{formatPrice(price)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompare(Number(product.id))}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] ${compareIds.includes(Number(product.id)) ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--background))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}
                      >
                        Compare
                      </button>
                    </div>

                    <p className="mb-4 line-clamp-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{product?.description || 'Premium safety with rider comfort built in.'}</p>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {(Array.isArray(product?.variants) ? product.variants : []).slice(0, 4).map((variant: any) => (
                        <span key={variant.id} className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--foreground))]">
                          {variant?.color}
                        </span>
                      ))}
                    </div>

                    <div className="mb-5 flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span>Certified fitment</span>
                      </div>
                      <span className="font-semibold text-[hsl(var(--foreground))]">{product?.type?.name}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Link href="/book-service" className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--secondary))]">
                        Book fitting <ArrowRight size={16} />
                      </Link>
                      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
                        <Check size={12} />
                        Ready to ship
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </Shell>
  );
}

export default HelmetsPage;
