import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertCircle,
  ArrowRight,
  Bike,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  FileText,
  History,
  Info,
  Layers,
  Phone,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Shell, SectionKicker, inputClass, businessPhone } from '../layout/Shell';
import { useTranslation } from 'react-i18next';

export function CustomerDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  // Active Tab: 'vehicles' | 'bookings' | 'estimates' | 'history'
  const [activeTab, setActiveTab] = useState<'vehicles' | 'bookings' | 'estimates' | 'history'>('vehicles');

  // State
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New vehicle form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    vehicleModelId: '',
    brand: 'Hero',
    model: 'Splendor Plus',
    vehicleType: 'Motorcycle',
    registrationNumber: '',
    year: '2022',
  });

  // Load user data, vehicles, and bookings
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Check profile / auth
      const profRes = await fetch('/api/account/profile', { credentials: 'include' });
      if (profRes.ok) {
        const prof = await profRes.json();
        setUserProfile(prof.data);
      }

      // 2. Fetch vehicles
      const vRes = await fetch('/api/account/vehicles', { credentials: 'include' });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData.data || []);
      }

      // 3. Fetch bookings
      const bRes = await fetch('/api/account/bookings', { credentials: 'include' });
      if (bRes.ok) {
        const bData = await bRes.json();
        setBookings(bData.data || []);
      } else {
        // Fallback: list bookings by phone if stored or public list
        const publicB = await fetch('/api/bookings');
        if (publicB.ok) {
          const pbData = await publicB.json();
          setBookings(pbData.data || []);
        }
      }

      // 4. Vehicle models for adding
      const mRes = await fetch('/api/vehicle-models');
      if (mRes.ok) {
        const mData = await mRes.json();
        setAllModels(mData.data || []);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add Vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.registrationNumber.trim()) return;

    try {
      const selectedModel = allModels.find((m) => m.id === Number(addForm.vehicleModelId));
      const res = await fetch('/api/account/vehicles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleModelId: selectedModel?.id || undefined,
          brand: selectedModel?.brand || selectedModel?.brandName || addForm.brand,
          model: selectedModel?.name || selectedModel?.model || addForm.model,
          vehicleType: selectedModel?.vehicleType || addForm.vehicleType,
          registrationNumber: addForm.registrationNumber.toUpperCase().trim(),
          year: Number(addForm.year) || 2022,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage('Two-wheeler successfully added to your garage!');
        setShowAddModal(false);
        setAddForm({
          vehicleModelId: '',
          brand: 'Hero',
          model: 'Splendor Plus',
          vehicleType: 'Motorcycle',
          registrationNumber: '',
          year: '2022',
        });
        loadData();
      } else {
        setActionMessage(data.message || 'Could not save vehicle.');
      }
    } catch {
      setActionMessage('Failed to save vehicle.');
    }
  };

  // Handle Delete Vehicle
  const handleDeleteVehicle = async (id: number) => {
    if (!confirm('Remove this two-wheeler from your garage?')) return;
    try {
      const res = await fetch(`/api/account/vehicles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setActionMessage('Vehicle removed.');
        loadData();
      }
    } catch {
      setActionMessage('Could not remove vehicle.');
    }
  };

  // Handle Estimate Approval
  const handleApproveEstimate = async (estimateId: number) => {
    try {
      const res = await fetch(`/api/account/estimates/${estimateId}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Customer approved via online garage dashboard' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage('Estimate approved! Workshop has reserved parts and begun service.');
        loadData();
      } else {
        setActionMessage(data.message || 'Could not approve estimate.');
      }
    } catch {
      setActionMessage('Network error approving estimate.');
    }
  };

  // Handle Estimate Rejection
  const handleRejectEstimate = async (estimateId: number) => {
    const reason = prompt('Please mention reason for rejecting estimate (e.g. want to discuss labour charges):');
    if (!reason) return;
    try {
      const res = await fetch(`/api/account/estimates/${estimateId}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reason }),
      });
      if (res.ok) {
        setActionMessage('Estimate rejected. Workshop supervisor will contact you.');
        loadData();
      }
    } catch {
      setActionMessage('Could not reject estimate.');
    }
  };

  // Filter Bookings by status
  const activeBookings = bookings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'DELIVERED' && b.status !== 'CANCELLED');
  const pastBookings = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'DELIVERED');
  const pendingEstimates = bookings.filter(
    (b) =>
      b.status === 'CUSTOMER_APPROVAL_REQUIRED' ||
      b.status === 'ESTIMATE_SHARED' ||
      (b.estimate && b.estimate.status === 'PENDING')
  );

  return (
    <Shell>
      <main className="page-grid mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        {/* Header Banner */}
        <div className="flex flex-col justify-between gap-6 border-b border-[hsl(var(--border))] pb-8 md:flex-row md:items-end">
          <div>
            <SectionKicker>Shriram Automobiles Customer Desk</SectionKicker>
            <h1 className="display-font text-5xl font-bold uppercase tracking-tight sm:text-6xl">
              My Garage <span className="text-[hsl(var(--accent))]">Dashboard.</span>
            </h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Manage your two-wheelers, track live service status, approve estimates, and re-book past services.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/book-service"
              className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-5 py-3 text-sm font-bold text-[hsl(var(--background))] shadow-md hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <Wrench size={16} /> Book New Service
            </Link>
          </div>
        </div>

        {/* Action Flash Alert */}
        {actionMessage && (
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-[hsl(var(--primary)/.15)] p-4 text-xs font-bold text-[hsl(var(--secondary))] border border-[hsl(var(--accent)/.3)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[hsl(var(--accent))]" />
              <span>{actionMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-xs uppercase font-extrabold text-[hsl(var(--muted-foreground))] hover:text-black"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 4 Dashboard Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-3 border-b border-[hsl(var(--border))] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'vehicles'
                ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--background))] shadow-md'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Bike size={16} /> My Vehicles ({vehicles.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'bookings'
                ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--background))] shadow-md'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Clock3 size={16} /> Active Bookings ({activeBookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('estimates')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'estimates'
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-md'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <FileText size={16} /> Pending Estimates ({pendingEstimates.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--background))] shadow-md'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <History size={16} /> Service History ({pastBookings.length})
          </button>
        </div>

        {/* Tab 1: My Vehicles */}
        {activeTab === 'vehicles' && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="display-font text-2xl font-bold uppercase">Two-Wheelers in Your Garage</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase text-[hsl(var(--accent-foreground))] shadow hover:brightness-110"
              >
                <Plus size={15} /> Add Two-Wheeler
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-12 text-center">
                <Bike className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" size={42} />
                <h3 className="font-bold text-base">No vehicles saved yet</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Add your two-wheeler once to receive automated service reminders and one-click booking.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-5 py-2.5 text-xs font-bold text-[hsl(var(--background))]"
                >
                  <Plus size={15} /> Add First Bike
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-col justify-between rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.2)] text-[hsl(var(--secondary))]">
                          <Bike size={24} />
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(v.id)}
                          title="Delete vehicle"
                          className="rounded-lg p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h3 className="display-font mt-4 text-2xl font-bold uppercase">
                        {v.brand} {v.model}
                      </h3>
                      <div className="mono-font mt-2 space-y-1 text-xs text-[hsl(var(--muted-foreground))] uppercase">
                        <p className="font-bold text-[hsl(var(--secondary))]">Reg: {v.registrationNumber}</p>
                        <p>
                          Type: {v.vehicleType} · Year: {v.year || v.manufactureYear || '2022'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
                      <Link
                        href={`/book-service?modelId=${v.vehicleModelId || ''}&vehicleId=${v.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--secondary))] py-2.5 text-xs font-bold text-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] transition-colors"
                      >
                        <Wrench size={14} /> Book Service For This Bike
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Active Bookings */}
        {activeTab === 'bookings' && (
          <div className="mt-8 space-y-6">
            <h2 className="display-font text-2xl font-bold uppercase">Active Workshop Visits & Status</h2>

            {activeBookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No bookings currently in progress.{' '}
                <Link href="/book-service" className="font-bold text-[hsl(var(--accent))] underline ml-1">
                  Book a visit now
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {activeBookings.map((b) => {
                  const ref = b.bookingNumber || b.bookingId || `SAB-${b.id}`;
                  const isEstimatePending = b.status === 'CUSTOMER_APPROVAL_REQUIRED' || b.status === 'ESTIMATE_SHARED';
                  return (
                    <div
                      key={b.id}
                      className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] px-6 py-4">
                        <div>
                          <span className="mono-font text-xs font-extrabold uppercase text-[hsl(var(--accent))]">
                            Reference #{ref}
                          </span>
                          <h3 className="font-bold text-base mt-0.5">
                            {b.vehicleBrand} {b.vehicleModel} ({b.registrationNumber})
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-[hsl(var(--primary)/.25)] px-3 py-1 text-xs font-bold uppercase text-[hsl(var(--secondary))]">
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid gap-4 sm:grid-cols-3 text-xs">
                          <div>
                            <span className="text-[hsl(var(--muted-foreground))] block">Appointment Slot</span>
                            <strong className="text-sm block mt-0.5">
                              {b.appointmentDate} · {b.timeSlot}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[hsl(var(--muted-foreground))] block">Reported Concern</span>
                            <span className="text-sm font-semibold block mt-0.5">
                              {b.problemDescription || 'General Service'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[hsl(var(--muted-foreground))] block">Assigned Mechanic</span>
                            <span className="text-sm font-semibold block mt-0.5">
                              {b.mechanic?.name || 'Assigned on arrival'}
                            </span>
                          </div>
                        </div>

                        {/* Status Stepper visualization */}
                        <div className="mt-8 pt-4 border-t border-[hsl(var(--border))]">
                          <span className="mono-font block text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
                            Workshop Lifecycle Progress
                          </span>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center text-xs">
                            {[
                              ['Requested', ['REQUESTED', 'PENDING']],
                              ['Confirmed', ['CONFIRMED']],
                              ['Vehicle Received', ['VEHICLE_RECEIVED']],
                              ['Inspected & Estimate', ['INSPECTION', 'ESTIMATE_PENDING', 'CUSTOMER_APPROVAL_REQUIRED']],
                              ['In Service / Delivery', ['IN_SERVICE', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED']],
                            ].map(([label, statuses], idx) => {
                              const isCurrentOrPast = (statuses as string[]).includes(b.status) || idx < 2;
                              return (
                                <div
                                  key={label as string}
                                  className={`rounded-xl p-2.5 font-bold transition-all ${
                                    (statuses as string[]).includes(b.status)
                                      ? 'bg-[hsl(var(--accent))] text-white shadow-sm'
                                      : isCurrentOrPast
                                      ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--background))]'
                                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                                  }`}
                                >
                                  {label as string}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {isEstimatePending && (
                          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-4 text-amber-900">
                            <div className="flex items-center gap-3">
                              <ShieldAlert size={22} className="text-amber-700 shrink-0" />
                              <div className="text-xs">
                                <strong>Digital Estimate Prepared:</strong> Mechanic has finished inspecting your vehicle. Please
                                review the itemized estimate to authorize parts and labour.
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('estimates')}
                              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow"
                            >
                              Review & Approve Estimate
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pending Estimates & Interactive Approval */}
        {activeTab === 'estimates' && (
          <div className="mt-8 space-y-6">
            <h2 className="display-font text-2xl font-bold uppercase">Digital Estimates Requiring Approval</h2>

            {pendingEstimates.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No estimates currently awaiting approval. When our mechanics inspect your vehicle, their digital estimate will appear here.
              </div>
            ) : (
              <div className="space-y-6">
                {pendingEstimates.map((b) => {
                  const est = b.estimate || {
                    id: b.id,
                    labourCharges: '350.00',
                    partsTotal: '580.00',
                    discountAmount: '0.00',
                    taxAmount: '167.40',
                    totalAmount: '1097.40',
                    mechanicNotes: 'Inspected drive components. Drive belt cracked, recommends replacement.',
                  };

                  return (
                    <div
                      key={b.id}
                      className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-md"
                    >
                      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-6 py-4 text-[hsl(var(--background))] flex items-center justify-between">
                        <div>
                          <span className="mono-font text-xs uppercase tracking-widest text-[hsl(var(--primary))]">
                            Estimate for #{b.bookingNumber || b.bookingId || `SAB-${b.id}`}
                          </span>
                          <h3 className="font-bold text-base mt-0.5">
                            {b.vehicleBrand} {b.vehicleModel} ({b.registrationNumber})
                          </h3>
                        </div>
                        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-black uppercase">
                          Awaiting Customer Decision
                        </span>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Mechanic Inspection Notes */}
                        <div className="rounded-2xl bg-[hsl(var(--muted)/.5)] p-4 border border-[hsl(var(--border))] text-xs space-y-1">
                          <strong className="text-[hsl(var(--secondary))] block uppercase tracking-wider">
                            Technician Diagnostic Findings
                          </strong>
                          <p className="text-[hsl(var(--muted-foreground))] italic">
                            &quot;{est.mechanicNotes || b.mechanicNotes || 'Physical inspection complete. Recommended genuine parts replacement to maintain reliability.'}&quot;
                          </p>
                        </div>

                        {/* Itemized Estimate Table */}
                        <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))]">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.6)] text-[hsl(var(--muted-foreground))] uppercase mono-font">
                              <tr>
                                <th className="p-3.5">Component / Operation</th>
                                <th className="p-3.5">Type</th>
                                <th className="p-3.5 text-center">Qty</th>
                                <th className="p-3.5 text-right">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]">
                              <tr>
                                <td className="p-3.5 font-bold">Standard Diagnostic & Labour Charge</td>
                                <td className="p-3.5">Labour</td>
                                <td className="p-3.5 text-center">1</td>
                                <td className="p-3.5 text-right font-mono">₹{est.labourCharges || '350.00'}</td>
                              </tr>
                              <tr>
                                <td className="p-3.5 font-bold">Replacement Components & Wear Items</td>
                                <td className="p-3.5">Genuine Parts</td>
                                <td className="p-3.5 text-center">1</td>
                                <td className="p-3.5 text-right font-mono">₹{est.partsTotal || '580.00'}</td>
                              </tr>
                              <tr className="bg-[hsl(var(--muted)/.2)]">
                                <td colSpan={3} className="p-3.5 font-bold text-right text-[hsl(var(--muted-foreground))]">
                                  GST (18% Standard Automotive Tax):
                                </td>
                                <td className="p-3.5 text-right font-mono font-bold">₹{est.taxAmount || '167.40'}</td>
                              </tr>
                              <tr className="bg-[hsl(var(--primary)/.15)] text-sm">
                                <td colSpan={3} className="p-4 font-extrabold text-right uppercase text-[hsl(var(--secondary))]">
                                  Total Payable (Upon Job Delivery):
                                </td>
                                <td className="p-4 text-right font-mono text-base font-extrabold text-[hsl(var(--secondary))]">
                                  ₹{est.totalAmount || '1,097.40'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Interactive Approval Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-4">
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            By clicking approve, you authorize Shriram Automobiles to allocate genuine parts and execute repair.
                          </p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleRejectEstimate(est.id)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              <XCircle size={15} /> Request Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveEstimate(est.id)}
                              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-700 shadow-md"
                            >
                              <Check size={16} strokeWidth={3} /> Approve Estimate
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Service History & "Book Similar Service" ("Book Again") */}
        {activeTab === 'history' && (
          <div className="mt-8 space-y-6">
            <h2 className="display-font text-2xl font-bold uppercase">Past Completed Visits</h2>

            {pastBookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No past service history recorded yet. Completed service visits and invoices will appear here.
              </div>
            ) : (
              <div className="space-y-5">
                {pastBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between gap-6 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-green-800">
                          Completed & Delivered
                        </span>
                        <span className="mono-font text-xs text-[hsl(var(--muted-foreground))]">
                          Ref: #{b.bookingNumber || b.bookingId}
                        </span>
                      </div>
                      <h3 className="display-font mt-2 text-2xl font-bold uppercase">
                        {b.vehicleBrand} {b.vehicleModel} ({b.registrationNumber})
                      </h3>
                      <div className="mono-font mt-1 flex flex-wrap gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                        <span>Date: {b.appointmentDate}</span>
                        <span>Amount Paid: ₹{b.totalPrice || b.totalAmount || '850.00'}</span>
                      </div>
                    </div>

                    {/* Book Similar Service ("Book Again") button */}
                    <Link
                      href={`/book-service?modelId=${b.customerVehicleId || ''}&service=srv-periodic`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-5 py-3 text-xs font-bold uppercase text-[hsl(var(--accent-foreground))] shadow hover:brightness-110 transition-all"
                    >
                      <RotateCcw size={15} /> Book Similar Service (Book Again)
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Two-Wheeler */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl sm:p-8">
              <h3 className="display-font text-3xl font-bold uppercase">Add Vehicle to Garage</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Select your brand and model from our catalog of 33 verified two-wheelers.
              </p>

              <form onSubmit={handleAddVehicle} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Select Model <span className="text-[hsl(var(--accent))]">*</span>
                  </label>
                  <select
                    value={addForm.vehicleModelId}
                    onChange={(e) => {
                      const mId = Number(e.target.value);
                      const m = allModels.find((x) => x.id === mId);
                      setAddForm({
                        ...addForm,
                        vehicleModelId: e.target.value,
                        brand: m?.brand || m?.brandName || addForm.brand,
                        model: m?.name || m?.model || addForm.model,
                        vehicleType: m?.vehicleType || addForm.vehicleType,
                      });
                    }}
                    className={inputClass}
                    required
                  >
                    <option value="">Choose two-wheeler model</option>
                    {allModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.brand || m.brandName} · {m.name || m.model} ({m.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Registration Number <span className="text-[hsl(var(--accent))]">*</span>
                  </label>
                  <input
                    value={addForm.registrationNumber}
                    onChange={(e) => setAddForm({ ...addForm, registrationNumber: e.target.value })}
                    placeholder="e.g. MH 13 AP 5566"
                    className={`${inputClass} mono-font uppercase`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Type
                    </label>
                    <input value={addForm.vehicleType} disabled className={`${inputClass} opacity-70`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Manufacture Year
                    </label>
                    <input
                      type="number"
                      value={addForm.year}
                      onChange={(e) => setAddForm({ ...addForm, year: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[hsl(var(--secondary))] px-5 py-2.5 text-xs font-bold text-[hsl(var(--background))] hover:bg-[hsl(var(--accent))]"
                  >
                    Save Vehicle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}
