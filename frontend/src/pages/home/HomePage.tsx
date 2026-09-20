import { Link } from 'wouter';
import { ArrowRight, Bike, CalendarDays, MapPin, Phone, ShieldCheck, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Shell,
  SectionKicker,
  businessPhone,
  wholesalePhone,
} from '@/components/layout/Shell';

const vehicleBrandKeys = [
  'hero', 'bajaj', 'tvs', 'honda', 'yamaha', 'suzuki',
  'royalEnfield', 'ktm', 'jawa', 'yezdi', 'bsa', 'mahindra', 'vida', 'chetak', 'iqube',
];

const componentBrandKeys = [
  'minda', 'unoMinda', 'rolon', 'rane', 'rico', 'bosch', 'fiem', 'lumax',
  'varroc', 'flash', 'mrf', 'ceat', 'tvsEurogrip', 'apollo', 'jkTyre',
  'brembo', 'bybre', 'kbx', 'exide', 'amaron', 'mann', 'purolator',
  'elofic', 'castrol', 'motul', 'gulf', 'servo',
];

const partsCategoryKeys = [
  'engine', 'electrical', 'braking', 'tyres', 'batteries',
  'filters', 'lubricants', 'chains', 'lighting', 'suspension', 'accessories',
];

export function BrandShowcase() {
  const { t } = useTranslation();
  return (
    <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-5 py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionKicker>{t('brands.kicker')}</SectionKicker>
        <h2 className="display-font max-w-2xl text-5xl font-bold uppercase leading-[.9]">
          {t('brands.title')}
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {t('brands.description')}
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <div className="col-span-2 rounded-2xl bg-[hsl(var(--secondary))] p-5 text-[hsl(var(--background))] sm:col-span-1">
            <span className="mono-font text-[9px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">
              {t('brands.vehicleLabel')}
            </span>
            <p className="mt-3 text-sm font-bold">{t('brands.vehicleDescription')}</p>
          </div>
          {vehicleBrandKeys.map((key) => (
            <div
              key={key}
              className="brand-tile rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-sm font-bold"
            >
              {t(`brands.vehicle.${key}`)}
            </div>
          ))}
        </div>
        <div className="mt-16 grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <SectionKicker>{t('brands.componentsKicker')}</SectionKicker>
            <h3 className="display-font text-4xl font-bold uppercase leading-[.9]">
              {t('brands.componentsTitle')}
            </h3>
            <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {t('brands.componentsDescription')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {componentBrandKeys.map((key) => (
              <div
                key={key}
                className="brand-tile rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-4 text-center text-xs font-bold"
              >
                {t(`brands.components.${key}`)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WholesaleCard({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <section className={`wholesale-band ${compact ? 'px-6 py-8' : 'px-5 py-20 lg:px-8 lg:py-24'}`}>
      <div className={`mx-auto max-w-7xl ${compact ? '' : 'grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center'}`}>
        <div>
          <SectionKicker>{t('wholesale.kicker')}</SectionKicker>
          <h2 className="display-font text-5xl font-bold uppercase leading-[.9]">
            {t('wholesale.title')}
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {t('wholesale.description')}
          </p>
        </div>
        <div className="mt-8 rounded-2xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--card))] p-6 lg:mt-0">
          <p className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">
            {t('wholesale.godownLabel')}
          </p>
          <h3 className="display-font mt-3 text-3xl font-bold uppercase">
            {t('wholesale.godownName')}
          </h3>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{t('wholesale.address')}</p>
          <a href={`tel:${wholesalePhone}`} className="mt-4 inline-flex items-center gap-2 font-bold">
            <Phone size={16} /> {wholesalePhone}
          </a>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`tel:${wholesalePhone}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))]"
            >
              <Phone size={15} />
              {t('wholesale.callButton')}
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Shriram+Autoparts+Near+Adarsh+School+White+House+Sangola+413307"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--secondary))] px-4 py-3 text-sm font-bold"
            >
              <MapPin size={15} />
              {t('wholesale.directionsButton')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PartsCategories() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
      <div className="max-w-2xl">
        <SectionKicker>{t('parts.kicker')}</SectionKicker>
        <h2 className="display-font text-5xl font-bold uppercase leading-[.9]">
          {t('parts.title')}
        </h2>
        <p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {t('parts.description')}
        </p>
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {partsCategoryKeys.map((key) => (
          <div key={key} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.25)]">
              <Wrench size={19} />
            </div>
            <h3 className="mt-5 font-bold">{t(`parts.categories.${key}`)}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BusinessContactCard({ wholesale = false }: { wholesale?: boolean }) {
  const { t } = useTranslation();
  const phone = wholesale ? wholesalePhone : businessPhone;
  return (
    <div
      className={`rounded-2xl border p-6 ${
        wholesale
          ? 'border-[hsl(var(--accent)/.45)] bg-[hsl(var(--primary)/.12)]'
          : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
      }`}
    >
      <span className="mono-font text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">
        {t(wholesale ? 'contact.wholesaleGodown' : 'contact.retailShop')}
      </span>
      <h2 className="display-font mt-3 text-3xl font-bold uppercase">
        {t(wholesale ? 'wholesale.godownName' : 'business.shopName')}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        {t(wholesale ? 'wholesale.address' : 'business.address')}
      </p>
      <a href={`tel:${phone}`} className="mt-4 inline-flex items-center gap-2 font-bold">
        <Phone size={16} /> {phone}
      </a>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`tel:${phone}`}
          className="rounded-lg bg-[hsl(var(--secondary))] px-4 py-3 text-sm font-bold text-[hsl(var(--background))]"
        >
          {t(wholesale ? 'wholesale.callButton' : 'contact.callNow')}
        </a>
        {!wholesale && (
          <Link
            href="/book-service"
            className="rounded-lg border border-[hsl(var(--secondary))] px-4 py-3 text-sm font-bold"
          >
            {t('contact.bookService')}
          </Link>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            t(wholesale ? 'wholesale.address' : 'business.address')
          )}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold"
        >
          {t('contact.getDirections')}
        </a>
      </div>
    </div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  return (
    <Shell>
      <main>
        <section className="page-grid border-b border-[hsl(var(--border))] px-5 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionKicker>{t('hero.trust')}</SectionKicker>
            <h1 className="display-font max-w-5xl text-6xl font-bold uppercase leading-[.88] sm:text-8xl">
              {t('hero.title')}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-7 text-[hsl(var(--muted-foreground))]">
              {t('hero.subtitle')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="flex items-center gap-3 rounded-xl bg-[hsl(var(--accent))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--accent-foreground))]"
              >
                {t('hero.exploreParts')} <ArrowRight size={17} />
              </Link>
              <Link
                href="/book-service"
                className="flex items-center gap-3 rounded-xl border border-[hsl(var(--secondary))] px-5 py-3.5 text-sm font-bold"
              >
                {t('hero.bookService')} <CalendarDays size={17} />
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm font-bold">
              <span className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-[hsl(var(--accent))]" />
                {t('hero.trust')}
              </span>
              <span className="flex items-center gap-2">
                <Bike size={17} className="text-[hsl(var(--accent))]" />
                {t('hero.retailWholesale')}
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <SectionKicker>{t('business.kicker')}</SectionKicker>
              <h2 className="display-font text-5xl font-bold uppercase leading-[.9]">
                {t('business.partsTitle')}
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {t('business.description')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {partsCategoryKeys.map((key) => (
                <div
                  key={key}
                  className="rounded-xl bg-[hsl(var(--secondary))] p-4 text-sm font-bold text-[hsl(var(--background))]"
                >
                  {t(`parts.categories.${key}`)}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="parts">
          <PartsCategories />
        </div>

        <BrandShowcase />

        <WholesaleCard />

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-5 md:grid-cols-2">
            <BusinessContactCard />
            <BusinessContactCard wholesale />
          </div>
        </section>

        <section className="bg-[hsl(var(--secondary))] px-5 py-14 text-center text-[hsl(var(--background))] lg:px-8">
          <h2 className="display-font text-4xl font-bold uppercase">{t('booking.ctaTitle')}</h2>
          <Link
            href="/book-service"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--secondary))]"
          >
            {t('hero.bookService')} <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </Shell>
  );
}

export default HomePage;
