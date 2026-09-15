import { useState } from 'react';
import { ArrowRight, CircleAlert, CircleCheck, Clock3, Facebook, Instagram, MapPin, MessageSquare, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateContactInquiry } from '@workspace/api-client-react';
import type { ContactInput } from '@workspace/api-client-react';
import {
  Shell,
  SectionKicker,
  businessPhone,
  inputClass,
} from '@/components/layout/Shell';
import { BusinessContactCard, WholesaleCard } from '@/pages/home/HomePage';

const initialContact: ContactInput = { name: '', phone: '', subject: '', message: '' };

export function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<ContactInput>(initialContact);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const inquiry = useCreateContactInquiry();

  const update = (key: keyof ContactInput, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const submit = () => {
    setError('');
    inquiry.mutate(
      { data: form },
      {
        onSuccess: () => setSent(true),
        onError: () => setError('Message not sent. Please call us directly and we will help.'),
      }
    );
  };

  return (
    <Shell>
      <main className="page-grid">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <SectionKicker>{t('contact.kicker')}</SectionKicker>
              <h1 className="display-font text-6xl font-bold uppercase leading-[.88]">
                Come by.<br />
                <span className="text-[hsl(var(--accent))]">Call in.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[hsl(var(--muted-foreground))]">
                {t('contact.description')}
              </p>

              <div className="mt-10 space-y-6">
                <a
                  href={`tel:${businessPhone}`}
                  data-testid="link-contact-phone"
                  className="flex items-start gap-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--secondary))]">
                    <Phone size={18} />
                  </span>
                  <span>
                    <span className="mono-font block text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
                      Call the desk
                    </span>
                    <span className="mt-1 block font-bold">+91 {businessPhone}</span>
                  </span>
                </a>

                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--secondary))]">
                    <MapPin size={18} />
                  </span>
                  <span>
                    <span className="mono-font block text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
                      Workshop address
                    </span>
                    <span className="mt-1 block font-bold">{t('business.address')}</span>
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--secondary))]">
                    <Clock3 size={18} />
                  </span>
                  <span>
                    <span className="mono-font block text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
                      Workshop hours
                    </span>
                    <span className="mt-1 block font-bold">Mon–Sat · 9:00 AM–7:30 PM</span>
                    <span className="mt-1 block text-sm text-[hsl(var(--muted-foreground))]">
                      Sunday · 10:00 AM–2:00 PM
                    </span>
                  </span>
                </div>
              </div>

              <div className="mt-12 flex gap-3">
                <a
                  href="#"
                  aria-label="Instagram"
                  data-testid="link-instagram"
                  className="rounded-lg border border-[hsl(var(--border))] p-2.5 hover:border-[hsl(var(--accent))]"
                >
                  <Instagram size={17} />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  data-testid="link-facebook"
                  className="rounded-lg border border-[hsl(var(--border))] p-2.5 hover:border-[hsl(var(--accent))]"
                >
                  <Facebook size={17} />
                </a>
              </div>
            </div>

            <div className="rounded-3xl bg-[hsl(var(--secondary))] p-6 text-[hsl(var(--background))] sm:p-9">
              <span className="mono-font text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">
                Send a message
              </span>

              {sent ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <CircleCheck size={48} className="text-[hsl(var(--primary))]" />
                  <h2 className="display-font mt-5 text-4xl font-bold uppercase">
                    Message received.
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[hsl(var(--background)/.6)]">
                    Thanks for reaching out. Someone from the shop will call you back soon.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setForm(initialContact);
                    }}
                    data-testid="button-new-contact"
                    className="mt-7 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--secondary))]"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <div className="mt-7 space-y-5">
                  <label className="block text-sm font-bold">
                    Name
                    <input
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your name"
                      className={`${inputClass} border-[hsl(var(--background)/.25)] bg-[hsl(var(--background)/.06)] text-[hsl(var(--background))]`}
                      data-testid="input-contact-name"
                    />
                  </label>

                  <label className="block text-sm font-bold">
                    Phone
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`${inputClass} border-[hsl(var(--background)/.25)] bg-[hsl(var(--background)/.06)] text-[hsl(var(--background))]`}
                      data-testid="input-contact-phone"
                    />
                  </label>

                  <label className="block text-sm font-bold">
                    What can we help with?
                    <input
                      value={form.subject}
                      onChange={(e) => update('subject', e.target.value)}
                      placeholder="Part enquiry, service question..."
                      className={`${inputClass} border-[hsl(var(--background)/.25)] bg-[hsl(var(--background)/.06)] text-[hsl(var(--background))]`}
                      data-testid="input-contact-subject"
                    />
                  </label>

                  <label className="block text-sm font-bold">
                    Message
                    <textarea
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                      placeholder="Tell us what is going on."
                      className={`${inputClass} min-h-32 resize-y border-[hsl(var(--background)/.25)] bg-[hsl(var(--background)/.06)] text-[hsl(var(--background))]`}
                      data-testid="textarea-contact-message"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={
                      inquiry.isPending || !form.name || !form.phone || !form.subject || !form.message
                    }
                    onClick={submit}
                    data-testid="button-submit-contact"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-bold text-[hsl(var(--secondary))] disabled:opacity-40"
                  >
                    {inquiry.isPending ? 'Sending…' : 'Send message'} <ArrowRight size={16} />
                  </button>
                  {error && (
                    <p className="flex items-center gap-2 text-sm text-[hsl(var(--primary))]" data-testid="status-contact-error">
                      <CircleAlert size={16} />
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <BusinessContactCard />
            <BusinessContactCard wholesale />
          </div>

          <WholesaleCard compact />

          <div className="mt-10 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="display-font text-3xl font-bold uppercase">{t('contact.mapTitle')}</h2>
              <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {t('business.address')}
              </p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Shriram+Automobiles+Miraj+Road+Near+Railway+Gate+Sangola+413307"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--secondary))] px-4 py-3 text-sm font-bold text-[hsl(var(--background))]"
              >
                <MapPin size={16} />
                {t('contact.getDirections')}
              </a>
            </div>
            <div className="rounded-2xl bg-[hsl(var(--secondary))] p-7 text-[hsl(var(--background))]">
              <SectionKicker>{t('contact.inquiryKicker')}</SectionKicker>
              <p className="text-lg font-bold">{t('contact.inquiryText')}</p>
              <a
                href={`https://wa.me/91${businessPhone}`}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--secondary))]"
              >
                <MessageSquare size={16} />
                {t('contact.whatsapp')}
              </a>
            </div>
          </div>
        </div>
      </main>
    </Shell>
  );
}

export default ContactPage;
