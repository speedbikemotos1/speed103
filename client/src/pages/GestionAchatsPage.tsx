import Dashboard from "@/pages/Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Droplets, Shield } from "lucide-react";
import { Link } from "wouter";

export default function GestionAchatsPage() {
  return (
    <Dashboard contentOnly>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen animate-enter">
        <header className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-lg ring-4 ring-white">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">Gestion Achat</h1>
            <p className="text-gray-500 font-medium">Les achats se font dans chaque module.</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Achats Huile</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100">
                  <Droplets className="h-5 w-5 text-amber-700" />
                </div>
                <div className="font-bold">Module Huile</div>
              </div>
              <Link href="/oil">
                <Button className="rounded-xl">Ouvrir</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Achats Casques</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-100">
                  <Shield className="h-5 w-5 text-rose-700" />
                </div>
                <div className="font-bold">Module Casques</div>
              </div>
              <Link href="/helmets">
                <Button className="rounded-xl">Ouvrir</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Dashboard>
  );
}

