import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Bike, Menu, MessageSquare, Phone, ShoppingCart, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export const businessPhone = '9689788724';
export const wholesalePhone = '9689788724';
export const inputClass =
  'mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-3 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.18)]';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--secondary))] shadow-[4px_4px_0_hsl(var(--secondary))]">
        <Bike size={22} strokeWidth={2.6} />
      </span>
      <span className="leading-none">
        <span className="display-font block text-[22px] font-bold uppercase tracking-tight">Shriram</span>
        <span className="mono-font block pt-0.5 text-[9px] font-bold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">
          Automobiles
        </span>
      </span>
    </Link>
  );
}

export function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <div className="mono-font mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">
      <span className="h-px w-7 bg-[hsl(var(--accent))]" />
      {children}
    </div>
  );
}

export function BusinessNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  const links = [
    ['/', t('navbar.home', 'Home')],
    ['/shop', t('shop.nav', 'Shop Parts')],
    ['/helmets', 'Helmets'],
    ['/book-service', t('navbar.bookService', 'Book Service')],
    ['/account/dashboard', t('account.nav', 'My Garage')],
    ['/contact', t('navbar.contact', 'Contact')],
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.92)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`mono-font text-[11px] font-bold uppercase tracking-[.14em] transition-colors hover:text-[hsl(var(--accent))] ${
                location === href ? 'text-[hsl(var(--accent))] font-extrabold' : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/cart"
            aria-label="Cart"
            className="rounded-lg border border-[hsl(var(--border))] p-2 text-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))]"
          >
            <ShoppingCart size={17} />
          </Link>
          <a
            href={`tel:${businessPhone}`}
            className="mono-font hidden items-center gap-2 text-[11px] font-bold text-[hsl(var(--secondary))] lg:flex"
          >
            <Phone size={14} /> +91 {businessPhone}
          </a>
          <Link
            href="/book-service"
            className="hidden rounded-lg bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--background))] transition-all hover:bg-[hsl(var(--accent))] sm:block"
          >
            {t('navbar.bookService', 'Book Service')}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            className="rounded-lg border border-[hsl(var(--border))] p-2 md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-[hsl(var(--border))] px-5 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {links.map(([href, label]) => (
              <Link
                key={href}
                onClick={() => setOpen(false)}
                href={href}
                className="rounded-lg px-3 py-2.5 text-sm font-bold hover:bg-[hsl(var(--muted))]"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function BusinessFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-[hsl(var(--secondary))] px-5 py-12 text-[hsl(var(--background))] lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-6 text-[hsl(var(--background)/.65)]">
            {t('business.description', 'Genuine two-wheeler spare parts, authorized vehicle servicing, diagnostics, and repairs in Sangola.')}
          </p>
        </div>
        <div>
          <p className="mono-font mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">
            {t('contact.retailShop', 'Workshop & Retail')}
          </p>
          <p className="text-sm leading-6 text-[hsl(var(--background)/.72)]">
            Miraj Road, Near Railway Gate, Sangola, Maharashtra - 413307
          </p>
          <a href={`tel:${businessPhone}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">
            <Phone size={14} /> +91 {businessPhone}
          </a>
        </div>
        <div>
          <p className="mono-font mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">
            {t('contact.wholesaleGodown', 'Wholesale Godown')}
          </p>
          <p className="text-sm leading-6 text-[hsl(var(--background)/.72)]">
            Shriram Autoparts, Near Adarsh School, White House, Sangola - 413307
          </p>
          <a href={`tel:${wholesalePhone}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">
            <Phone size={14} /> +91 {wholesalePhone}
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-[hsl(var(--background)/.15)] pt-5 text-center text-xs text-[hsl(var(--background)/.45)] sm:flex sm:justify-between">
        <span>© 2026 Shriram Automobiles. All rights reserved.</span>
        <span className="mono-font uppercase tracking-widest text-[hsl(var(--primary)/.8)]">Sangola, Maharashtra</span>
      </div>
    </footer>
  );
}

export function MobileActions() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] p-2 backdrop-blur-md md:hidden">
      <a
        href={`tel:${businessPhone}`}
        className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--secondary))] px-3 py-3 text-sm font-bold text-[hsl(var(--background))]"
      >
        <Phone size={16} />
        {t('contact.callNow', 'Call Now')}
      </a>
      <a
        href={`https://wa.me/91${businessPhone}`}
        className="flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold text-[hsl(var(--secondary))]"
      >
        <MessageSquare size={16} />
        {t('contact.whatsapp', 'WhatsApp')}
      </a>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--background))] pb-12 text-[hsl(var(--foreground))] md:pb-0">
      <BusinessNav />
      <div className="pt-20 md:pt-[4.75rem]">{children}</div>
      <BusinessFooter />
      <MobileActions />
    </div>
  );
}
