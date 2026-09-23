import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import HomePage from '@/pages/home/HomePage';
import ShopPage from '@/pages/parts/ShopPage';
import HelmetsPage from '@/pages/helmets/HelmetsPage';
import BookingPage from '@/pages/services/BookingPage';
import ContactPage from '@/pages/contact/ContactPage';
import AdminPage from '@/pages/admin/AdminPage';
import CartPage from '@/pages/cart/CartPage';
import CheckoutPage from '@/pages/checkout/CheckoutPage';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/account/DashboardPage';
import VehiclesPage from '@/pages/account/VehiclesPage';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/helmets" component={HelmetsPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/account/login" component={LoginPage} />
        <Route path="/account/dashboard" component={DashboardPage} />
        <Route path="/account/vehicles" component={VehiclesPage} />
        <Route path="/book-service" component={BookingPage} />
        <Route path="/service/book" component={BookingPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/admin/bookings" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;