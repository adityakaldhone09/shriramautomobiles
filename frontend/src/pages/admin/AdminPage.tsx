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
  Truck,
  Receipt,
  FileText,
  Printer,
  History,
  BarChart3,
  TrendingUp,
  Download,
  Activity,
  Flame,
  Sparkles,
  Bot,
  Send,
  BrainCircuit,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Shell, SectionKicker } from '@/components/layout/Shell';
import { adminApi, bookingsApi, inventoryApi, suppliersApi, purchaseOrdersApi, invoicesApi, aiApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'assistant' | 'bookings' | 'customers' | 'vehicles' | 'inventory' | 'mechanics' | 'suppliers' | 'invoices'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [assigningBooking, setAssigningBooking] = useState<any | null>(null);

  // Stock Adjustment & Movements Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPart, setAdjustPart] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('ADJUSTMENT');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  // Supplier state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supTerms, setSupTerms] = useState('NET_30');

  // Purchase Order state
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poPartId, setPoPartId] = useState('');
  const [poQty, setPoQty] = useState('10');
  const [poCost, setPoCost] = useState('250');
  const [poNotes, setPoNotes] = useState('');

  // Invoices & Billing state
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false);
  const [saleCustName, setSaleCustName] = useState('');
  const [saleCustPhone, setSaleCustPhone] = useState('');
  const [salePartId, setSalePartId] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [saleMethod, setSaleMethod] = useState('CASH');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');

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

  // AI Business Assistant & HelmetML vision state
  const [assistantMessages, setAssistantMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; tools?: any[]; timestamp: string }>>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'नमस्कार! I am the Shriram Automobiles AI Business Assistant. Ask me anything about workshop revenue, inventory stock, pending jobs, technician workloads, or upcoming procurement.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [visionVehicleType, setVisionVehicleType] = useState('Motorcycle');
  const [visionResult, setVisionResult] = useState<any | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSendAssistant = async (customPrompt?: string) => {
    const q = (customPrompt || assistantInput).trim();
    if (!q || assistantLoading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user' as const,
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };
    setAssistantMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setAssistantInput('');
    setAssistantLoading(true);

    try {
      const res = await aiApi.askAssistant(q);
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant' as const,
        text: res.data?.response || 'I was unable to retrieve that information.',
        tools: res.data?.executedTools || [],
        timestamp: new Date().toLocaleTimeString(),
      };
      setAssistantMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast({
        title: 'Assistant Error',
        description: err.message || 'Could not query assistant',
        variant: 'destructive',
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleTestHelmetVision = async () => {
    setVisionLoading(true);
    try {
      const res = await aiApi.classifyHelmet({
        vehicleType: visionVehicleType,
        lightingCondition: 'DAYLIGHT',
      });
      setVisionResult(res.data);
      toast({
        title: 'Helmet Vision Analyzed',
        description: `Detected: ${res.data.helmet_type} (${res.data.wearing_status})`,
      });
    } catch (err: any) {
      toast({
        title: 'Vision Classification Failed',
        description: err.message || 'Error executing vision model',
        variant: 'destructive',
      });
    } finally {
      setVisionLoading(false);
    }
  };

  // Queries
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getOverview(),
  });

  const analyticsSummaryQuery = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: () => adminApi.getAnalyticsSummary(),
  });

  const analyticsTrendsQuery = useQuery({
    queryKey: ['admin-analytics-trends'],
    queryFn: () => adminApi.getAnalyticsTrends(6),
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

  const suppliersQuery = useQuery({
    queryKey: ['admin-suppliers', searchQuery],
    queryFn: () => suppliersApi.getSuppliers(searchQuery),
  });

  const purchaseOrdersQuery = useQuery({
    queryKey: ['admin-purchase-orders'],
    queryFn: () => purchaseOrdersApi.getPurchaseOrders(),
  });

  const invoicesQuery = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => invoicesApi.getInvoices(),
  });

  const movementsQuery = useQuery({
    queryKey: ['admin-movements'],
    queryFn: () => inventoryApi.getMovements({ limit: 50 }),
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

  const adjustStockMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.adjustStock(data),
    onSuccess: () => {
      toast({ title: 'Stock Adjusted', description: 'Inventory quantity and audit movement updated successfully.' });
      setShowAdjustModal(false);
      setAdjustQty('');
      setAdjustNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: any) => {
      toast({ title: 'Adjustment Failed', description: err.message || 'Could not adjust stock', variant: 'destructive' });
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => suppliersApi.createSupplier(data),
    onSuccess: () => {
      toast({ title: 'Supplier Created', description: 'New vendor profile added to procurement roster.' });
      setShowAddSupplierModal(false);
      setSupName('');
      setSupPhone('');
      setSupGstin('');
      setSupContact('');
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to Add Supplier', description: err.message || 'Error creating supplier', variant: 'destructive' });
    },
  });

  const createPoMutation = useMutation({
    mutationFn: (data: any) => purchaseOrdersApi.createPurchaseOrder(data),
    onSuccess: () => {
      toast({ title: 'Purchase Order Created', description: 'Procurement order placed with supplier.' });
      setShowCreatePoModal(false);
      setPoNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to Create PO', description: err.message || 'Error creating PO', variant: 'destructive' });
    },
  });

  const receivePoMutation = useMutation({
    mutationFn: (id: number) => purchaseOrdersApi.receivePurchaseOrder(id),
    onSuccess: () => {
      toast({ title: 'PO Received', description: 'Inbound shipment verified and inventory restocked automatically.' });
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: any) => {
      toast({ title: 'Receiving Failed', description: err.message || 'Could not receive PO', variant: 'destructive' });
    },
  });

  const directSaleMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.createDirectSale(data),
    onSuccess: (data: any) => {
      toast({ title: 'Sale Recorded', description: `Invoice #${data.invoiceNumber} generated and parts deducted.` });
      setShowDirectSaleModal(false);
      setSaleCustName('');
      setSaleCustPhone('');
      setSaleQty('1');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelectedInvoice(data);
    },
    onError: (err: any) => {
      toast({ title: 'Sale Failed', description: err.message || 'Could not complete sale', variant: 'destructive' });
    },
  });

  const generateBookingInvoiceMutation = useMutation({
    mutationFn: (bookingId: number) => invoicesApi.generateFromBooking({ bookingId }),
    onSuccess: (data: any) => {
      toast({ title: 'Invoice Generated', description: `GST Invoice #${data.invoiceNumber} created for booking.` });
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setSelectedInvoice(data);
    },
    onError: (err: any) => {
      toast({ title: 'Invoice Error', description: err.message || 'Failed to generate invoice', variant: 'destructive' });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => invoicesApi.recordPayment(id, data),
    onSuccess: () => {
      toast({ title: 'Payment Recorded', description: 'Invoice payment updated.' });
      setShowPaymentModal(false);
      setPaymentInvoice(null);
      setPayAmount('');
      setPayRef('');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
    onError: (err: any) => {
      toast({ title: 'Payment Failed', description: err.message || 'Could not record payment', variant: 'destructive' });
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
    { id: 'analytics', label: 'Analytics & BI', icon: BarChart3 },
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'bookings', label: `Bookings (${kpis.pendingBookings})`, icon: CalendarClock },
    { id: 'customers', label: `Customers (${kpis.totalCustomers})`, icon: Users },
    { id: 'vehicles', label: `Vehicles (${kpis.totalVehicles})`, icon: Bike },
    { id: 'inventory', label: `Inventory (${kpis.totalSpareParts})`, icon: Package },
    { id: 'suppliers', label: `Suppliers & POs (${suppliersQuery.data?.length || 0})`, icon: Truck },
    { id: 'invoices', label: `Billing & Invoices (${invoicesQuery.data?.length || 0})`, icon: Receipt },
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

        {/* TAB: ANALYTICS & BUSINESS INTELLIGENCE */}
        {activeTab === 'analytics' && (
          <div className="mt-8 space-y-8">
            {/* Header & Export Action */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-[hsl(var(--accent))]" size={22} />
                  <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">
                    Executive Analytics & Workshop BI
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  कार्यशाळा व्यवसाय विश्लेषण • Real-time operational throughput, revenue streams, brand distribution, and inventory forecasting.
                </p>
              </div>
              <div>
                <a
                  href="/api/admin/analytics/export"
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90"
                >
                  <Download size={15} /> Export Operations CSV
                </a>
              </div>
            </div>

            {/* Trilingual Executive KPI Cards */}
            {analyticsSummaryQuery.data?.financial && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
                    Daily Sales
                  </span>
                  <p className="display-font mt-2 text-2xl font-bold sm:text-3xl text-emerald-500">
                    ₹{analyticsSummaryQuery.data.financial.dailySales}
                  </p>
                  <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                    दैनिक विक्री / आज की बिक्री
                  </span>
                </div>

                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
                    Monthly Revenue
                  </span>
                  <p className="display-font mt-2 text-2xl font-bold sm:text-3xl text-[hsl(var(--accent))]">
                    ₹{analyticsSummaryQuery.data.financial.monthlyRevenue}
                  </p>
                  <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                    मासिक महसूल / मासिक राजस्व
                  </span>
                </div>

                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
                    Completion Rate
                  </span>
                  <p className="display-font mt-2 text-2xl font-bold sm:text-3xl text-emerald-500">
                    {analyticsSummaryQuery.data.operations.serviceCompletionRate}%
                  </p>
                  <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                    दुरुस्ती पूर्णता दर
                  </span>
                </div>

                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
                    Avg Turnaround
                  </span>
                  <p className="display-font mt-2 text-2xl font-bold sm:text-3xl text-blue-500">
                    {analyticsSummaryQuery.data.operations.avgTurnaroundHours} <span className="text-sm font-normal">hrs</span>
                  </p>
                  <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                    सरासरी वेळ / औसत समय
                  </span>
                </div>

                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
                    Outstanding Due
                  </span>
                  <p className={`display-font mt-2 text-2xl font-bold sm:text-3xl ${Number(analyticsSummaryQuery.data.financial.outstandingPayments) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    ₹{analyticsSummaryQuery.data.financial.outstandingPayments}
                  </p>
                  <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                    थकीत रक्कम / बकाया
                  </span>
                </div>

                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
                    GST Tax (18%)
                  </span>
                  <p className="display-font mt-2 text-2xl font-bold sm:text-3xl">
                    ₹{(Number(analyticsSummaryQuery.data.financial.cgstCollected) + Number(analyticsSummaryQuery.data.financial.sgstCollected)).toFixed(2)}
                  </p>
                  <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                    9% CGST + 9% SGST
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Charts Grid */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Chart 1: Monthly Revenue & Completed Bookings Trend */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="text-[hsl(var(--accent))]" size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Revenue & Job Volume Trend (6 Months)</h3>
                  </div>
                  <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Financial Growth</span>
                </div>
                <div className="mt-6 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsTrendsQuery.data || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="revenue" name="Revenue (₹)" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed Services" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Two-Wheeler Brand Market Share */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                  <div className="flex items-center gap-2">
                    <Bike className="text-emerald-500" size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Two-Wheeler Brand Distribution</h3>
                  </div>
                  <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Sangola Riders</span>
                </div>
                <div className="mt-6 h-64 w-full flex items-center justify-center">
                  {(analyticsSummaryQuery.data?.brandDistribution || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsSummaryQuery.data?.brandDistribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="count"
                          nameKey="brand"
                          label={(entry) => `${entry.brand} (${entry.percentage}%)`}
                        >
                          {(analyticsSummaryQuery.data?.brandDistribution || []).map((_: any, index: number) => {
                            const colors = ['#E11D48', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                      No brand servicing data recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Inventory Depletion Velocity & Restock Forecast */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div className="flex items-center gap-2">
                  <Flame className="text-amber-500" size={18} />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Inventory Depletion Velocity & Restock Projections</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">30-day burn rate and estimated days until warehouse stockout.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[hsl(var(--accent))]">Predictive Logistics</span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Spare Part Name</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3">30-Day Outflow</th>
                      <th className="py-2.5 px-3">Daily Burn Rate</th>
                      <th className="py-2.5 px-3">Days to Stockout</th>
                      <th className="py-2.5 px-3">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))] text-xs">
                    {(analyticsSummaryQuery.data?.inventoryVelocity || []).map((item: any) => (
                      <tr key={item.partId} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[hsl(var(--accent))]">{item.sku}</td>
                        <td className="py-2.5 px-3 font-semibold">{item.name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{item.currentStock}</td>
                        <td className="py-2.5 px-3 font-mono text-[hsl(var(--muted-foreground))]">{item.unitsConsumed30d} units</td>
                        <td className="py-2.5 px-3 font-mono">{item.dailyConsumption}/day</td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {item.daysUntilStockout >= 999 ? '90+ days' : `${item.daysUntilStockout} days`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              item.status === 'CRITICAL'
                                ? 'bg-red-500/15 text-red-500'
                                : item.status === 'WARNING'
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-emerald-500/15 text-emerald-500'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section: Mechanic Productivity Matrix */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="text-blue-500" size={18} />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Technician Bay Productivity & Efficiency Matrix</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Job card completion statistics accounting for service workload.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[hsl(var(--accent))]">Floor Operations</span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(analyticsSummaryQuery.data?.mechanicProductivity || []).map((m: any) => (
                  <div key={m.id} className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--background))]">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm">{m.name}</h4>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{m.specialization}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-500 font-mono">{m.efficiencyPercent}% Eff.</span>
                    </div>
                    <div className="mt-3 flex justify-between text-xs border-t border-[hsl(var(--border))] pt-2">
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))]">Assigned:</span>{' '}
                        <span className="font-bold">{m.assignedJobs} jobs</span>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))]">Completed:</span>{' '}
                        <span className="font-bold text-[hsl(var(--accent))]">{m.completedJobs} jobs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI BUSINESS ASSISTANT & VISION CLASSIFIER */}
        {activeTab === 'assistant' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[hsl(var(--accent))]" size={22} />
                  <h2 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">
                    AI Business Assistant & Helmet Vision
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  कार्यशाळा व्यवसाय सहाय्यक • Natural language business intelligence powered by authenticated database tool-calling & HelmetML computer vision.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Chat Window (2 cols) */}
              <div className="lg:col-span-2 flex flex-col h-[650px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-xs">
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-3.5 bg-[hsl(var(--muted))]/30">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                      <Bot size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide">Sangola Workshop AI Copilot</span>
                      <span className="block text-[10px] text-[hsl(var(--muted-foreground))]">Live Database Function Calling • Zero Hallucinations</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready
                  </span>
                </div>

                {/* Quick-Prompt Chips */}
                <div className="border-b border-[hsl(var(--border))] px-4 py-2.5 bg-[hsl(var(--muted))]/10 flex flex-wrap gap-1.5">
                  {[
                    'How much revenue did we generate this month?',
                    'Which spare parts are running low?',
                    'Which services are pending?',
                    'Which mechanic has the highest workload?',
                    'चालू महिन्याचा महसूल किती आहे?',
                    'What are upcoming purchase requirements?',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendAssistant(chip)}
                      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[11px] font-medium transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {assistantMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs ${
                          msg.role === 'user'
                            ? 'bg-[hsl(var(--accent))] text-black font-semibold'
                            : 'border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                        {msg.tools && msg.tools.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[hsl(var(--border))]/50 flex flex-wrap gap-1.5">
                            {msg.tools.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-[hsl(var(--card))] px-2 py-0.5 text-[10px] font-mono text-[hsl(var(--accent))]"
                              >
                                ⚡ tool: {t.toolName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="mt-1 text-[9px] text-[hsl(var(--muted-foreground))] px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}
                  {assistantLoading && (
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] p-2">
                      <RefreshCw size={14} className="animate-spin text-[hsl(var(--accent))]" />
                      <span>Executing authenticated database tool query...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAssistant();
                  }}
                  className="border-t border-[hsl(var(--border))] p-3 flex items-center gap-2 bg-[hsl(var(--card))]"
                >
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder="Ask about revenue, low stock, mechanics, or bookings (English / Hindi / मराठी)..."
                    className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5 text-xs outline-none focus:border-[hsl(var(--accent))]"
                  />
                  <button
                    type="submit"
                    disabled={assistantLoading || !assistantInput.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>Send</span>
                  </button>
                </form>
              </div>

              {/* Right Column: HelmetML Vision Classifier (1 col) */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit className="text-[hsl(var(--accent))]" size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">HelmetML Vision Classifier</h3>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed mb-4">
                    Derived from the <strong>HelmetML research dataset</strong> (Elsevier 2024, Pune, India; 28,736 images across Full-Face, Half-Face, Modular & Off-Road configurations).
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                        Vehicle Context
                      </label>
                      <select
                        value={visionVehicleType}
                        onChange={(e) => setVisionVehicleType(e.target.value)}
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs"
                      >
                        <option value="Motorcycle">Motorcycle (Commuter / Cruiser / Sports)</option>
                        <option value="Scooter">Scooter (Commuter CVT)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestHelmetVision}
                      disabled={visionLoading}
                      className="w-full rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] py-2.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
                    >
                      {visionLoading ? 'Running Vision Model...' : 'Simulate Helmet Inspection'}
                    </button>
                  </div>

                  {visionResult && (
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(var(--muted-foreground))]">Detected Type:</span>
                        <span className="font-bold text-[hsl(var(--accent))]">{visionResult.helmet_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(var(--muted-foreground))]">Wearing Status:</span>
                        <span className="font-bold text-emerald-400">{visionResult.wearing_status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(var(--muted-foreground))]">ISI IS 4151 Certified:</span>
                        <span className="font-bold">{visionResult.safety_compliance?.isi_certified ? 'Yes ✓' : 'No ✗'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(var(--muted-foreground))]">Confidence:</span>
                        <span className="font-bold">{(visionResult.confidence_score * 100).toFixed(0)}%</span>
                      </div>

                      <div className="rounded-xl bg-[hsl(var(--muted))]/40 p-2.5 text-[11px] space-y-1">
                        <span className="font-bold block text-[hsl(var(--foreground))]">Suggested Products:</span>
                        {visionResult.suggested_catalog_helmets?.map((h: string, idx: number) => (
                          <div key={idx} className="text-[hsl(var(--muted-foreground))]">• {h}</div>
                        ))}
                      </div>

                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic border-t border-[hsl(var(--border))]/50 pt-2">
                        {visionResult.dataset_attribution}
                      </p>
                    </div>
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
                    {((bookingsQuery.data as any[]) || []).map((booking: any) => (
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-tight">Spare Parts & Warehouse Stock</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Real-time inventory ledger with audit movement tracking.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowMovementsModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))]"
                >
                  <History size={14} /> Movement Ledger
                </button>
                <button
                  onClick={() => {
                    const firstPart = (inventoryQuery.data || [])[0];
                    setAdjustPart(firstPart || null);
                    setShowAdjustModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
                >
                  <Plus size={14} /> Adjust Stock
                </button>
              </div>
            </div>

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
                      <th className="py-3 px-4 text-right">Actions</th>
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
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setAdjustPart(part);
                                setShowAdjustModal(true);
                              }}
                              className="rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                            >
                              Adjust
                            </button>
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

        {/* TAB: SUPPLIERS & PURCHASE ORDERS */}
        {activeTab === 'suppliers' && (
          <div className="mt-8 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-tight">Suppliers & Procurement Orders</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Manage spare parts vendors and inbound inventory purchase orders.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:border-[hsl(var(--accent))]"
                >
                  <Plus size={14} /> Add Supplier
                </button>
                <button
                  onClick={() => {
                    const firstSup = (suppliersQuery.data || [])[0];
                    const firstPart = (inventoryQuery.data || [])[0];
                    if (firstSup) setPoSupplierId(String(firstSup.id));
                    if (firstPart) {
                      setPoPartId(String(firstPart.id));
                      setPoCost(String(firstPart.purchasePrice || '250'));
                    }
                    setShowCreatePoModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
                >
                  <Truck size={14} /> Create Purchase Order
                </button>
              </div>
            </div>

            {/* Vendor Directory */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--accent))] mb-4">Vendor Directory ({suppliersQuery.data?.length || 0})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Supplier Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">GSTIN</th>
                      <th className="py-3 px-4">Payment Terms</th>
                      <th className="py-3 px-4">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(suppliersQuery.data || []).map((sup: any) => (
                      <tr key={sup.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[hsl(var(--accent))]">{sup.code}</td>
                        <td className="py-3.5 px-4 font-semibold">{sup.name}</td>
                        <td className="py-3.5 px-4 text-xs">
                          <div>{sup.contactPerson || sup.name}</div>
                          <div className="text-[hsl(var(--muted-foreground))]">{sup.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">{sup.gstin || '—'}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold">{sup.paymentTerms}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">₹{sup.outstandingBalance || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Orders */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[hsl(var(--accent))] mb-4">Purchase Orders ({purchaseOrdersQuery.data?.length || 0})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Subtotal</th>
                      <th className="py-3 px-4">GST (18%)</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(purchaseOrdersQuery.data || []).map((po: any) => (
                      <tr key={po.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">{po.orderNumber}</td>
                        <td className="py-3.5 px-4 font-semibold">{po.supplierName || `Supplier #${po.supplierId}`}</td>
                        <td className="py-3.5 px-4 text-xs">{po.destination}</td>
                        <td className="py-3.5 px-4 text-xs">₹{po.subtotal}</td>
                        <td className="py-3.5 px-4 text-xs">₹{po.taxAmount}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">₹{po.totalAmount}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              po.status === 'RECEIVED'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : po.status === 'ORDERED'
                                ? 'bg-blue-500/15 text-blue-500'
                                : 'bg-gray-500/15 text-gray-500'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {po.status === 'ORDERED' && (
                            <button
                              disabled={receivePoMutation.isPending}
                              onClick={() => receivePoMutation.mutate(po.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Receive & Restock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BILLING & INVOICES */}
        {activeTab === 'invoices' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-tight">GST Tax Invoices & Counter Billing</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Compliant 18% GST (9% CGST + 9% SGST) billing for workshop service jobs and counter sales.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    const firstPart = (inventoryQuery.data || [])[0];
                    if (firstPart) setSalePartId(String(firstPart.id));
                    setShowDirectSaleModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
                >
                  <Receipt size={14} /> New Counter Sale
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Taxable</th>
                      <th className="py-3 px-4">CGST (9%)</th>
                      <th className="py-3 px-4">SGST (9%)</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(invoicesQuery.data || []).map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[hsl(var(--accent))]">{inv.invoiceNumber}</td>
                        <td className="py-3.5 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold">{inv.invoiceType}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">{inv.customerName}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{inv.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">₹{inv.taxableAmount}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">₹{inv.cgstAmount}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">₹{inv.sgstAmount}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sm">₹{inv.totalAmount}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              inv.paymentStatus === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : inv.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-red-500/15 text-red-500'
                            }`}
                          >
                            {inv.paymentStatus} ({inv.paymentMethod})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                const details = await invoicesApi.getInvoice(inv.id);
                                setSelectedInvoice(details);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 text-xs font-semibold hover:border-[hsl(var(--accent))]"
                            >
                              <FileText size={12} /> View / Print
                            </button>
                            {inv.paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => {
                                  setPaymentInvoice(inv);
                                  const pending = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount || 0));
                                  setPayAmount(String(pending.toFixed(2)));
                                  setShowPaymentModal(true);
                                }}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Record Pay
                              </button>
                            )}
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

        {/* MODAL: Adjust Stock */}
        {showAdjustModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Adjust Inventory Stock</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Manual stock level correction with automated movement ledger logging.
              </p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Select Spare Part
                  </label>
                  <select
                    value={adjustPart?.id || ''}
                    onChange={(e) => {
                      const p = (inventoryQuery.data || []).find((x: any) => x.id === Number(e.target.value));
                      setAdjustPart(p || null);
                    }}
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  >
                    {(inventoryQuery.data || []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current Stock: {p.stockQuantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Adjustment Qty
                    </label>
                    <input
                      type="number"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      placeholder="+10 or -5"
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Type
                    </label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    >
                      <option value="ADJUSTMENT">Stock Correction</option>
                      <option value="DAMAGE">Damaged / Scrap</option>
                      <option value="RETURN">Customer Return</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="e.g. Physical inventory count reconciliation"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>

                {adjustPart && adjustQty && (
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-3 text-xs">
                    <div>Current Stock: <span className="font-bold">{adjustPart.stockQuantity}</span></div>
                    <div>Adjustment: <span className="font-bold">{Number(adjustQty) >= 0 ? `+${adjustQty}` : adjustQty}</span></div>
                    <div className="mt-1 border-t border-[hsl(var(--border))] pt-1 font-bold">
                      New Calculated Stock:{' '}
                      <span className={Number(adjustPart.stockQuantity) + Number(adjustQty) < 0 ? 'text-red-500' : 'text-emerald-500'}>
                        {Number(adjustPart.stockQuantity) + Number(adjustQty)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    adjustStockMutation.isPending ||
                    !adjustPart ||
                    !adjustQty ||
                    Number(adjustPart.stockQuantity) + Number(adjustQty) < 0
                  }
                  onClick={() =>
                    adjustStockMutation.mutate({
                      partId: adjustPart.id,
                      quantityChange: Number(adjustQty),
                      movementType: adjustType,
                      notes: adjustNotes,
                    })
                  }
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-40"
                >
                  {adjustStockMutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Movements Ledger */}
        {showMovementsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-4xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Inventory Movement Ledger</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Full immutable audit trail of stock additions, consumption, and adjustments.</p>
                </div>
                <button onClick={() => setShowMovementsModal(false)} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  ✕
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Part ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Previous</th>
                      <th className="py-2.5 px-3">New</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))] text-xs">
                    {(movementsQuery.data || []).map((m: any) => (
                      <tr key={m.id} className="hover:bg-[hsl(var(--muted)/.4)]">
                        <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))]">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">#{m.partId}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold">
                            {m.movementType}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 font-mono font-bold ${Number(m.quantity) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {Number(m.quantity) >= 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[hsl(var(--muted-foreground))]">{m.previousStock ?? '—'}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{m.newStock}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[hsl(var(--accent))]">{m.referenceId || m.referenceType || '—'}</td>
                        <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] max-w-[200px] truncate">{m.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Supplier */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Add Vendor / Supplier</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Register automotive parts distributor or OEM supplier profile.</p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Supplier Name</label>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="e.g. Minda Industries Ltd"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Phone</label>
                    <input
                      type="text"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      placeholder="9822001122"
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Contact Person</label>
                    <input
                      type="text"
                      value={supContact}
                      onChange={(e) => setSupContact(e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={supGstin}
                      onChange={(e) => setSupGstin(e.target.value)}
                      placeholder="27AABCS..."
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Payment Terms</label>
                    <select
                      value={supTerms}
                      onChange={(e) => setSupTerms(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    >
                      <option value="IMMEDIATE">Immediate</option>
                      <option value="NET_15">Net 15 Days</option>
                      <option value="NET_30">Net 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button onClick={() => setShowAddSupplierModal(false)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]">
                  Cancel
                </button>
                <button
                  disabled={createSupplierMutation.isPending || !supName || !supPhone}
                  onClick={() => createSupplierMutation.mutate({ name: supName, phone: supPhone, contactPerson: supContact, gstin: supGstin, paymentTerms: supTerms })}
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {createSupplierMutation.isPending ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Create Purchase Order */}
        {showCreatePoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Create Purchase Order</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Issue replenishment PO to supplier with automatic 18% GST calculation.</p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Select Supplier</label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  >
                    {(suppliersQuery.data || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Select Spare Part</label>
                  <select
                    value={poPartId}
                    onChange={(e) => {
                      setPoPartId(e.target.value);
                      const p = (inventoryQuery.data || []).find((x: any) => x.id === Number(e.target.value));
                      if (p) setPoCost(String(p.purchasePrice || '250'));
                    }}
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  >
                    {(inventoryQuery.data || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Quantity Ordered</label>
                    <input
                      type="number"
                      value={poQty}
                      onChange={(e) => setPoQty(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Unit Cost (₹)</label>
                    <input
                      type="number"
                      value={poCost}
                      onChange={(e) => setPoCost(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{(Number(poQty) * Number(poCost)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                    <span>GST (18%):</span>
                    <span className="font-mono">₹{(Number(poQty) * Number(poCost) * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-[hsl(var(--border))] pt-1">
                    <span>Total PO Amount:</span>
                    <span className="font-mono text-[hsl(var(--accent))]">₹{(Number(poQty) * Number(poCost) * 1.18).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button onClick={() => setShowCreatePoModal(false)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]">
                  Cancel
                </button>
                <button
                  disabled={createPoMutation.isPending || !poSupplierId || !poPartId || Number(poQty) <= 0}
                  onClick={() => {
                    const selectedPart = (inventoryQuery.data || []).find((x: any) => x.id === Number(poPartId));
                    createPoMutation.mutate({
                      supplierId: Number(poSupplierId),
                      items: [
                        {
                          partId: Number(poPartId),
                          partName: selectedPart?.name || 'Spare Part',
                          quantityOrdered: Number(poQty),
                          unitCost: Number(poCost),
                        },
                      ],
                    });
                  }}
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {createPoMutation.isPending ? 'Submitting...' : 'Issue PO'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Direct Counter Sale */}
        {showDirectSaleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Direct Counter Spare Sale</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Issue GST invoice for walk-in customer and automatically deduct stock.</p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Customer Name</label>
                  <input
                    type="text"
                    value={saleCustName}
                    onChange={(e) => setSaleCustName(e.target.value)}
                    placeholder="Walk-in Rider"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Phone Number</label>
                  <input
                    type="text"
                    value={saleCustPhone}
                    onChange={(e) => setSaleCustPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Select Part</label>
                  <select
                    value={salePartId}
                    onChange={(e) => setSalePartId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  >
                    {(inventoryQuery.data || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — ₹{p.price} ({p.stockQuantity} in stock)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Quantity</label>
                    <input
                      type="number"
                      value={saleQty}
                      onChange={(e) => setSaleQty(e.target.value)}
                      min="1"
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Payment Method</label>
                    <select
                      value={saleMethod}
                      onChange={(e) => setSaleMethod(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button onClick={() => setShowDirectSaleModal(false)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]">
                  Cancel
                </button>
                <button
                  disabled={directSaleMutation.isPending || !saleCustName || !saleCustPhone || !salePartId}
                  onClick={() => {
                    const selPart = (inventoryQuery.data || []).find((x: any) => x.id === Number(salePartId));
                    directSaleMutation.mutate({
                      customerName: saleCustName,
                      customerPhone: saleCustPhone,
                      paymentMethod: saleMethod,
                      items: [
                        {
                          partId: Number(salePartId),
                          quantity: Number(saleQty),
                          unitPrice: Number(selPart?.price || 0),
                        },
                      ],
                    });
                  }}
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {directSaleMutation.isPending ? 'Processing...' : 'Complete & Print'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Printable GST Tax Invoice */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <span className="mono-font text-xs font-bold text-[hsl(var(--accent))] uppercase tracking-widest">
                  Official GST Tax Invoice
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 rounded-xl bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-bold text-black hover:opacity-90"
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button onClick={() => setSelectedInvoice(null)} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                    ✕
                  </button>
                </div>
              </div>

              {/* Printable Invoice Header */}
              <div className="mt-4 p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--background))] space-y-4">
                <div className="flex justify-between items-start border-b border-[hsl(var(--border))] pb-3">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Shriram Automobiles</h2>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Main Road, Sangola, Solapur, Maharashtra - 413307</p>
                    <p className="text-xs font-mono font-semibold">GSTIN: 27AABCS1429B1Z8 • State: Maharashtra (27)</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-[hsl(var(--accent))]">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Date: {new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Billed To:</span>
                    <div className="font-bold text-sm mt-0.5">{selectedInvoice.customerName}</div>
                    <div>Phone: {selectedInvoice.customerPhone}</div>
                    {selectedInvoice.customerGstin && <div>GSTIN: {selectedInvoice.customerGstin}</div>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Invoice Details:</span>
                    <div>Type: <span className="font-semibold">{selectedInvoice.invoiceType}</span></div>
                    <div>Payment: <span className="font-semibold">{selectedInvoice.paymentMethod} ({selectedInvoice.paymentStatus})</span></div>
                    {selectedInvoice.paymentReference && <div className="font-mono text-[11px]">Ref: {selectedInvoice.paymentReference}</div>}
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      <th className="py-2">Description</th>
                      <th className="py-2">HSN/SAC</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {(selectedInvoice.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 font-semibold">{item.description}</td>
                        <td className="py-2 font-mono text-[hsl(var(--muted-foreground))]">{item.hsnSacCode || '8714'}</td>
                        <td className="py-2 text-right font-mono">{item.quantity}</td>
                        <td className="py-2 text-right font-mono">₹{item.unitPrice}</td>
                        <td className="py-2 text-right font-mono font-bold">₹{item.totalPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tax Breakdown & Totals */}
                <div className="border-t border-[hsl(var(--border))] pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">₹{selectedInvoice.taxableAmount}</span>
                  </div>
                  <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                    <span>CGST (9%):</span>
                    <span className="font-mono">₹{selectedInvoice.cgstAmount}</span>
                  </div>
                  <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
                    <span>SGST (9%):</span>
                    <span className="font-mono">₹{selectedInvoice.sgstAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-[hsl(var(--border))] pt-2">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[hsl(var(--accent))]">₹{selectedInvoice.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Record Payment */}
        {showPaymentModal && paymentInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl">
              <h3 className="text-lg font-bold uppercase tracking-tight">Record Invoice Payment</h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Invoice {paymentInvoice.invoiceNumber} • Total: ₹{paymentInvoice.totalAmount}
              </p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CREDIT">Customer Credit Ledger</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Transaction Reference / UTR</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. UPI/123456789/SBIN"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm outline-none focus:border-[hsl(var(--accent))]"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button onClick={() => setShowPaymentModal(false)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))]">
                  Cancel
                </button>
                <button
                  disabled={recordPaymentMutation.isPending || Number(payAmount) <= 0}
                  onClick={() =>
                    recordPaymentMutation.mutate({
                      id: paymentInvoice.id,
                      data: { paidAmount: Number(payAmount), paymentMethod: payMethod, paymentReference: payRef },
                    })
                  }
                  className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}

export default AdminPage;
