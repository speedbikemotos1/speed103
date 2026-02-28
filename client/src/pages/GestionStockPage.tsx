import Dashboard from "@/pages/Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOilStock } from "@/hooks/use-oil";
import { useHelmetStock } from "@/hooks/use-helmets";
import { Boxes } from "lucide-react";

export default function GestionStockPage() {
  const { data: oilStock } = useOilStock();
  const { data: helmetStock = [] } = useHelmetStock();
  const totalHelmetStock = helmetStock.reduce((acc, r) => acc + Number(r.stock), 0);

  return (
    <Dashboard contentOnly>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen animate-enter">
        <header className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-lg ring-4 ring-white">
            <Boxes className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">Gestion Stock</h1>
            <p className="text-gray-500 font-medium">Vue rapide des stocks par module.</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Huile 10W40</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{oilStock?.huile_10w40 ?? 0}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Bidons</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Huile 20W50</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{oilStock?.huile_20w50 ?? 0}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Bidons</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Casques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{totalHelmetStock}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Pièces</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Dashboard>
  );
}

