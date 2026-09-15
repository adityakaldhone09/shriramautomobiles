import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bike,
  CheckCircle2,
  Filter,
  HelpCircle,
  Info,
  Layers,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  ToolCase,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Shell, SectionKicker, inputClass, businessPhone, wholesalePhone } from '../layout/Shell';
import { useTranslation } from 'react-i18next';

export interface VehicleModelOption {
  id: number;
  brandId: number;
  brandName?: string;
  brand?: string;
  name: string;
  model?: string;
  slug: string;
  vehicleType: string;
  engineClass?: string;
}

export interface CatalogPart {
  id: number;
  sku: string;
  name: string;
  category: string;
  subCategory?: string;
  description?: string;
  brand: string;
  partType?: string;
  price: string | number;
  availability?: string;
  stockQuantity?: number;
  fitmentConfidence?: 'COMMON' | 'MODEL_SPECIFIC' | 'VARIANT_DEPENDENT' | 'VERIFY_BEFORE_ORDER';
  notes?: string;
}

const cartKey = 'shriram-cart';

export function CompatiblePartsShop() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();

  // Active Tab: 'compatible' | 'all'
  const [activeTab, setActiveTab] = useState<'compatible' | 'all'>('compatible');

  // Vehicle Models & Selected Model
  const [models, setModels] = useState<VehicleModelOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Parts state
  const [compatibleParts, setCompatibleParts] = useState<CatalogPart[]>([]);
  const [allParts, setAllParts] = useState<CatalogPart[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Cart
  const [cartCount, setCartCount] = useState(0);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  // Read cart count on mount
  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const count = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }, []);

  // 1. Fetch all vehicle models
  useEffect(() => {
    fetch('/api/vehicle-models')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setModels(json.data);
        }
      })
      .catch((err) => console.error('Failed to load vehicle models:', err));
  }, []);

  // 2. Fetch all parts catalog
  useEffect(() => {
    fetch('/api/parts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAllParts(json.data);
        }
      })
      .catch((err) => console.error('Failed to load parts catalog:', err));
  }, []);

  // Check URL search params for pre-selected vehicle
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const vId = params.get('vehicleId') || params.get('vehicleModelId');
    if (vId && !isNaN(Number(vId))) {
      setSelectedVehicleId(Number(vId));
      setActiveTab('compatible');
    }
  }, [searchParams]);

  // 3. When selected vehicle changes, fetch compatible parts
  useEffect(() => {
    if (!selectedVehicleId) {
      setCompatibleParts([]);
      return;
    }

    setLoading(true);
    fetch(`/api/parts/compatible/${selectedVehicleId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCompatibleParts(json.data);
        } else {
          setCompatibleParts([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load compatible parts:', err);
        setCompatibleParts([]);
      })
      .finally(() => setLoading(false));
  }, [selectedVehicleId]);

  // Currently selected vehicle model object
  const selectedModel = useMemo(() => {
    return models.find((m) => m.id === selectedVehicleId) || null;
  }, [models, selectedVehicleId]);

  // Brands & categories lists
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    allParts.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [allParts]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allParts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [allParts]);

  // Filtered Compatible Parts
  const displayedCompatibleParts = useMemo(() => {
    return compatibleParts.filter((part) => {
      const matchesSearch =
        !searchTerm ||
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (part.category && part.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = !selectedCategory || part.category === selectedCategory;
      const matchesBrand = !selectedBrand || part.brand === selectedBrand;
      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [compatibleParts, searchTerm, selectedCategory, selectedBrand]);

  // Set of compatible part IDs for quick lookup in All Parts tab
  const compatiblePartIdSet = useMemo(() => {
    return new Set(compatibleParts.map((p) => p.id));
  }, [compatibleParts]);

  // Filtered All Parts
  const displayedAllParts = useMemo(() => {
    return allParts.filter((part) => {
      const matchesSearch =
        !searchTerm ||
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (part.category && part.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = !selectedCategory || part.category === selectedCategory;
      const matchesBrand = !selectedBrand || part.brand === selectedBrand;
      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [allParts, searchTerm, selectedCategory, selectedBrand]);

  // Add to cart handler
  const addToCart = (part: CatalogPart) => {
    try {
      const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const existingIndex = currentCart.findIndex((line: any) => line.part?.id === part.id);
      let updated;
      if (existingIndex > -1) {
        updated = [...currentCart];
        updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
      } else {
        updated = [...currentCart, { part, quantity: 1 }];
      }
      localStorage.setItem(cartKey, JSON.stringify(updated));
      const count = updated.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
      setCartCount(count);
      setAddedMessage(
        i18n.language === 'mr'
          ? `"${part.name}" कार्टमध्ये जोडले!`
          : i18n.language === 'hi'
          ? `"${part.name}" कार्ट में जोड़ा गया!`
          : `"${part.name}" added to cart!`
      );
      setTimeout(() => setAddedMessage(null), 3000);
    } catch (e) {
      console.error('Error adding to cart:', e);
    }
  };

  // Fitment badge renderer
  const renderFitmentBadge = (confidence?: string, isExplicitlyCompatible?: boolean) => {
    if (isExplicitlyCompatible && (!confidence || confidence === 'MODEL_SPECIFIC')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          {i18n.language === 'mr' ? 'मॉडेल फिट हमी' : i18n.language === 'hi' ? 'मॉडल फिट गारंटी' : 'EXACT MODEL FIT'}
        </span>
      );
    }

    switch (confidence) {
      case 'COMMON':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 border border-green-200">
            <CheckCircle2 size={12} />
            {i18n.language === 'mr' ? 'सर्वसाधारण फिट' : i18n.language === 'hi' ? 'सामान्य फिट' : 'COMMON / UNIVERSAL FIT'}
          </span>
        );
      case 'MODEL_SPECIFIC':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
            <CheckCircle2 size={12} />
            {i18n.language === 'mr' ? 'मॉडेल स्पेसिफिक' : i18n.language === 'hi' ? 'मॉडल विशिष्ट' : 'MODEL SPECIFIC'}
          </span>
        );
      case 'VARIANT_DEPENDENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
            <ShieldAlert size={12} />
            {i18n.language === 'mr' ? 'व्हेरिएंट तपासा' : i18n.language === 'hi' ? 'वेरिएंट जांचें' : 'VARIANT DEPENDENT'}
          </span>
        );
      case 'VERIFY_BEFORE_ORDER':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
            <ShieldAlert size={12} />
            {i18n.language === 'mr' ? 'ऑर्डरपूर्वी पडताळा' : i18n.language === 'hi' ? 'ऑर्डर से पहले जांचें' : 'VERIFY BEFORE ORDERING'}
          </span>
        );
    }
  };

  // Popular quick-pick models
  const popularModels = useMemo(() => {
    const targetNames = ['Activa 6G', 'Splendor Plus', 'Pulsar 150', 'Jupiter', 'Classic 350', 'Access 125'];
    return models.filter((m) => targetNames.some((name) => (m.model || m.name).includes(name))).slice(0, 6);
  }, [models]);

  return (
    <Shell>
      <main className="page-grid mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        {/* Header Bar */}
        <div className="flex flex-col justify-between gap-6 border-b border-[hsl(var(--border))] pb-8 md:flex-row md:items-end">
          <div>
            <SectionKicker>
              {i18n.language === 'mr'
                ? 'अस्सल सुटे भाग आणि फिटमेंट'
                : i18n.language === 'hi'
                ? 'असली स्पेयर पार्ट्स और फिटमेंट'
                : 'Genuine Spare Parts & Fitment Intelligence'}
            </SectionKicker>
            <h1 className="display-font text-5xl font-bold uppercase leading-[.92] sm:text-6xl">
              {i18n.language === 'mr' ? 'सुटे भाग दुकान' : i18n.language === 'hi' ? 'स्पेयर पार्ट्स शॉप' : 'Compatible Parts Desk'}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {i18n.language === 'mr'
                ? 'तुमच्या बाईक किंवा स्कूटरचे मॉडेल निवडा आणि १००% खात्रीशीर सुटे भाग शोधा. संगोला येथील श्रीराम ऑटोमोबाईल्समध्ये वर्कशॉप फिटिंग उपलब्ध.'
                : i18n.language === 'hi'
                ? 'अपनी बाइक या स्कूटर का मॉडल चुनें और १००% फिटमेंट वाले पार्ट्स देखें। सांगोला में श्रीराम ऑटोमोबाइल्स पर वर्कशॉप फिटिंग उपलब्ध।'
                : 'Select your two-wheeler model to filter 100% verified compatible parts, or explore the entire catalog with mechanic verification guidance.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-5 py-3 text-sm font-bold text-[hsl(var(--background))] transition hover:opacity-90"
            >
              <ShoppingCart size={17} />
              <span>{t('cart.title')}</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))] px-1.5 text-xs font-bold text-[hsl(var(--secondary))]">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Toast notification for added to cart */}
        {addedMessage && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {addedMessage}
            </span>
            <Link href="/cart" className="underline hover:opacity-80">
              {i18n.language === 'mr' ? 'कार्ट पहा' : i18n.language === 'hi' ? 'कार्ट देखें' : 'View Cart'} →
            </Link>
          </div>
        )}

        {/* Vehicle Selection Hero Section */}
        <section className="mt-8 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
                <Bike size={18} />
                {i18n.language === 'mr'
                  ? 'पायरी १: वाहन मॉडेल निवडा'
                  : i18n.language === 'hi'
                  ? 'चरण १: वाहन मॉडल चुनें'
                  : 'Step 1: Select Your Vehicle Model'}
              </div>
              <h2 className="display-font mt-2 text-2xl font-bold uppercase sm:text-3xl">
                {selectedModel ? (
                  <span className="text-[hsl(var(--accent))]">
                    {selectedModel.brandName || selectedModel.brand} {selectedModel.model || selectedModel.name}
                  </span>
                ) : (
                  <span>
                    {i18n.language === 'mr'
                      ? 'कोणतीही दुचाकी निवडा'
                      : i18n.language === 'hi'
                      ? 'अपनी दोपहिया वाहन चुनें'
                      : 'Choose Your Two-Wheeler'}
                  </span>
                )}
              </h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {selectedModel
                  ? `${selectedModel.vehicleType} · ${selectedModel.engineClass || ''} · Verified fitment catalog loaded`
                  : i18n.language === 'mr'
                  ? 'हिरो, होंडा, बजाज, टीव्हीएस, यामाहा, रॉयल एनफिल्ड इत्यादी ३३ मॉडेल्समधून निवडा'
                  : i18n.language === 'hi'
                  ? 'हीरो, होंडा, बजाज, टीवीएस, यामाहा, रॉयल एनफील्ड आदि ३३ मॉडलों में से चुनें'
                  : 'Filter by any of 33 supported models (Hero, Honda, Bajaj, TVS, Yamaha, Royal Enfield, etc.)'}
              </p>
            </div>

            {/* Dropdown & Clear */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <select
                  value={selectedVehicleId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setSelectedVehicleId(id);
                    if (id) setActiveTab('compatible');
                  }}
                  className={`${inputClass} mt-0 text-sm font-semibold`}
                >
                  <option value="">
                    {i18n.language === 'mr'
                      ? '-- सर्व ३३ मॉडेल्समधून निवडा --'
                      : i18n.language === 'hi'
                      ? '-- सभी ३३ मॉडलों में से चुनें --'
                      : '-- Select Two-Wheeler Model (33 Models) --'}
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brandName || m.brand} {m.model || m.name} ({m.vehicleType})
                    </option>
                  ))}
                </select>
              </div>

              {selectedVehicleId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicleId(null);
                    setActiveTab('all');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] px-3.5 py-3 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                >
                  <X size={15} />
                  {i18n.language === 'mr' ? 'फिल्टर हटवा' : i18n.language === 'hi' ? 'हटाएं' : 'Clear Vehicle'}
                </button>
              )}
            </div>
          </div>

          {/* Quick Popular Two-Wheeler Pills */}
          <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
            <span className="mono-font block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {i18n.language === 'mr' ? 'लोकप्रिय वाहने:' : i18n.language === 'hi' ? 'लोकप्रिय गाड़ियां:' : 'Popular in Sangola:'}
            </span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {popularModels.map((m) => {
                const isSelected = selectedVehicleId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId(m.id);
                      setActiveTab('compatible');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary)/.2)]'
                    }`}
                  >
                    <Bike size={13} />
                    {m.brandName || m.brand} {m.model || m.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* View Tabs: "Guaranteed Compatible" vs "All Catalog Parts / Verify Before Ordering" */}
        <section className="mt-10">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('compatible')}
                className={`relative flex items-center gap-2 pb-4 text-base font-bold transition ${
                  activeTab === 'compatible'
                    ? 'text-[hsl(var(--accent))] border-b-2 border-[hsl(var(--accent))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <ShieldCheck size={19} />
                <span>
                  {i18n.language === 'mr'
                    ? 'योग्य / हमी असलेले भाग'
                    : i18n.language === 'hi'
                    ? 'संगत / गारंटीड पार्ट्स'
                    : 'Guaranteed Compatible Parts'}
                </span>
                {selectedVehicleId && (
                  <span className="ml-1 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-xs font-bold text-[hsl(var(--secondary))]">
                    {displayedCompatibleParts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`relative flex items-center gap-2 pb-4 text-base font-bold transition ${
                  activeTab === 'all'
                    ? 'text-[hsl(var(--accent))] border-b-2 border-[hsl(var(--accent))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Layers size={19} />
                <span>
                  {i18n.language === 'mr'
                    ? 'सर्व सुटे भाग / ऑर्डरपूर्वी पडताळा'
                    : i18n.language === 'hi'
                    ? 'सभी स्पेयर पार्ट्स / जांचें'
                    : 'All Parts / Verify Before Ordering'}
                </span>
                <span className="ml-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  {allParts.length}
                </span>
              </button>
            </div>

            {/* Quick search input */}
            <div className="flex items-center gap-3 pb-3 sm:pb-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder={
                    i18n.language === 'mr'
                      ? 'नाव किंवा SKU शोधा...'
                      : i18n.language === 'hi'
                      ? 'नाम या SKU खोजें...'
                      : 'Search name, SKU, category...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
                />
              </div>

              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 px-3 text-xs outline-none focus:border-[hsl(var(--accent))]"
              >
                <option value="">
                  {i18n.language === 'mr' ? 'सर्व श्रेणी' : i18n.language === 'hi' ? 'सभी श्रेणियां' : 'All Categories'}
                </option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Non-binding inspection disclaimer banner */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950">
            <Info size={20} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">
                {i18n.language === 'mr'
                  ? 'तपासणी व फिटमेंट सूचना: '
                  : i18n.language === 'hi'
                  ? 'निरीक्षण एवं फिटमेंट सूचना: '
                  : 'Fitment & Inspection Notice: '}
              </span>
              {i18n.language === 'mr'
                ? 'अंतिम सुटे भाग प्रत्यक्ष वाहन तपासणीनंतरच निश्चित केले जातात. श्रीराम ऑटोमोबाईल्समध्ये खरेदी केलेल्या सर्व भागांवर अस्सलपणाची हमी आणि कुशल मेकॅनिक फिटमेंट उपलब्ध आहे.'
                : i18n.language === 'hi'
                ? 'अंतिम स्पेयर पार्ट्स भौतिक वाहन निरीक्षण के बाद ही तय किए जाते हैं। श्रीराम ऑटोमोबाइल्स में खरीदे गए सभी पार्ट्स पर १००% असली वारंटी और फिटमेंट सेवा उपलब्ध है।'
                : 'Final replacement parts are verified upon physical inspection. All parts purchased from Shriram Automobiles (Miraj Road near Railway Gate, Sangola) carry genuine authenticity guarantee and optional on-site fitting.'}
            </div>
          </div>

          {/* TAB 1: GUARANTEED COMPATIBLE PARTS */}
          {activeTab === 'compatible' && (
            <div className="mt-8">
              {!selectedVehicleId ? (
                /* Prompt to select a vehicle */
                <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.2)] text-[hsl(var(--accent))]">
                    <Bike size={32} />
                  </div>
                  <h3 className="display-font mt-5 text-3xl font-bold uppercase">
                    {i18n.language === 'mr'
                      ? 'हमी असलेले भाग पाहण्यासाठी वाहन निवडा'
                      : i18n.language === 'hi'
                      ? 'संगत पार्ट्स देखने के लिए वाहन चुनें'
                      : 'Select a Vehicle to View Guaranteed Fitment'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
                    {i18n.language === 'mr'
                      ? 'तुमच्या बाईक किंवा स्कूटरचे अचूक मॉडेल निवडा. आमची प्रणाली फक्त त्या वाहनासाठी प्रमाणित असलेले भाग दाखवेल.'
                      : i18n.language === 'hi'
                      ? 'अपनी बाइक या स्कूटर का सही मॉडल चुनें। हमारा सिस्टम केवल उसी वाहन के लिए सत्यापित पार्ट्स दिखाएगा।'
                      : 'Pick your exact two-wheeler model from the dropdown above to filter guaranteed fitment parts and prevent ordering incorrect spares.'}
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    {popularModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedVehicleId(m.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--background))] hover:opacity-90"
                      >
                        <Bike size={14} />
                        {m.brandName || m.brand} {m.model || m.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />
                  ))}
                </div>
              ) : displayedCompatibleParts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-10 text-center">
                  <ToolCase className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" size={36} />
                  <p className="text-base font-bold">
                    {i18n.language === 'mr' ? 'कोणतेही सुटे भाग सापडले नाहीत' : i18n.language === 'hi' ? 'कोई पार्ट्स नहीं मिले' : 'No compatible parts matched your filter.'}
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {i18n.language === 'mr' ? 'दुसरे शब्द वापरून पहा किंवा सर्व कॅटलॉग तपासा.' : 'Try clearing filters or view the full catalog.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedCompatibleParts.map((part) => (
                    <article
                      key={part.id}
                      className="group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[hsl(var(--accent))] hover:shadow-md"
                    >
                      <div>
                        {/* Fitment badge + Brand */}
                        <div className="flex items-start justify-between gap-2">
                          {renderFitmentBadge(part.fitmentConfidence, true)}
                          <span className="mono-font text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            {part.brand || 'Genuine OEM'}
                          </span>
                        </div>

                        {/* Part Name & SKU */}
                        <h3 className="display-font mt-4 text-xl font-bold uppercase leading-tight group-hover:text-[hsl(var(--accent))]">
                          {part.name}
                        </h3>
                        <p className="mono-font mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                          SKU: {part.sku} · {part.category} {part.subCategory ? `/ ${part.subCategory}` : ''}
                        </p>

                        {/* Description / Notes */}
                        <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                          {part.notes || part.description || 'Verified manufacturer compatible replacement component.'}
                        </p>
                      </div>

                      {/* Bottom price + Actions */}
                      <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="mono-font block text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                              Price (Incl. GST)
                            </span>
                            <span className="display-font text-2xl font-bold">
                              ₹{Number(part.price).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={13} />
                            {part.availability || 'In Stock'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => addToCart(part)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--secondary))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--background))] transition hover:opacity-90"
                          >
                            <ShoppingCart size={14} />
                            {i18n.language === 'mr' ? 'कार्टमध्ये टाका' : i18n.language === 'hi' ? 'कार्ट में डालें' : 'Add to Cart'}
                          </button>

                          <Link
                            href={`/book-service?vehicleModelId=${selectedVehicleId}&partId=${part.id}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--accent))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--accent))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                          >
                            <Wrench size={14} />
                            {i18n.language === 'mr' ? 'फिटिंग बुक करा' : i18n.language === 'hi' ? 'फिटिंग बुक करें' : 'Book Fitting'}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL CATALOG PARTS / VERIFY BEFORE ORDERING */}
          {activeTab === 'all' && (
            <div className="mt-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayedAllParts.map((part) => {
                  const isCompatibleWithSelected = selectedVehicleId
                    ? compatiblePartIdSet.has(part.id)
                    : false;

                  return (
                    <article
                      key={part.id}
                      className={`group flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 ${
                        selectedVehicleId && !isCompatibleWithSelected
                          ? 'border-amber-200/80 bg-amber-50/20'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                      }`}
                    >
                      <div>
                        {/* Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          {selectedVehicleId ? (
                            isCompatibleWithSelected ? (
                              renderFitmentBadge(part.fitmentConfidence, true)
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                                <ShieldAlert size={12} />
                                {i18n.language === 'mr'
                                  ? 'पडताळणी आवश्यक'
                                  : i18n.language === 'hi'
                                  ? 'जांच आवश्यक'
                                  : 'VERIFY BEFORE ORDER'}
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                              <Info size={12} />
                              {i18n.language === 'mr' ? 'कॅटलॉग भाग' : i18n.language === 'hi' ? 'कैटलॉग पार्ट' : 'CATALOG PART'}
                            </span>
                          )}

                          <span className="mono-font text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            {part.brand || 'OEM'}
                          </span>
                        </div>

                        {/* Part Name & SKU */}
                        <h3 className="display-font mt-4 text-xl font-bold uppercase leading-tight group-hover:text-[hsl(var(--accent))]">
                          {part.name}
                        </h3>
                        <p className="mono-font mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                          SKU: {part.sku} · {part.category} {part.subCategory ? `/ ${part.subCategory}` : ''}
                        </p>

                        {/* Description */}
                        <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                          {part.description || 'Quality replacement part for two-wheelers.'}
                        </p>

                        {/* Fitment Warning if vehicle selected and not in compatible list */}
                        {selectedVehicleId && !isCompatibleWithSelected && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-tight text-amber-800">
                            <span className="font-bold">⚠️ Notice: </span>
                            {i18n.language === 'mr'
                              ? `निवडलेल्या ${selectedModel?.brandName || ''} ${selectedModel?.model || ''} साठी फिटमेंट सत्यापित नाही. खरेदीपूर्वी खात्री करा.`
                              : i18n.language === 'hi'
                              ? `चयनित ${selectedModel?.brandName || ''} ${selectedModel?.model || ''} के लिए फिटमेंट सत्यापित नहीं है। खरीदने से पहले जांचें।`
                              : `Fitment not verified for your ${selectedModel?.brandName || ''} ${selectedModel?.model || ''}. Please consult our mechanic before purchase.`}
                          </div>
                        )}
                      </div>

                      {/* Bottom price + Actions */}
                      <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="mono-font block text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                              Price (Incl. GST)
                            </span>
                            <span className="display-font text-2xl font-bold">
                              ₹{Number(part.price || 450).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={13} />
                            {part.availability || 'In Stock'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => addToCart(part)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--secondary))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--background))] transition hover:opacity-90"
                          >
                            <ShoppingCart size={14} />
                            {i18n.language === 'mr' ? 'कार्टमध्ये टाका' : i18n.language === 'hi' ? 'कार्ट में डालें' : 'Add to Cart'}
                          </button>

                          <a
                            href={`tel:${businessPhone}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted))]"
                          >
                            <Phone size={14} />
                            {i18n.language === 'mr' ? 'विचारणा करा' : i18n.language === 'hi' ? 'पूछताछ करें' : 'Enquire'}
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Wholesale Godown Callout Section */}
        <section className="mt-16 rounded-3xl bg-[hsl(var(--secondary))] p-8 text-[hsl(var(--background))] sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">
                {t('wholesale.kicker')}
              </span>
              <h2 className="display-font mt-2 text-3xl font-bold uppercase sm:text-4xl">
                {t('wholesale.title')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--background)/.7)]">
                {t('wholesale.description')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[hsl(var(--primary))]">
                  <ShieldCheck size={16} /> Genuine OEM Distributor
                </span>
                <span className="flex items-center gap-1.5 text-[hsl(var(--primary))]">
                  <ToolCase size={16} /> 33+ Two-Wheeler Brands
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={`tel:${wholesalePhone}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--secondary))] transition hover:opacity-90"
              >
                <Phone size={16} />
                {t('wholesale.callButton')}
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Shriram+Autoparts+Near+Adarsh+School+White+House+Sangola+413307"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--background)/.25)] px-5 py-3.5 text-sm font-bold text-[hsl(var(--background))] transition hover:bg-[hsl(var(--background)/.1)]"
              >
                {t('wholesale.directionsButton')}
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}
