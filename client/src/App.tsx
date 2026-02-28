import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import OilPage from "@/pages/OilPage";
import HelmetsPage from "@/pages/HelmetsPage";
import DifferPage from "@/pages/DifferPage";
import CommandePage from "@/pages/CommandePage";
import ReservationPage from "@/pages/ReservationPage";
import CacheSellePage from "@/pages/CacheSellePage";
import LoginPage from "@/pages/LoginPage";
import GestionClientsPage from "@/pages/GestionClientsPage";
import GestionStockPage from "@/pages/GestionStockPage";
import GestionAchatsPage from "@/pages/GestionAchatsPage";
import ParametragePage from "@/pages/ParametragePage";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={LoginPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/oil">
        {() => <ProtectedRoute component={OilPage} />}
      </Route>
      <Route path="/helmets">
        {() => <ProtectedRoute component={HelmetsPage} />}
      </Route>
      <Route path="/differ">
        {() => <ProtectedRoute component={DifferPage} />}
      </Route>
      <Route path="/commande">
        {() => <ProtectedRoute component={CommandePage} />}
      </Route>
      <Route path="/reservation">
        {() => <ProtectedRoute component={ReservationPage} />}
      </Route>
      <Route path="/cache-selle">
        {() => <ProtectedRoute component={CacheSellePage} />}
      </Route>
      <Route path="/gestion/clients">
        {() => <ProtectedRoute component={GestionClientsPage} />}
      </Route>
      <Route path="/gestion/stock">
        {() => <ProtectedRoute component={GestionStockPage} />}
      </Route>
      <Route path="/gestion/achats">
        {() => <ProtectedRoute component={GestionAchatsPage} />}
      </Route>
      <Route path="/gestion/parametrage">
        {() => <ProtectedRoute component={ParametragePage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={100}>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
