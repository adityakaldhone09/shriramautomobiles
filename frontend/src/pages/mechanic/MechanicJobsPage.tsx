import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bike,
  Plus,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  Package,
} from 'lucide-react';
import { Shell, SectionKicker } from '@/components/layout/Shell';
import { mechanicApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function MechanicJobsPage() {
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [activeJobCard, setActiveJobCard] = useState<any | null>(null);

  // Job card creation form state
  const [odometer, setOdometer] = useState('15000');
  const [fuelLevel, setFuelLevel] = useState('HALF');

  // Spare part entry state
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');

  // Work performed state
  const [workPerformed, setWorkPerformed] = useState('');
  const [labourCharges, setLabourCharges] = useState('150');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const jobsQuery = useQuery({
    queryKey: ['mechanic-my-jobs'],
    queryFn: () => mechanicApi.getMyJobs(),
  });

  const jobCardQuery = useQuery({
    queryKey: ['mechanic-job-card', expandedBookingId],
    queryFn: () => (expandedBookingId ? mechanicApi.getJobCard(expandedBookingId) : null),
    enabled: !!expandedBookingId,
  });

  // Mutations
  const createJobCardMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: any }) =>
      mechanicApi.createJobCard(bookingId, data),
    onSuccess: (data) => {
      toast({ title: 'Vehicle Checked In', description: 'Job card and 10-point inspection generated.' });
      queryClient.invalidateQueries({ queryKey: ['mechanic-my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['mechanic-job-card', expandedBookingId] });
      setActiveJobCard(data);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to generate job card', variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ bookingId, status, notes }: { bookingId: number; status: string; notes?: string }) =>
      mechanicApi.updateStatus(bookingId, status, notes),
    onSuccess: () => {
      toast({ title: 'Status Advanced', description: 'Service workflow state updated.' });
      queryClient.invalidateQueries({ queryKey: ['mechanic-my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['mechanic-job-card', expandedBookingId] });
    },
    onError: (err: any) => {
      toast({ title: 'Transition Blocked', description: err.message || 'Invalid state transition', variant: 'destructive' });
    },
  });

  const recordInspectionMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: any }) =>
      mechanicApi.recordInspection(bookingId, data),
    onSuccess: () => {
      toast({ title: 'Inspection Updated', description: 'Checklist condition recorded.' });
      queryClient.invalidateQueries({ queryKey: ['mechanic-job-card', expandedBookingId] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const addPartMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: any }) =>
      mechanicApi.addJobCardPart(bookingId, data),
    onSuccess: () => {
      toast({ title: 'Part Logged', description: 'Spare part logged on job card.' });
      setPartName('');
      setPartPrice('');
      queryClient.invalidateQueries({ queryKey: ['mechanic-job-card', expandedBookingId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic-my-jobs'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const updateJobCardMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: any }) =>
      mechanicApi.updateJobCard(bookingId, data),
    onSuccess: () => {
      toast({ title: 'Job Card Saved', description: 'Work details & charges recorded.' });
      queryClient.invalidateQueries({ queryKey: ['mechanic-job-card', expandedBookingId] });
      queryClient.invalidateQueries({ queryKey: ['mechanic-my-jobs'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const jobs = jobsQuery.data || [];
  const activeJob = jobs.find((j: any) => j.id === expandedBookingId);
  const currentJobCard = jobCardQuery.data || activeJob?.jobCard;

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionKicker>Workshop Floor • Service Bay #1 & #2</SectionKicker>
            <h1 className="display-font text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Technician <span className="text-[hsl(var(--accent))]">Bay</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-500">
              <Activity size={14} /> {jobs.length} Assigned Jobs
            </span>
            <button
              onClick={() => queryClient.invalidateQueries()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]"
            >
              <RefreshCw size={13} /> Sync
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="mt-8 space-y-6">
          {jobsQuery.isLoading ? (
            <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))] animate-pulse">
              Loading assigned vehicle jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center">
              <Wrench className="mx-auto text-[hsl(var(--muted-foreground))]" size={36} />
              <p className="mt-3 text-sm font-bold">No Active Jobs Assigned</p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                You currently have no motorcycles or scooters assigned in the workshop bay.
              </p>
            </div>
          ) : (
            jobs.map((job: any) => {
              const isExpanded = expandedBookingId === job.id;
              return (
                <div
                  key={job.id}
                  className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs transition"
                >
                  {/* Job Card Summary Row */}
                  <div
                    onClick={() => setExpandedBookingId(isExpanded ? null : job.id)}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-[hsl(var(--muted)/.3)]"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="rounded-xl bg-[hsl(var(--primary)/.15)] p-2.5 text-[hsl(var(--secondary))]">
                        <Bike size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[hsl(var(--accent))]">
                            {job.registrationNumber || 'MH-REG'}
                          </span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">•</span>
                          <span className="font-bold text-sm">
                            {job.vehicleBrand} {job.vehicleModel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          Customer: <span className="font-semibold text-[hsl(var(--foreground))]">{job.customerName}</span> ({job.customerPhone})
                        </p>
                        <p className="mt-0.5 text-xs text-[hsl(var(--foreground))] font-medium">
                          Issue: {job.problemDescription || 'General servicing'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-[hsl(var(--border))] pt-3 sm:border-0 sm:pt-0">
                      <div className="text-right">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            job.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-500'
                              : job.status === 'CONFIRMED'
                              ? 'bg-blue-500/15 text-blue-500'
                              : job.status === 'CHECKED_IN'
                              ? 'bg-indigo-500/15 text-indigo-500'
                              : job.status === 'IN_PROGRESS'
                              ? 'bg-purple-500/15 text-purple-500'
                              : job.status === 'QUALITY_CHECK'
                              ? 'bg-yellow-500/15 text-yellow-500'
                              : job.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-gray-500/15 text-gray-500'
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="block pt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                          {job.timeSlot}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded Interactive Job Card Section */}
                  {isExpanded && (
                    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] p-5 space-y-6">
                      {!job.jobCard && !currentJobCard ? (
                        /* Step 1: Check In & Create Job Card */
                        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
                          <FileText className="mx-auto text-[hsl(var(--accent))]" size={32} />
                          <h3 className="mt-2 text-sm font-bold uppercase tracking-wider">
                            Vehicle Awaiting Floor Check-In
                          </h3>
                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
                            Inspect odometer and fuel level to generate official Job Card and 10-point checklist.
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                            <input
                              type="number"
                              value={odometer}
                              onChange={(e) => setOdometer(e.target.value)}
                              placeholder="Odometer (km)"
                              className="w-36 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-mono outline-none"
                            />
                            <select
                              value={fuelLevel}
                              onChange={(e) => setFuelLevel(e.target.value)}
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs outline-none"
                            >
                              <option value="RESERVE">Reserve</option>
                              <option value="QUARTER">1/4 Tank</option>
                              <option value="HALF">1/2 Tank</option>
                              <option value="THREE_QUARTERS">3/4 Tank</option>
                              <option value="FULL">Full Tank</option>
                            </select>
                            <button
                              disabled={createJobCardMutation.isPending}
                              onClick={() =>
                                createJobCardMutation.mutate({
                                  bookingId: job.id,
                                  data: {
                                    odometerReading: Number(odometer),
                                    fuelLevel,
                                    customerComplaints: job.problemDescription,
                                  },
                                })
                              }
                              className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                            >
                              Generate Job Card
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Active Job Card Controls */
                        <div className="space-y-6">
                          {/* Top Info Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[hsl(var(--card))] p-4 border border-[hsl(var(--border))]">
                            <div>
                              <span className="mono-font text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                Job Card #
                              </span>
                              <p className="font-mono text-sm font-bold text-[hsl(var(--accent))]">
                                {currentJobCard?.jobNumber}
                              </p>
                            </div>
                            <div>
                              <span className="mono-font text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                Odometer
                              </span>
                              <p className="font-mono text-sm font-bold">
                                {currentJobCard?.odometerReading || '—'} km
                              </p>
                            </div>
                            <div>
                              <span className="mono-font text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                Fuel Level
                              </span>
                              <p className="text-xs font-semibold">{currentJobCard?.fuelLevel}</p>
                            </div>
                            <div>
                              <span className="mono-font text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                                Est. Total
                              </span>
                              <p className="font-mono text-sm font-bold text-emerald-500">
                                ₹{currentJobCard?.totalAmount || '0.00'}
                              </p>
                            </div>
                          </div>

                          {/* 10-Point Inspection Checklist */}
                          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))] flex items-center gap-1.5">
                              <CheckCircle2 size={15} /> 10-Point Workshop Inspection Checklist
                            </h4>
                            <div className="mt-3 divide-y divide-[hsl(var(--border))]">
                              {(currentJobCard?.inspections || []).map((insp: any) => (
                                <div key={insp.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2 text-xs">
                                  <span className="font-semibold">{insp.item}</span>
                                  <div className="flex items-center gap-1.5">
                                    {(['OK', 'ATTENTION_NEEDED', 'CRITICAL', 'REPLACED'] as const).map((cond) => (
                                      <button
                                        key={cond}
                                        onClick={() =>
                                          recordInspectionMutation.mutate({
                                            bookingId: job.id,
                                            data: { item: insp.item, condition: cond },
                                          })
                                        }
                                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                                          insp.condition === cond
                                            ? cond === 'OK'
                                              ? 'bg-emerald-500 text-white'
                                              : cond === 'ATTENTION_NEEDED'
                                              ? 'bg-amber-500 text-white'
                                              : cond === 'CRITICAL'
                                              ? 'bg-red-500 text-white'
                                              : 'bg-blue-500 text-white'
                                            : 'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]'
                                        }`}
                                      >
                                        {cond === 'ATTENTION_NEEDED' ? 'Check' : cond}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Spare Parts Consumed Logger */}
                          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))] flex items-center gap-1.5">
                                <Package size={15} /> Consumed Spare Parts
                              </h4>
                              <span className="font-mono text-xs font-bold">
                                Parts Total: ₹{currentJobCard?.partsTotal || '0.00'}
                              </span>
                            </div>

                            {/* Added Parts List */}
                            <div className="mt-3 space-y-1.5">
                              {(currentJobCard?.parts || []).map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted)/.4)] px-3 py-1.5 text-xs">
                                  <span>{p.partName} (x{p.quantity})</span>
                                  <span className="font-mono font-bold">₹{p.totalPrice}</span>
                                </div>
                              ))}
                            </div>

                            {/* Add Part Form */}
                            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-[hsl(var(--border))]">
                              <input
                                type="text"
                                placeholder="Part Name (e.g. 10W-30 Oil, Brake Shoe)"
                                value={partName}
                                onChange={(e) => setPartName(e.target.value)}
                                className="flex-1 min-w-[200px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs outline-none"
                              />
                              <input
                                type="number"
                                placeholder="Qty"
                                value={partQty}
                                onChange={(e) => setPartQty(e.target.value)}
                                className="w-16 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs outline-none"
                              />
                              <input
                                type="number"
                                placeholder="Price ₹"
                                value={partPrice}
                                onChange={(e) => setPartPrice(e.target.value)}
                                className="w-24 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs outline-none"
                              />
                              <button
                                disabled={!partName || !partPrice || addPartMutation.isPending}
                                onClick={() =>
                                  addPartMutation.mutate({
                                    bookingId: job.id,
                                    data: {
                                      partName,
                                      quantity: Number(partQty),
                                      unitPrice: Number(partPrice),
                                    },
                                  })
                                }
                                className="rounded-lg bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-40"
                              >
                                + Add Part
                              </button>
                            </div>
                          </div>

                          {/* Work Performed & Labour Charges */}
                          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
                              Service Notes & Labour
                            </h4>
                            <textarea
                              rows={2}
                              value={workPerformed}
                              onChange={(e) => setWorkPerformed(e.target.value)}
                              placeholder="Describe work completed (e.g. Engine oil replaced, carburetor tuned, chain cleaned & lubricated)..."
                              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs outline-none"
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">Labour Charges ₹:</span>
                                <input
                                  type="number"
                                  value={labourCharges}
                                  onChange={(e) => setLabourCharges(e.target.value)}
                                  className="w-24 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1 text-xs outline-none font-mono"
                                />
                              </div>
                              <button
                                onClick={() =>
                                  updateJobCardMutation.mutate({
                                    bookingId: job.id,
                                    data: {
                                      workPerformed,
                                      labourCharges: Number(labourCharges),
                                    },
                                  })
                                }
                                className="rounded-lg border border-[hsl(var(--border))] px-3 py-1 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                              >
                                Save Work Notes
                              </button>
                            </div>
                          </div>

                          {/* Fast Lifecycle Status Progression Action Buttons */}
                          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
                              Advance Workflow State
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {job.status === 'CHECKED_IN' && (
                                <button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      bookingId: job.id,
                                      status: 'IN_PROGRESS',
                                      notes: 'Vehicle disassembled on service lift; mechanic started repairs',
                                    })
                                  }
                                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-purple-700"
                                >
                                  ▶ Start Work (IN_PROGRESS)
                                </button>
                              )}

                              {job.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      bookingId: job.id,
                                      status: 'QUALITY_CHECK',
                                      notes: 'Repairs finished; vehicle submitted for quality road test',
                                    })
                                  }
                                  className="rounded-xl bg-yellow-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-yellow-700"
                                >
                                  🔍 Send to Quality Check
                                </button>
                              )}

                              {job.status === 'QUALITY_CHECK' && (
                                <button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      bookingId: job.id,
                                      status: 'COMPLETED',
                                      notes: 'Final quality check passed; vehicle cleaned and ready for delivery',
                                    })
                                  }
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700"
                                >
                                  ✓ Mark Completed
                                </button>
                              )}

                              {job.status === 'COMPLETED' && (
                                <button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      bookingId: job.id,
                                      status: 'DELIVERED',
                                      notes: 'Payment settled and vehicle keys handed to customer',
                                    })
                                  }
                                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700"
                                >
                                  🚀 Mark Delivered to Customer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </Shell>
  );
}

export default MechanicJobsPage;

