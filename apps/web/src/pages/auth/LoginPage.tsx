import { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Shell, SectionKicker, inputClass } from '@/components/layout/Shell';

export function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const submit = async () => {
    const endpoint = register ? '/api/auth/register' : '/api/auth/login';
    const body = register
      ? { name: form.name, phone: form.identifier, email: form.email, password: form.password }
      : { identifier: form.identifier, password: form.password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || t('auth.error'));
        return;
      }
      setLocation('/account/dashboard');
    } catch {
      setMessage('Failed to authenticate. Please try again.');
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-lg px-5 py-14 lg:px-8 lg:py-20">
        <SectionKicker>{t('auth.kicker')}</SectionKicker>
        <h1 className="display-font text-6xl font-bold uppercase">
          {register ? t('auth.register') : t('auth.login')}
        </h1>
        <div className="mt-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          {register && (
            <label className="block text-sm font-bold">
              {t('auth.name')}
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                required
              />
            </label>
          )}

          <label className="mt-4 block text-sm font-bold">
            {register ? t('auth.phone') : t('auth.identifier')}
            <input
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className={inputClass}
              required
            />
          </label>

          {register && (
            <label className="mt-4 block text-sm font-bold">
              {t('auth.email')}
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
            </label>
          )}

          <label className="mt-4 block text-sm font-bold">
            {t('auth.password')}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
              required
            />
          </label>

          <button
            type="button"
            onClick={submit}
            className="mt-7 w-full rounded-lg bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))]"
          >
            {register ? t('auth.create') : t('auth.submit')}
          </button>

          {message && (
            <p className="mt-4 text-sm font-bold text-[hsl(var(--destructive))]">{message}</p>
          )}

          <button
            type="button"
            onClick={() => setRegister(!register)}
            className="mt-5 text-sm font-bold text-[hsl(var(--accent))]"
          >
            {register ? t('auth.haveAccount') : t('auth.newAccount')}
          </button>
        </div>
      </main>
    </Shell>
  );
}

export default LoginPage;
