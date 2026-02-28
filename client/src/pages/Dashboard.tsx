import { SalesTable } from "@/components/SalesTable";
import { CreateSaleDialog } from "@/components/CreateSaleDialog";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ImportCSVDialog } from "@/components/ImportCSVDialog";
import logoImg from "@assets/LOGOBranding_1771926796475.png";
import { useSales } from "@/hooks/use-sales";
import { useHelmetSales } from "@/hooks/use-helmets";
import { Bike, HardHat, Droplets, Shield, Split, LayoutDashboard, ShoppingCart, CalendarDays, Bell, LogOut, CircleUser, Menu, Users, Settings, Boxes, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Dashboard({ children, contentOnly = false }: { children?: React.ReactNode, contentOnly?: boolean }) {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  const { data: sales = [] } = useSales();
  const { data: helmetSales = [] } = useHelmetSales();

  const motoCount = sales.length;
  const helmetCount = helmetSales.reduce((acc, s) => acc + Number(s.quantite ?? 1), 0);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm shrink-0">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 shrink-0">
             <div className="flex items-center gap-4">
               <Sheet>
                 <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border bg-white/60 shadow-sm">
                     <Menu className="h-5 w-5" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="left" className="p-0">
                   <div className="p-6 border-b">
                     <SheetHeader className="space-y-1 text-left">
                       <SheetTitle className="font-black uppercase italic tracking-tight">Menu</SheetTitle>
                     </SheetHeader>
                   </div>
                   <nav className="p-4 flex flex-col gap-2">
                     <SheetClose asChild>
                       <Button variant="ghost" className="justify-start gap-2 rounded-xl" onClick={() => setLocation("/")}>
                         <LayoutDashboard className="h-4 w-4" /> Gestion vente
                       </Button>
                     </SheetClose>
                     <SheetClose asChild>
                       <Button variant="ghost" className="justify-start gap-2 rounded-xl" onClick={() => setLocation("/gestion/achats")}>
                         <ShoppingBag className="h-4 w-4" /> Gestion achat
                       </Button>
                     </SheetClose>
                     <SheetClose asChild>
                       <Button variant="ghost" className="justify-start gap-2 rounded-xl" onClick={() => setLocation("/gestion/stock")}>
                         <Boxes className="h-4 w-4" /> Gestion stock
                       </Button>
                     </SheetClose>
                     <SheetClose asChild>
                       <Button variant="ghost" className="justify-start gap-2 rounded-xl" onClick={() => setLocation("/gestion/clients")}>
                         <Users className="h-4 w-4" /> Gestion client
                       </Button>
                     </SheetClose>
                     <SheetClose asChild>
                       <Button variant="ghost" className="justify-start gap-2 rounded-xl" onClick={() => setLocation("/gestion/parametrage")}>
                         <Settings className="h-4 w-4" /> Paramétrage
                       </Button>
                     </SheetClose>
                   </nav>
                 </SheetContent>
               </Sheet>

               <div className="p-1 bg-white rounded-xl overflow-hidden border shadow-sm transition-transform hover:scale-105 shrink-0 flex items-center justify-center">
                  <img src={logoImg} alt="Speed Bike Motos" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
               </div>
               <div className="hidden md:block">
                 <h1 className="text-lg font-black tracking-tighter uppercase italic text-primary leading-none">Speed Bike</h1>
                 <h1 className="text-lg font-black tracking-tighter uppercase italic text-primary leading-none">Motos</h1>
               </div>
             </div>
          </div>

          <nav className="hidden lg:flex items-center bg-muted/50 p-1 rounded-xl border gap-0.5">
            <NavLink href="/" icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Dash" active={location === '/'} />
            <NavLink href="/oil" icon={<Droplets className="w-3.5 h-3.5" />} label="Huile" active={location === '/oil'} />
            <NavLink href="/helmets" icon={<Shield className="w-3.5 h-3.5" />} label="Casques" active={location === '/helmets'} />
            <NavLink href="/cache-selle" icon={<CircleUser className="w-3.5 h-3.5" />} label="Selle" active={location === '/cache-selle'} />
            <NavLink href="/differ" icon={<Split className="w-3.5 h-3.5" />} label="Divers" active={location === '/differ'} />
            <NavLink href="/commande" icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Cmd" active={location === '/commande'} />
            <NavLink href="/reservation" icon={<CalendarDays className="w-3.5 h-3.5" />} label="Resv" active={location === '/reservation'} />
          </nav>
          
          <div className="flex items-center gap-3">
             <div className="hidden xl:flex items-center gap-2 mr-2">
               <StatBadge icon={<Bike className="w-3.5 h-3.5" />} label="Motos" count={motoCount} color="blue" />
               <StatBadge icon={<HardHat className="w-3.5 h-3.5" />} label="Casques" count={helmetCount} color="slate" />
             </div>
             
             <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border">
               <NotificationsPanel />
               <ImportCSVDialog />
               <CreateSaleDialog />
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="rounded-full h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                 onClick={() => logoutMutation.mutate()}
               >
                 <LogOut className="w-4 h-4" />
               </Button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0">
        {contentOnly ? children : <SalesTable />}
      </main>
      
      {/* Simple Footer */}
      <footer className="border-t py-4 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground bg-muted/10 shrink-0">
         <p>© 2026 Speed Bike Motos • Premium Management System</p>
      </footer>
    </div>
  );
}

function NavLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link href={href}>
      <a className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200 ${
        active 
          ? 'bg-primary text-primary-foreground shadow-sm scale-105' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-xs font-bold whitespace-nowrap">{label}</span>
      </a>
    </Link>
  );
}

function StatBadge({ icon, label, count, color }: { icon: React.ReactNode, label: string, count: number, color: 'blue' | 'slate' }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100"
  };
  
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-sm ${colors[color]}`}>
      {icon}
      <span>{label}: {count}</span>
    </div>
  );
}
