import Dashboard from "@/pages/Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ParametragePage() {
  return (
    <Dashboard contentOnly>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen animate-enter">
        <header className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl shadow-lg ring-4 ring-white">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">Paramétrage</h1>
            <p className="text-gray-500 font-medium">À compléter selon vos besoins.</p>
          </div>
        </header>

        <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Infos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cette page sert de placeholder (ex: utilisateurs, rôles, exports, numérotation, etc.).
          </CardContent>
        </Card>
      </div>
    </Dashboard>
  );
}

