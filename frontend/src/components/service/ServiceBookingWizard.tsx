import { useEffect, useState, useMemo } from 'react';
import { useSearch, useLocation } from 'wouter';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bike,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Info,
  Layers,
  MessageSquare,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import { Shell, SectionKicker, inputClass, businessPhone } from '../layout/Shell';
import { useTranslation } from 'react-i18next';

export interface VehicleModelItem {
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

export interface SymptomItem {
  id: number;
  symptomId: string;
  symptom: string;
  name?: string;
  slug: string;
  description?: string;
  severity?: string;
}

export interface RecommendedServiceItem {
  id: number | string;
  serviceId?: number | string;
  name: any;
  slug: string;
  description: any;
  duration: string;
  startingPrice: string | number;
  reason?: string;
}

export interface LikelyPartItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  subCategory?: string;
  partType?: string;
  price: string | number;
  stockQuantity?: number;
  availability?: string;
  fitmentConfidence: 'COMMON' | 'MODEL_SPECIFIC' | 'VARIANT_DEPENDENT' | 'VERIFY_BEFORE_ORDER';
  confidenceNote?: string;
  reasoning?: string;
  priority?: number;
}

export interface MechanicItem {
  id: number;
  name: string;
  phone: string;
  experience: number;
  specialization: string;
  languages: string;
  rating?: number;
  isAvailable?: boolean;
}

