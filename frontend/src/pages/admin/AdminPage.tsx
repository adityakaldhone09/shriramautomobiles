import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Bike,
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Shell, SectionKicker } from '@/components/layout/Shell';
import { adminApi, bookingsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'customers' | 'vehicles' | 'inventory' | 'mechanics'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [assigningBooking, setAssigningBooking] = useState<any | null>(null);

  // New customer form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // New vehicle form state
  const [vehCustId, setVehCustId] = useState('');
  const [vehBrand, setVehBrand] = useState('Hero');
  const [vehModel, setVehModel] = useState('');
  const [vehReg, setVehReg] = useState('');
  const [vehType, setVehType] = useState('Motorcycle');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getOverview(),
  });

  const bookingsQuery = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => bookingsApi.getAll(),
  });

  const customersQuery = useQuery({
    queryKey: ['admin-customers', searchQuery],
    queryFn: () => adminApi.getCustomers(searchQuery),
  });

  const vehiclesQuery = useQuery({
    queryKey: ['admin-vehicles', searchQuery],
    queryFn: () => adminApi.getVehicles(searchQuery),
  });

  const inventoryQuery = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => adminApi.getInventory(),
  });

  const mechanicsQuery = useQuery({
    queryKey: ['admin-mechanics'],
    queryFn: () => adminApi.getMechanics(),
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; email: string }) => adminApi.createCustomer(data),
    onSuccess: () => {
      toast({ title: 'Customer added', description: 'New customer profile created successfully.' });
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to create customer', variant: 'destructive' });
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => adminApi.createVehicle(data),
    onSuccess: () => {
      toast({ title: 'Vehicle registered', description: 'Customer vehicle added to registry.' });
      setShowAddVehicleModal(false);
      setVehModel('');
      setVehReg('');
      queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to register vehicle', variant: 'destructive' });
    },
  });

  const assignMechanicMutation = useMutation({
    mutationFn: ({ bookingId, mechanicId }: { bookingId: number; mechanicId: number }) =>
      adminApi.assignMechanic(bookingId, mechanicId),
    onSuccess: () => {
      toast({ title: 'Mechanic Assigned', description: 'Booking has been assigned successfully.' });
      setAssigningBooking(null);
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mechanics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: any) => {
      toast({ title: 'Assignment Failed', description: err.message || 'Could not assign mechanic', variant: 'destructive' });
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: number; status: string }) =>
      adminApi.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      toast({ title: 'Status Updated', description: 'Service booking status updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: any) => {
      toast({ title: 'Update Failed', description: err.message || 'Could not update status', variant: 'destructive' });
    },
  });

  const kpis = overviewQuery.data?.kpis || {
    totalCustomers: 0,
    totalVehicles: 0,
    totalBookings: 0,
    pendingBookings: 0,
    inProgressBookings: 0,
    completedBookings: 0,
    activeMechanics: 0,
    totalSpareParts: 0,
    lowStockCount: 0,
    totalOrders: 0,
    totalOrderRevenue: '0.00',
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: `Bookings (${kpis.pendingBookings})`, icon: CalendarClock },
    { id: 'customers', label: `Customers (${kpis.totalCustomers})`, icon: Users },
    { id: 'vehicles', label: `Vehicles (${kpis.totalVehicles})`, icon: Bike },
    { id: 'inventory', label: `Inventory (${kpis.totalSpareParts})`, icon: Package },
    { id: 'mechanics', label: `Mechanics (${kpis.activeMechanics})`, icon: Wrench },
  ];

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <SectionKicker>Sangola Workshop & Wholesale Godown</SectionKicker>
            <h1 className="display-font text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Operations <span className="text-[hsl(var(--accent))]">Hub</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600">
              <ShieldCheck size={14} /> Super Admin Active
            </span>
            <button
              onClick={() => {
                queryClient.invalidateQueries();
                toast({ title: 'Refreshed', description: 'Synchronized with latest workshop data.' });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              <RefreshCw size={13} /> Refresh Sync
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex overflow-x-auto border-b border-[hsl(var(--border))] pb-px">
          <div className="flex gap-2">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="mt-8 space-y-8">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Customers</span>
                  <Users size={16} />
                </div>
                <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">{kpis.totalCustomers}</p>
                <span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">Registered riders</span>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Vehicles</span>
                  <Bike size={16} />
                </div>
                <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">{kpis.totalVehicles}</p>
                <span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">Garage records</span>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Bookings</span>
                  <CalendarClock size={16} />
                </div>
                <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">{kpis.totalBookings}</p>
                <span className="mt-1 block text-[11px] font-semibold text-amber-500">{kpis.pendingBookings} pending</span>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Mechanics</span>
                  <Wrench size={16} />
                </div>
                <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">{kpis.activeMechanics}</p>
                <span className="mt-1 block text-[11px] text-emerald-500">Active on floor</span>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Parts</span>
                  <Package size={16} />
                </div>
                <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">{kpis.totalSpareParts}</p>
                <span className="mt-1 block text-[11px] font-semibold text-red-500">{kpis.lowStockCount} low stock</span>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Revenue</span>
                  <ShoppingBag size={16} />
                </div>
                <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">₹{kpis.totalOrderRevenue}</p>
                <span className="mt-1 block text-[11px] text-[hsl(var(--muted-foreground))]">{kpis.totalOrders} paid orders</span>
              </div>
            </div>

            {/* Split Grid: Recent Bookings & Critical Low Stock */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Recent Bookings */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="text-[hsl(var(--accent))]" size={20} />
                    <h2 className="text-base font-bold uppercase tracking-wider">Recent Service Requests</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--accent))] hover:underline"
                  >
                    View All <ChevronRight size={14} />
                  </button>
                </div>

                <div className="mt-4 divide-y divide-[hsl(var(--border))]">
                  {(overviewQuery.data?.recentBookings || []).length === 0 ? (
                    <p className="py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No recent service bookings.</p>
                  ) : (
                    (overviewQuery.data?.recentBookings || []).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between py-3.5">
                        <div>
                          <p className="text-sm font-bold">{b.fullName || 'Customer'}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {b.vehicleBrand} {b.vehicleModel} • {b.timeSlot}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              b.status === 'PENDING'
                                ? 'bg-amber-500/15 text-amber-500'
                                : b.status === 'CONFIRMED'
                                ? 'bg-blue-500/15 text-blue-500'
                                : b.status === 'COMPLETED'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-gray-500/15 text-gray-500'
                            }`}
                          >
                            {b.status}
                          </span>
                          <span className="block pt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                            {b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Critical Low Stock Alerts */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={20} />
                    <h2 className="text-base font-bold uppercase tracking-wider">Critical Inventory Alerts</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--accent))] hover:underline"
                  >
                    View Spares <ChevronRight size={14} />
                  </button>
                </div>

                <div className="mt-4 divide-y divide-[hsl(var(--border))]">
                  {(overviewQuery.data?.lowStockPreview || []).length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="mx-auto text-emerald-500" size={28} />
                      <p className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                        All spare parts are currently above minimum threshold.
                      </p>
                    </div>
                  ) : (
                    (overviewQuery.data?.lowStockPreview || []).map((part: any) => (
                      <div key={part.id} className="flex items-center justify-between py-3.5">
                        <div>
                          <p className="text-sm font-bold">{part.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            SKU: {part.sku} • {part.brand}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-500">
                            {part.stockQuantity} left (Min: {part.lowStockThreshold})
                          </span>
                          <span className="block pt-1 text-[11px] font-bold">₹{part.price}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS DESK */}
        {activeTab === 'bookings' && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Booking #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Appointment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Mechanic</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(bookingsQuery.data || []).map((booking: any) => (
                      <tr key={booking.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">{booking.bookingNumber || `BK-${booking.id}`}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold">{booking.fullName}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{booking.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">{booking.vehicleBrand} {booking.vehicleModel}</div>
                          <div className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{booking.registrationNumber}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold">{booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString() : '—'}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{booking.timeSlot}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              booking.status === 'PENDING'
                                ? 'bg-amber-500/15 text-amber-500'
                                : booking.status === 'CONFIRMED'
                                ? 'bg-blue-500/15 text-blue-500'
                                : booking.status === 'COMPLETED'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-gray-500/15 text-gray-500'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium">
                          {booking.assignedMechanicId ? (
                            <span className="text-emerald-500 font-semibold">Assigned (#{booking.assignedMechanicId})</span>
                          ) : (
                            <span className="text-[hsl(var(--muted-foreground))]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.status === 'PENDING' && (
                              <button
                                onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: 'CONFIRMED' })}
                                className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => setAssigningBooking(booking)}
                              className="rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                            >
                              Assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMERS DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} />
                <input
                  type="text"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--accent))]"
                />
              </div>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90"
              >
                <Plus size={15} /> Add Customer
              </button>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Customer ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Vehicles</th>
                      <th className="py-3 px-4">Bookings</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(customersQuery.data || []).map((cust: any) => (
                      <tr key={cust.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">#{cust.id}</td>
                        <td className="py-3.5 px-4 font-bold">{cust.name}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[hsl(var(--muted-foreground))]">{cust.phone}</td>
                        <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">{cust.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-500">
                            {cust.totalVehicles || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-500">
                            {cust.totalBookings || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={async () => {
                              const detail = await adminApi.getCustomerById(cust.id);
                              setSelectedCustomer(detail);
                            }}
                            className="rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VEHICLES REGISTRY */}
        {activeTab === 'vehicles' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} />
                <input
                  type="text"
                  placeholder="Search by brand, model, plate #, owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--accent))]"
                />
              </div>
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90"
              >
                <Plus size={15} /> Register Vehicle
              </button>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Registration #</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Brand & Model</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Year / Color</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(vehiclesQuery.data || []).map((veh: any) => (
                      <tr key={veh.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-[hsl(var(--accent))]">
                          {veh.registrationNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">{veh.customerName || 'Direct Garage'}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{veh.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          {veh.brand} {veh.model}
                        </td>
                        <td className="py-3.5 px-4 text-xs">{veh.vehicleType}</td>
                        <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                          {veh.manufactureYear || '—'} {veh.color ? `• ${veh.color}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INVENTORY & STOCK */}
        {activeTab === 'inventory' && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Part Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Brand</th>
                      <th className="py-3 px-4">Stock Level</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(inventoryQuery.data || []).map((part: any) => {
                      const isLowStock = part.stockQuantity <= part.lowStockThreshold;
                      return (
                        <tr key={part.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                          <td className="py-3.5 px-4 font-mono font-bold text-xs">{part.sku}</td>
                          <td className="py-3.5 px-4 font-semibold">{part.name}</td>
                          <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">{part.category}</td>
                          <td className="py-3.5 px-4 text-xs">{part.brand}</td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            {part.stockQuantity}{' '}
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">
                              (Min: {part.lowStockThreshold})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold">₹{part.price}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                isLowStock
                                  ? 'bg-red-500/15 text-red-500'
                                  : 'bg-emerald-500/15 text-emerald-500'
                              }`}
                            >
                              {isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MECHANICS */}
        {activeTab === 'mechanics' && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(mechanicsQuery.data || []).map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{m.name}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.phone || 'Workshop floor'}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      m.isAvailable ? 'bg-emerald-500/15 text-emerald-500' : 'bg-gray-500/15 text-gray-500'
                    }`}
                  >
                    {m.isAvailable ? 'Available' : 'Busy'}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <p>
                    <span className="text-[hsl(var(--muted-foreground))]">Specialization:</span>{' '}
                    <span className="font-semibold">{m.specialization}</span>
                  </p>
                  <p>
                    <span className="text-[hsl(var(--muted-foreground))]">Experience:</span>{' '}
                    <span className="font-semibold">{m.experience} years</span>
                  </p>
                  <p>
                    <span className="text-[hsl(var(--muted-foreground))]">Active Workload:</span>{' '}
                    <span className="font-bold text-[hsl(var(--accent))]">{m.activeWorkload || 0} jobs</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: Add Customer */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Add New Customer</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Register a counter walk-in or phone inquiry client.
              </p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="e.g. ramesh@example.com"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]"
                >
                  Cancel
                </button>
                <button
                  disabled={createCustomerMutation.isPending}
                  onClick={() =>
                    createCustomerMutation.mutate({
                      name: newCustName,
                      phone: newCustPhone,
                      email: newCustEmail,
                    })
                  }
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Register Vehicle */}
        {showAddVehicleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Register Customer Vehicle</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Associate a motorcycle or scooter with a customer record.
              </p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Customer ID
                  </label>
                  <input
                    type="number"
                    value={vehCustId}
                    onChange={(e) => setVehCustId(e.target.value)}
                    placeholder="Customer ID (e.g. 1)"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={vehBrand}
                    onChange={(e) => setVehBrand(e.target.value)}
                    placeholder="e.g. Hero, Honda, Bajaj"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Model
                  </label>
                  <input
                    type="text"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    placeholder="e.g. Splendor Plus, Activa 6G"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Registration Plate #
                  </label>
                  <input
                    type="text"
                    value={vehReg}
                    onChange={(e) => setVehReg(e.target.value)}
                    placeholder="e.g. MH10AB1234"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowAddVehicleModal(false)}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]"
                >
                  Cancel
                </button>
                <button
                  disabled={createVehicleMutation.isPending}
                  onClick={() =>
                    createVehicleMutation.mutate({
                      customerId: Number(vehCustId),
                      brand: vehBrand,
                      model: vehModel,
                      registrationNumber: vehReg,
                      vehicleType: vehType,
                    })
                  }
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {createVehicleMutation.isPending ? 'Registering...' : 'Register Vehicle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Assign Mechanic */}
        {assigningBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Assign Workshop Mechanic</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Assign technician to booking {assigningBooking.bookingNumber || `#${assigningBooking.id}`} (
                {assigningBooking.fullName})
              </p>

              <div className="mt-5 space-y-2">
                {(mechanicsQuery.data || []).map((m: any) => (
                  <button
                    key={m.id}
                    disabled={!m.isAvailable}
                    onClick={() =>
                      assignMechanicMutation.mutate({
                        bookingId: assigningBooking.id,
                        mechanicId: m.id,
                      })
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-[hsl(var(--border))] p-3 text-left transition hover:border-[hsl(var(--accent))] disabled:opacity-40"
                  >
                    <div>
                      <div className="font-bold text-sm">{m.name}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {m.specialization} • Workload: {m.activeWorkload || 0}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[hsl(var(--accent))]">Assign →</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setAssigningBooking(null)}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Customer Details */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <h3 className="text-lg font-bold">{selectedCustomer.customer?.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    ID #{selectedCustomer.customer?.id} • {selectedCustomer.customer?.phone}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
                    Registered Vehicles ({selectedCustomer.vehicles?.length || 0})
                  </h4>
                  <div className="mt-2 space-y-2">
                    {(selectedCustomer.vehicles || []).map((v: any) => (
                      <div key={v.id} className="rounded-xl border border-[hsl(var(--border))] p-3 text-xs">
                        <div className="font-bold text-sm">{v.brand} {v.model}</div>
                        <div className="font-mono text-[hsl(var(--accent))]">{v.registrationNumber}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
                    Service History ({selectedCustomer.bookings?.length || 0})
                  </h4>
                  <div className="mt-2 space-y-2">
                    {(selectedCustomer.bookings || []).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] p-3 text-xs">
                        <div>
                          <div className="font-bold">{b.bookingNumber || `BK-${b.id}`}</div>
                          <div className="text-[hsl(var(--muted-foreground))]">{b.timeSlot}</div>
                        </div>
                        <span className="font-bold">{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}

export default AdminPage;
