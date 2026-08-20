import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { ArrowRight, MapPin, Phone, Mail, Facebook, Instagram, Twitter, MessageSquare } from 'lucide-react';

export function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <div>
            <h1 className="display-font text-5xl font-bold uppercase mb-8">{t('contact.title')}</h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] mb-8">{t('contact.description')}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" htmlFor="name">
                  {t('contact.name')}
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.18)]"
                  placeholder={t('contact.name')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" htmlFor="email">
                  {t('contact.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.18)]"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" htmlFor="phone">
                  {t('contact.phone')}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.18)]"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" htmlFor="subject">
                  {t('contact.subject')}
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.18)]"
                  placeholder={t('contact.subject')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" htmlFor="message">
                  {t('contact.message')}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.18)]"
                  placeholder={t('contact.message')}
                />
              </div>

              {submitStatus === 'success' && (
                <div className="rounded-lg bg-[hsl(var(--accent)/.1)] p-4 text-[hsl(var(--accent))]">
                  {t('messages.contactSuccess')}
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="rounded-lg bg-red-100 p-4 text-red-600">
                  {t('errors.bookingFailed')}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[hsl(var(--accent))] px-6 py-3 font-bold text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? t('common.loading') : t('contact.sendMessage')}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="rounded-2xl border border-[hsl(var(--border))] p-8">
              <h2 className="display-font text-3xl font-bold uppercase mb-8">{t('contact.contactInfo')}</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Phone size={20} className="text-[hsl(var(--accent))]" />
                    <span className="font-bold">{t('contact.phone')}</span>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] ml-8">+91 98765 43210</p>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <MessageSquare size={20} className="text-[hsl(var(--accent))]" />
                    <span className="font-bold">{t('contact.whatsapp')}</span>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] ml-8">+91 98765 43210</p>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Mail size={20} className="text-[hsl(var(--accent))]" />
                    <span className="font-bold">{t('contact.email')}</span>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] ml-8">info@shriramautomobiles.com</p>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin size={20} className="text-[hsl(var(--accent))]" />
                    <span className="font-bold">{t('contact.address')}</span>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] ml-8">
                    12, Station Road<br />
                    Shriram Nagar<br />
                    Maharashtra, India - 412020
                  </p>
                </div>

                <div>
                  <h3 className="font-bold mb-3">{t('contact.workingHours')}</h3>
                  <div className="text-[hsl(var(--muted-foreground))] ml-0 space-y-1">
                    <p>Monday - Saturday: 9:00 AM - 7:30 PM</p>
                    <p>Sunday: 10:00 AM - 2:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="rounded-2xl bg-[hsl(var(--secondary))] p-8 text-[hsl(var(--background))]">
              <h3 className="display-font text-2xl font-bold uppercase mb-6">{t('footer.followUs')}</h3>
              <div className="flex gap-4">
                <a href="#" className="hover:opacity-75 transition-opacity">
                  <Facebook size={24} />
                </a>
                <a href="#" className="hover:opacity-75 transition-opacity">
                  <Instagram size={24} />
                </a>
                <a href="#" className="hover:opacity-75 transition-opacity">
                  <Twitter size={24} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
export default ContactPage;