export function ServiceBookingWizard() {
  const { t, i18n } = useTranslation();
  const search = useSearch();
  const [, setLocation] = useLocation();

  // Wizard state (Step 1 to 8)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Vehicle Selection state
  const [savedVehicles, setSavedVehicles] = useState<any[]>([]);
  const [allModels, setAllModels] = useState<VehicleModelItem[]>([]);
  const [selectedSavedVehicleId, setSelectedSavedVehicleId] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState('Motorcycle');
  const [regNumber, setRegNumber] = useState('');
  const [manufactureYear, setManufactureYear] = useState('2022');
  const [currentOdo, setCurrentOdo] = useState('');

  // 2. Symptom selection state
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [selectedSymptomId, setSelectedSymptomId] = useState<number | null>(null);
  const [aiComplaintInput, setAiComplaintInput] = useState('');
  const [aiDiagnosing, setAiDiagnosing] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState<string | null>(null);

  // 3. Recommended services state
  const [recommendedServices, setRecommendedServices] = useState<RecommendedServiceItem[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Array<number | string>>([]);

  // 4. Likely parts / checks state
  const [likelyParts, setLikelyParts] = useState<LikelyPartItem[]>([]);

  // 5. Notes & upload state
  const [problemDescription, setProblemDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 6. Slots & date state
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [appointmentDate, setAppointmentDate] = useState(tomorrowStr);
  const [availableSlots, setAvailableSlots] = useState<Array<{ timeSlot: string; available: boolean; remaining?: number }>>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // 7. Mechanic state
  const [mechanics, setMechanics] = useState<MechanicItem[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState<number | null>(null);

  // 8. Contact & Confirmation state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submittedBooking, setSubmittedBooking] = useState<any | null>(null);

  // Load initial datasets
  useEffect(() => {
    // 1. Fetch vehicle models
    fetch('/api/vehicle-models')
      .then((res) => res.json())
      .then((res) => {
        if (res.data) setAllModels(res.data);
      })
      .catch(console.error);

    // 2. Fetch symptoms
    fetch('/api/service-symptoms')
      .then((res) => res.json())
      .then((res) => {
        if (res.data) setSymptoms(res.data);
      })
      .catch(console.error);

    // 3. Fetch mechanics
    fetch('/api/mechanics/available')
      .then((res) => res.json())
      .then((res) => {
        if (res.data) setMechanics(res.data);
      })
      .catch(console.error);

    // 4. Check if user is logged in & fetch customer vehicles
    fetch('/api/account/vehicles', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.data?.length) {
          setSavedVehicles(res.data);
          const first = res.data[0];
          setSelectedSavedVehicleId(first.id);
          setSelectedBrand(first.brand);
          setSelectedVehicleType(first.vehicleType);
          setRegNumber(first.registrationNumber);
          if (first.vehicleModelId) setSelectedModelId(first.vehicleModelId);
        }
      })
      .catch(() => {});

    // Check pre-fill query params e.g. from "Book Similar Service" ("Book Again")
    const searchParams = new URLSearchParams(search);
    const qModel = searchParams.get('modelId');
    const qService = searchParams.get('service');
    const qSymptom = searchParams.get('symptom');
    if (qModel) setSelectedModelId(Number(qModel));
    if (qService) setSelectedServiceIds([qService]);
    if (qSymptom) setSelectedSymptomId(Number(qSymptom));
  }, [search]);

  // Update slots whenever appointmentDate changes
  useEffect(() => {
    if (!appointmentDate) return;
    fetch(`/api/slots?date=${appointmentDate}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setAvailableSlots(res.data);
          const firstAvail = res.data.find((s: any) => s.available);
          if (firstAvail) setSelectedTimeSlot(firstAvail.timeSlot);
        }
      })
      .catch(console.error);
  }, [appointmentDate]);

  // Automatically refresh recommendations whenever vehicle or symptom changes
  useEffect(() => {
    if (!selectedModelId && !selectedSavedVehicleId && !selectedSymptomId) return;

    const queryParts = new URLSearchParams();
    if (selectedModelId) queryParts.append('vehicleModelId', String(selectedModelId));
    if (selectedSavedVehicleId) queryParts.append('vehicleId', String(selectedSavedVehicleId));
    if (selectedSymptomId) queryParts.append('symptomId', String(selectedSymptomId));
    if (problemDescription) queryParts.append('description', problemDescription);

    fetch(`/api/service-recommendations?${queryParts.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          const recSvcs = res.data.services || res.data.recommendedServices || [];
          const recParts = res.data.parts || res.data.likelyPartsChecks || [];
          setRecommendedServices(recSvcs);
          setLikelyParts(recParts);

          // Auto-select recommended services if none chosen yet
          if (selectedServiceIds.length === 0 && recSvcs.length > 0) {
            setSelectedServiceIds(recSvcs.map((s: any) => s.serviceId || s.id));
          }
        }
      })
      .catch(console.error);
  }, [selectedModelId, selectedSavedVehicleId, selectedSymptomId]);

  // Helper: Get unique brands from 33 vehicle models
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    allModels.forEach((m) => {
      const b = m.brand || m.brandName;
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [allModels]);

  // Helper: Filter models by selected brand
  const filteredModels = useMemo(() => {
    if (!selectedBrand) return allModels;
    return allModels.filter((m) => (m.brand || m.brandName)?.toLowerCase() === selectedBrand.toLowerCase());
  }, [allModels, selectedBrand]);

  // Helper: Current selected vehicle details
  const activeVehicleSummary = useMemo(() => {
    if (selectedSavedVehicleId) {
      const v = savedVehicles.find((x) => x.id === selectedSavedVehicleId);
      if (v) return `${v.brand} ${v.model} (${v.registrationNumber})`;
    }
    const m = allModels.find((x) => x.id === selectedModelId);
    if (m) {
      return `${m.brand || m.brandName || selectedBrand} ${m.name || m.model} ${regNumber ? `· ${regNumber}` : ''}`;
    }
    return selectedBrand ? `${selectedBrand} Two-Wheeler` : 'Vehicle Not Selected';
  }, [selectedSavedVehicleId, savedVehicles, selectedModelId, allModels, selectedBrand, regNumber]);

  // Run AI complaint diagnosis
  const handleAiDiagnosis = async () => {
    if (!aiComplaintInput.trim()) return;
    setAiDiagnosing(true);
    setAiDiagnosisResult(null);
    try {
      const res = await fetch('/api/ai/diagnose-symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: aiComplaintInput,
          vehicleType: selectedVehicleType,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.symptom) {
        const found = data.data.symptom;
        setSelectedSymptomId(found.id);
        setAiDiagnosisResult(data.data.reasoning || `Matched: ${found.symptom || found.name}`);
        setProblemDescription((prev) => (prev ? `${prev}\n\n[Diagnostic Note]: ${aiComplaintInput}` : aiComplaintInput));
      } else {
        setAiDiagnosisResult('General checkup recommended based on complaint.');
      }
    } catch {
      setAiDiagnosisResult('Could not run automated analysis. Please select the closest symptom below.');
    } finally {
      setAiDiagnosing(false);
    }
  };

  // Submit Final Booking to Server
  const handleConfirmBooking = async () => {
    setErrorMessage('');
    setLoading(true);

    const activeModel = allModels.find((m) => m.id === selectedModelId);
    const finalBrand = activeModel?.brand || activeModel?.brandName || selectedBrand || 'Hero';
    const finalModelName = activeModel?.name || activeModel?.model || 'Two-Wheeler';

    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      customerVehicleId: selectedSavedVehicleId || undefined,
      vehicleBrand: finalBrand,
      vehicleModel: finalModelName,
      vehicleType: activeModel?.vehicleType || selectedVehicleType,
      registrationNumber: regNumber.trim() || 'MH 13 AP 0000',
      vehicleAge: manufactureYear ? `${new Date().getFullYear() - Number(manufactureYear)} years` : '3 years',
      symptomId: selectedSymptomId || undefined,
      selectedServices: selectedServiceIds.length > 0 ? selectedServiceIds : ['srv-periodic'],
      appointmentDate,
      timeSlot: selectedTimeSlot,
      mechanicId: selectedMechanicId || undefined,
      problemDescription: problemDescription.trim() || 'Booked via intelligence wizard',
      imageUrl: imageUrl.trim() || undefined,
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setErrorMessage(result.message || 'We could not save that booking. Please verify details and retry.');
        setLoading(false);
        return;
      }
      setSubmittedBooking(result.data);
    } catch {
      setErrorMessage('Network error connecting to booking service. Please call us directly.');
    } finally {
      setLoading(false);
    }
  };

  // Confirmation View
  if (submittedBooking) {
    const bookingRef = submittedBooking.bookingNumber || submittedBooking.bookingId || 'SAB-2026';
    return (
      <Shell>
        <main className="mx-auto flex min-h-[75vh] max-w-3xl items-center px-5 py-16 lg:px-8">
          <div className="w-full rounded-3xl bg-[hsl(var(--secondary))] p-8 text-center text-[hsl(var(--background))] sm:p-14 shadow-2xl border border-[hsl(var(--primary)/.2)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--secondary))] shadow-[5px_5px_0_hsl(var(--accent))]">
              <Check size={38} strokeWidth={3} />
            </div>
            <div className="mt-8">
              <SectionKicker>Booking Confirmed · Shriram Automobiles</SectionKicker>
              <h1 className="display-font text-5xl font-bold uppercase tracking-tight text-[hsl(var(--background))] sm:text-6xl">
                Your Slot Is Booked.
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[hsl(var(--background)/.75)]">
                We have registered your service visit for{' '}
                <strong className="text-[hsl(var(--primary))]">{activeVehicleSummary}</strong> on{' '}
                <strong>{submittedBooking.appointmentDate}</strong> ({submittedBooking.timeSlot}).
              </p>
            </div>

            <div className="my-8 rounded-2xl border border-[hsl(var(--background)/.2)] bg-[hsl(var(--background)/.06)] p-6 backdrop-blur-sm">
              <span className="mono-font block text-xs uppercase tracking-widest text-[hsl(var(--background)/.6)]">
                Official Booking Reference
              </span>
              <div className="mono-font mt-2 text-3xl font-extrabold tracking-wider text-[hsl(var(--primary))] sm:text-4xl">
                {bookingRef}
              </div>
              <p className="mt-3 text-xs text-[hsl(var(--background)/.65)]">
                Keep this code handy. Our technician will inspect your vehicle and provide a digital estimate before starting.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={`https://wa.me/91${businessPhone}?text=${encodeURIComponent(
                  `Namaskar Shriram Automobiles, I have booked a service visit #${bookingRef} for my ${activeVehicleSummary} on ${submittedBooking.appointmentDate}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--secondary))] shadow-md transition-transform hover:-translate-y-0.5"
              >
                <MessageSquare size={17} /> WhatsApp Confirmation
              </a>
              <button
                type="button"
                onClick={() => setLocation('/account/dashboard')}
                className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--background)/.3)] px-6 py-3.5 text-sm font-bold text-[hsl(var(--background))] transition-colors hover:bg-[hsl(var(--background)/.1)]"
              >
                <Layers size={17} /> Go to My Garage
              </button>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  // Step names for top stepper bar
  const stepTitles = [
    'Vehicle',
    'Problem',
    'Services',
    'Likely Parts',
    'Notes',
    'Schedule',
    'Mechanic',
    'Review',
  ];

  return (
    <Shell>
      <main className="page-grid mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="mb-10 max-w-3xl">
          <SectionKicker>Shriram Automobiles · Sangola</SectionKicker>
          <h1 className="display-font text-5xl font-bold uppercase leading-[.9] tracking-tight sm:text-7xl">
            Vehicle-Aware <br />
            <span className="text-[hsl(var(--accent))]">Service Booking.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
            Deterministic diagnostics, fitment confidence ratings, and guaranteed genuine parts tailored to your two-wheeler.
          </p>
        </div>

        {/* 8-Step Horizontal Stepper Header */}
        <div className="mb-10 overflow-x-auto pb-3">
          <div className="flex min-w-[720px] items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-5">
            {stepTitles.map((title, idx) => {
              const stepNum = idx + 1;
              const isDone = step > stepNum;
              const isCurrent = step === stepNum;
              return (
                <div key={title} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (step > stepNum) setStep(stepNum);
                    }}
                    disabled={step < stepNum}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] ring-4 ring-[hsl(var(--accent)/.2)] shadow-md'
                        : isDone
                        ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--background))] hover:bg-[hsl(var(--accent))]'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {isDone ? <Check size={15} strokeWidth={2.8} /> : stepNum}
                  </button>
                  <span
                    className={`text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'text-[hsl(var(--accent))]'
                        : isDone
                        ? 'text-[hsl(var(--foreground))]'
                        : 'text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {title}
                  </span>
                  {idx < stepTitles.length - 1 && <div className="h-px flex-1 bg-[hsl(var(--border))]" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Main Wizard Form Card */}
          <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm sm:p-10">
            {/* ================= STEP 1: VEHICLE SELECTION ================= */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 1: Select Your Two-Wheeler</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Select from our verified catalog of 33 motorcycles and scooters so we configure exact parts and service specs.
                  </p>
                </div>

                {savedVehicles.length > 0 && (
                  <div className="rounded-2xl bg-[hsl(var(--muted)/.5)] p-5 border border-[hsl(var(--border))]">
                    <label className="mono-font text-xs font-bold uppercase tracking-wider text-[hsl(var(--secondary))]">
                      Saved in Your Garage
                    </label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {savedVehicles.map((v) => {
                        const isChosen = selectedSavedVehicleId === v.id;
                        return (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => {
                              setSelectedSavedVehicleId(v.id);
                              setSelectedBrand(v.brand);
                              setSelectedVehicleType(v.vehicleType);
                              setRegNumber(v.registrationNumber);
                              if (v.vehicleModelId) setSelectedModelId(v.vehicleModelId);
                            }}
                            className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all ${
                              isChosen
                                ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.15)] shadow-[3px_3px_0_hsl(var(--accent))]'
                                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                isChosen ? 'bg-[hsl(var(--accent))] text-white' : 'bg-[hsl(var(--muted))]'
                              }`}
                            >
                              <Bike size={20} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-sm">
                                {v.brand} {v.model}
                              </p>
                              <p className="mono-font text-xs text-[hsl(var(--muted-foreground))] uppercase">
                                {v.registrationNumber} · {v.vehicleType}
                              </p>
                            </div>
                            {isChosen && <Check size={18} className="text-[hsl(var(--accent))]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Brand <span className="text-[hsl(var(--accent))]">*</span>
                    </label>
                    <select
                      value={selectedBrand}
                      onChange={(e) => {
                        setSelectedBrand(e.target.value);
                        setSelectedModelId(null);
                        setSelectedSavedVehicleId(null);
                      }}
                      className={inputClass}
                      data-testid="select-wizard-brand"
                    >
                      <option value="">Select Brand</option>
                      {brandOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Model <span className="text-[hsl(var(--accent))]">*</span>
                    </label>
                    <select
                      value={selectedModelId || ''}
                      onChange={(e) => {
                        const mId = Number(e.target.value);
                        setSelectedModelId(mId);
                        setSelectedSavedVehicleId(null);
                        const item = allModels.find((m) => m.id === mId);
                        if (item) {
                          setSelectedVehicleType(item.vehicleType);
                          if (!selectedBrand) setSelectedBrand(item.brand || item.brandName || '');
                        }
                      }}
                      className={inputClass}
                      data-testid="select-wizard-model"
                    >
                      <option value="">Select Model</option>
                      {filteredModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.model} ({m.engineClass || m.vehicleType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Registration Number <span className="text-[hsl(var(--accent))]">*</span>
                    </label>
                    <input
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. MH 13 AP 1234"
                      className={`${inputClass} mono-font uppercase`}
                      data-testid="input-wizard-reg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Vehicle Type
                    </label>
                    <select
                      value={selectedVehicleType}
                      onChange={(e) => setSelectedVehicleType(e.target.value)}
                      className={inputClass}
                      data-testid="select-wizard-type"
                    >
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Scooter">Scooter</option>
                      <option value="ElectricScooter">Electric Scooter</option>
                      <option value="Moped">Moped</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2: PROBLEM / SYMPTOM SELECTION ================= */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">
                    Step 2: What Problem Are You Experiencing?
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Select a known symptom or describe it in your own words in Marathi, Hindi, or English for instant diagnostic mapping.
                  </p>
                </div>

                {/* AI / Natural Language Interpreter Box */}
                <div className="rounded-2xl border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.08)] p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--secondary))]">
                    <Sparkles size={16} className="text-[hsl(var(--accent))]" /> AI Diagnostic Assistant (मराठी / हिंदी / English)
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Example: &quot;गाडी पिकअप घेत नाही आणि स्पीड वाढताना थरथरते&quot; or &quot;brake lever feels spongy&quot;
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={aiComplaintInput}
                      onChange={(e) => setAiComplaintInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAiDiagnosis();
                      }}
                      placeholder="Type your complaint here..."
                      className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                    <button
                      type="button"
                      disabled={aiDiagnosing || !aiComplaintInput.trim()}
                      onClick={handleAiDiagnosis}
                      className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] disabled:opacity-50"
                    >
                      {aiDiagnosing ? 'Diagnosing...' : 'Analyze'}
                    </button>
                  </div>
                  {aiDiagnosisResult && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-[hsl(var(--card))] p-3 text-xs border border-[hsl(var(--border))]">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{aiDiagnosisResult}</span>
                    </div>
                  )}
                </div>

                {/* Symptom Cards Grid */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2 max-h-[380px] overflow-y-auto pr-1">
                  {symptoms.map((s) => {
                    const isSelected = selectedSymptomId === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSelectedSymptomId(s.id)}
                        className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.15)] shadow-[3px_3px_0_hsl(var(--accent))]'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isSelected ? 'bg-[hsl(var(--accent))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]'
                          }`}
                        >
                          <Wrench size={17} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-sm truncate">{s.symptom || s.name}</span>
                            {s.severity === 'HIGH' || s.severity === 'CRITICAL' ? (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-red-700">
                                Severe
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
                            {s.description || 'Inspection and resolution for two-wheeler.'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= STEP 3: RECOMMENDED SERVICES ================= */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 3: Recommended Service Packages</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Deterministically matched to your vehicle type (
                    <strong className="text-[hsl(var(--secondary))]">{activeVehicleSummary}</strong>) and reported symptom.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {recommendedServices.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                      Loading personalized service packages...
                    </div>
                  ) : (
                    recommendedServices.map((svc) => {
                      const svcId = svc.serviceId || svc.id;
                      const isChosen = selectedServiceIds.includes(svcId);
                      const svcName = typeof svc.name === 'object' ? svc.name?.en || Object.values(svc.name)[0] : svc.name;
                      const svcDesc =
                        typeof svc.description === 'object'
                          ? svc.description?.en || Object.values(svc.description)[0]
                          : svc.description;

                      return (
                        <div
                          key={svcId}
                          onClick={() => {
                            setSelectedServiceIds((prev) =>
                              prev.includes(svcId) ? prev.filter((id) => id !== svcId) : [...prev, svcId]
                            );
                          }}
                          className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                            isChosen
                              ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.12)] shadow-[3px_3px_0_hsl(var(--accent))]'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                                  isChosen ? 'bg-[hsl(var(--accent))] text-white border-[hsl(var(--accent))]' : 'border-gray-400'
                                }`}
                              >
                                {isChosen && <Check size={14} strokeWidth={3} />}
                              </span>
                              <div>
                                <h3 className="font-bold text-base">{svcName}</h3>
                                <div className="mono-font mt-1 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                                  <span className="flex items-center gap-1">
                                    <Clock3 size={13} /> {svc.duration || '60 mins'}
                                  </span>
                                  <span className="font-bold text-[hsl(var(--secondary))]">
                                    Starting at ₹{svc.startingPrice}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="rounded-full bg-[hsl(var(--primary)/.2)] px-2.5 py-1 text-[10px] font-bold uppercase text-[hsl(var(--secondary))]">
                              Recommended
                            </span>
                          </div>
                          {svcDesc && <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{svcDesc}</p>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 4: LIKELY PARTS & CHECKS ================= */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 4: Likely Parts & Checks</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Our diagnostic engine predicts likely components that our technician will examine on your two-wheeler.
                  </p>
                </div>

                {/* Non-Binding Legal Disclaimer */}
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
                  <ShieldAlert size={20} className="shrink-0 text-amber-700 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong>Transparent Workshop Policy:</strong> Final replacement parts, repair requirements, and exact pricing are
                    confirmed <strong>only after physical inspection</strong> by our mechanic. No parts will be replaced without
                    your prior approval on the official digital estimate.
                  </div>
                </div>

                <div className="space-y-3 pt-2 max-h-[380px] overflow-y-auto pr-1">
                  {likelyParts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                      Standard periodic inspection will evaluate all wear components.
                    </div>
                  ) : (
                    likelyParts.map((p) => {
                      let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                      let badgeLabel = 'Exact Model Match';
                      if (p.fitmentConfidence === 'COMMON') {
                        badgeColor = 'bg-green-100 text-green-800 border-green-200';
                        badgeLabel = 'Universal Fitment';
                      } else if (p.fitmentConfidence === 'VARIANT_DEPENDENT') {
                        badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
                        badgeLabel = 'Variant Dependent';
                      } else if (p.fitmentConfidence === 'VERIFY_BEFORE_ORDER') {
                        badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                        badgeLabel = 'Verify on Vehicle';
                      }

                      return (
                        <div key={p.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm">{p.name}</h4>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase ${badgeColor}`}>
                                  {badgeLabel}
                                </span>
                              </div>
                              <p className="mono-font text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                {p.category} · SKU: {p.sku}
                              </p>
                            </div>
                            <div className="mono-font text-right">
                              <span className="text-sm font-extrabold text-[hsl(var(--secondary))]">
                                ₹{Number(p.price).toFixed(2)}
                              </span>
                              <span className="block text-[10px] text-green-700 font-semibold">
                                {p.availability || 'In Stock'}
                              </span>
                            </div>
                          </div>
                          {p.reasoning && (
                            <p className="mt-2 text-xs italic text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border)/.6)] pt-2">
                              Diagnostic Reason: {p.reasoning}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 5: NOTES & DESCRIPTION ================= */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 5: Problem Notes & Photos</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Provide any sound, vibration behavior, or history that will help our technician diagnose faster.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Detailed Problem Description
                    </label>
                    <textarea
                      rows={5}
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      placeholder="e.g. Engine feels rough when cold. Metallic sound from right side when accelerating over 40 km/h."
                      className={`${inputClass} resize-y`}
                      data-testid="textarea-wizard-desc"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Optional Photo URL / Note
                    </label>
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image link or leave blank for physical walk-in inspection"
                      className={inputClass}
                      data-testid="input-wizard-image"
                    />
                    <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                      You can also show the issue directly to the mechanic upon arrival at the shop.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 6: DATE & TIME SLOTS ================= */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 6: Choose Appointment Slot</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Select your preferred visit date and time window. We limit slots per hour to avoid long customer wait times.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className={inputClass}
                      data-testid="input-wizard-date"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Selected Day
                    </label>
                    <div className="mt-1.5 flex h-11 items-center rounded-xl bg-[hsl(var(--muted)/.6)] px-4 text-sm font-bold text-[hsl(var(--secondary))]">
                      <CalendarDays size={16} className="mr-2 text-[hsl(var(--accent))]" />
                      {new Date(appointmentDate).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
                    Available Time Windows for {appointmentDate}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {availableSlots.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Checking slot availability...
                      </div>
                    ) : (
                      availableSlots.map((s) => {
                        const isChosen = selectedTimeSlot === s.timeSlot;
                        return (
                          <button
                            type="button"
                            key={s.timeSlot}
                            disabled={!s.available}
                            onClick={() => setSelectedTimeSlot(s.timeSlot)}
                            className={`rounded-xl border p-3.5 text-center transition-all ${
                              isChosen
                                ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.15)] shadow-[3px_3px_0_hsl(var(--accent))] font-bold'
                                : s.available
                                ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'
                                : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed text-gray-400'
                            }`}
                          >
                            <span className="block text-sm font-bold">{s.timeSlot}</span>
                            <span className="mono-font text-[10px] text-[hsl(var(--muted-foreground))]">
                              {s.available ? `${s.remaining ?? 2} slots available` : 'Fully booked'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 7: MECHANIC SELECTION ================= */}
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 7: Choose Your Technician</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Select a specialist technician for your service, or let us assign the fastest available expert.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMechanicId(null)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                      selectedMechanicId === null
                        ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.15)] shadow-[3px_3px_0_hsl(var(--accent))]'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                        <Zap size={20} />
                      </span>
                      <div>
                        <h4 className="font-bold text-sm">Any Available Technician (Fastest Turnaround)</h4>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Assigned to the first available expert matching your two-wheeler type upon arrival.
                        </p>
                      </div>
                    </div>
                    {selectedMechanicId === null && <Check size={18} className="text-[hsl(var(--accent))]" />}
                  </button>

                  {mechanics.map((m) => {
                    const isChosen = selectedMechanicId === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setSelectedMechanicId(m.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                          isChosen
                            ? 'border-[hsl(var(--accent))] bg-[hsl(var(--primary)/.15)] shadow-[3px_3px_0_hsl(var(--accent))]'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]">
                            <User size={20} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm">{m.name}</h4>
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                                {m.experience} yrs exp
                              </span>
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.specialization}</p>
                            <p className="mono-font text-[10px] text-[hsl(var(--muted-foreground))]">
                              Languages: {m.languages}
                            </p>
                          </div>
                        </div>
                        {isChosen && <Check size={18} className="text-[hsl(var(--accent))]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= STEP 8: REVIEW & CONFIRM ================= */}
            {step === 8 && (
              <div className="space-y-6">
                <div>
                  <h2 className="display-font text-3xl font-bold uppercase sm:text-4xl">Step 8: Review & Confirm Visit</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Confirm your details to generate your booking code and reserve workshop time.
                  </p>
                </div>

                {/* Summary Table */}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-5 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Vehicle:</span>
                    <strong className="text-[hsl(var(--secondary))]">{activeVehicleSummary}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Reported Issue:</span>
                    <strong>
                      {symptoms.find((s) => s.id === selectedSymptomId)?.symptom || 'General Maintenance Checkup'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Date & Slot:</span>
                    <strong>
                      {appointmentDate} · {selectedTimeSlot}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                    <span className="text-[hsl(var(--muted-foreground))]">Technician:</span>
                    <strong>{mechanics.find((m) => m.id === selectedMechanicId)?.name || 'Any Available Specialist'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Selected Services:</span>
                    <strong className="text-right max-w-[200px] truncate">
                      {selectedServiceIds.length} service package(s)
                    </strong>
                  </div>
                </div>

                {/* Contact Inputs */}
                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Full Name <span className="text-[hsl(var(--accent))]">*</span>
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kulkarni"
                      className={inputClass}
                      data-testid="input-wizard-name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Phone Number <span className="text-[hsl(var(--accent))]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98221 00000"
                      className={inputClass}
                      data-testid="input-wizard-phone"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Email (Optional for invoice)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rider@example.com"
                      className={inputClass}
                      data-testid="input-wizard-email"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-bold text-red-800 border border-red-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-[hsl(var(--border))] pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <span />
              )}

              {step < 8 ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    // Validation per step
                    if (step === 1 && !selectedModelId && !selectedSavedVehicleId && !selectedBrand) {
                      setErrorMessage('Please pick or enter your two-wheeler model.');
                      return;
                    }
                    if (step === 6 && !selectedTimeSlot) {
                      setErrorMessage('Please select a valid time slot for your appointment.');
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-6 py-3 text-sm font-bold text-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] transition-all shadow-md"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading || !fullName.trim() || !phone.trim()}
                  onClick={handleConfirmBooking}
                  className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-7 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))] shadow-lg hover:brightness-110 transition-all disabled:opacity-50"
                  data-testid="button-confirm-service-booking"
                >
                  {loading ? 'Generating Booking...' : 'Confirm & Generate Booking'} <Check size={17} strokeWidth={2.8} />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Information Card */}
          <aside className="space-y-6">
            <div className="rounded-3xl bg-[hsl(var(--secondary))] p-6 text-[hsl(var(--background))] shadow-xl border border-[hsl(var(--border)/.2)]">
              <span className="mono-font text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">
                Booking Summary
              </span>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <span className="text-[hsl(var(--background)/.55)] block">Target Two-Wheeler</span>
                  <strong className="text-sm font-bold text-[hsl(var(--background))] mt-0.5 block">
                    {activeVehicleSummary}
                  </strong>
                </div>

                {selectedSymptomId && (
                  <div className="border-t border-[hsl(var(--background)/.15)] pt-3">
                    <span className="text-[hsl(var(--background)/.55)] block">Selected Concern</span>
                    <strong className="text-sm text-[hsl(var(--primary))] block mt-0.5">
                      {symptoms.find((s) => s.id === selectedSymptomId)?.symptom || 'Inspection'}
                    </strong>
                  </div>
                )}

                {appointmentDate && (
                  <div className="border-t border-[hsl(var(--background)/.15)] pt-3">
                    <span className="text-[hsl(var(--background)/.55)] block">Visit Window</span>
                    <span className="block mt-0.5 font-bold text-[hsl(var(--background))]">
                      {appointmentDate} {selectedTimeSlot ? `· ${selectedTimeSlot}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-[hsl(var(--background)/.08)] p-4 border border-[hsl(var(--background)/.1)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]">
                  <ShieldCheck size={16} /> Shriram Guarantee
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[hsl(var(--background)/.7)]">
                  Only genuine manufacturer & OEM parts. Digital inspection and customer approval before work begins.
                </p>
              </div>

              <div className="mt-6 border-t border-[hsl(var(--background)/.15)] pt-4">
                <span className="mono-font block text-[10px] uppercase tracking-wider text-[hsl(var(--background)/.55)]">
                  Need Help?
                </span>
                <a
                  href={`tel:${businessPhone}`}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))] hover:underline"
                >
                  <Phone size={15} /> +91 {businessPhone}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </Shell>
  );
}
