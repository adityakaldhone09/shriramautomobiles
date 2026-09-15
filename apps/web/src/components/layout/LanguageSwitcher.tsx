import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  ];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[hsl(var(--muted))] transition-colors"
        aria-label="Language selector"
        data-testid="button-language-selector"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{languages.find(l => l.code === i18n.language)?.label || 'English'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-3 text-sm font-bold text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-[hsl(var(--muted))] ${
                i18n.language === lang.code
                  ? 'bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]'
                  : ''
              }`}
              data-testid={`button-lang-${lang.code}`}
            >
              <span className="mr-2">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
