import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import Dashboard from "./Dashboard";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  nom_prenom: string;
  designation: string;
  avance: number;
  date: string;
  numero_telephone: string;
  remarque: string;
}

import { INITIAL_DATA } from "@/lib/initialData";

export default function CommandePage() {
  const [data, setData] = useState<Order[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Omit<Order, "id">>({
    nom_prenom: "",
    designation: "",
    avance: 0,
    date: new Date().toISOString().split('T')[0],
    numero_telephone: "",
    remarque: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("ordersData");
    if (saved) {
      const parsed = JSON.parse(saved) as Order[];
      parsed.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setData(parsed);
    } else {
      const initial = [...INITIAL_DATA.orders].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setData(initial);
      localStorage.setItem("ordersData", JSON.stringify(initial));
    }
  }, []);

  const getStatistics = () => {
    const todayString = new Date().toISOString().split('T')[0];

    return {
      totalCount: data.length,
      filteredCount: data.length,
      totalAvance: data.reduce((acc, curr) => acc + Number(curr.avance), 0),
      todayCount: data.filter(item => item.date === todayString).length,
      isFiltered: false,
    };
  };

  const saveData = (newData: Order[]) => {
    const sorted = [...newData].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setData(sorted);
    localStorage.setItem("ordersData", JSON.stringify(sorted));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      saveData(data.map(i => i.id === editingId ? { ...formData, id: editingId } : i));
      toast({ title: "Succès" });
    } else {
      saveData([{ ...formData, id: crypto.randomUUID() }, ...data]);
      toast({ title: "Succès" });
    }
    setIsOpen(false); setEditingId(null);
    setFormData({ nom_prenom: "", designation: "", avance: 0, date: new Date().toISOString().split('T')[0], numero_telephone: "", remarque: "" });
  };

  const handleEdit = (item: Order) => {
    setEditingId(item.id); setFormData({ ...item }); setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ?")) {
      saveData(data.filter(i => i.id !== id));
      toast({ title: "Supprimé" });
    }
  };

  const stats = getStatistics();

  return (
    <Dashboard contentOnly={true}>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen animate-enter">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-white text-white">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">Suivi Commandes</h1>
              <p className="text-gray-500 font-medium">Gestion des commandes clients.</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if(!o) setEditingId(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                <Plus className="w-5 h-5 stroke-[3px]" /> Nouvelle commande
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
              <DialogHeader><DialogTitle className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{editingId ? "Modifier la commande" : "Nouvelle commande"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-4">
                <div className="grid gap-2"><Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Nom / Prénom</Label><Input value={formData.nom_prenom} onChange={e => setFormData({...formData, nom_prenom: e.target.value})} required className="h-12 rounded-xl border-gray-200 font-medium" /></div>
                <div className="grid gap-2"><Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Désignation</Label><Input value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required className="h-12 rounded-xl border-gray-200 font-medium" /></div>
                <div className="grid gap-2"><Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Avance (TND)</Label><Input type="number" step="0.001" value={formData.avance} onChange={e => setFormData({...formData, avance: Number(e.target.value)})} required className="h-12 rounded-xl border-gray-200 font-bold text-red-600" /></div>
                <div className="grid gap-2"><Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Date</Label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-12 rounded-xl border-gray-200 font-medium" /></div>
                <div className="grid gap-2"><Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Téléphone</Label><Input value={formData.numero_telephone} onChange={e => setFormData({...formData, numero_telephone: e.target.value})} className="h-12 rounded-xl border-gray-200 font-medium" /></div>
                <div className="grid gap-2"><Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Remarque</Label><Textarea value={formData.remarque} onChange={e => setFormData({...formData, remarque: e.target.value})} className="rounded-xl border-gray-200 font-medium min-h-[100px]" /></div>
                <Button type="submit" className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg mt-4">Enregistrer</Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Historique</CardTitle>
              <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200"><TrendingUp className="w-4 h-4 text-gray-500" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{stats.totalCount}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Commandes enregistrées</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Aujourd'hui</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-200"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{stats.todayCount}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Commandes du jour</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Commandes</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-200"><ShoppingCart className="w-4 h-4 text-emerald-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{stats.filteredCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Avances</CardTitle>
              <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200"><DollarSign className="w-4 h-4 text-green-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-red-600 tracking-tighter italic">{stats.totalAvance.toFixed(2)} <span className="text-lg uppercase not-italic">TND</span></div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b-2 border-gray-100">
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Client</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Désignation</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Avance</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Téléphone</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Remarques</TableHead>
                    <TableHead className="text-right font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="transition-all duration-200 h-16 border-b border-gray-50 group hover:bg-gray-50/50"
                    >
                      <TableCell className="py-4 font-bold">{item.nom_prenom}</TableCell>
                      <TableCell className="py-4 font-medium">{item.designation}</TableCell>
                      <TableCell className="py-4 font-black text-red-600 italic tracking-tighter">{Number(item.avance).toFixed(2)} TND</TableCell>
                      <TableCell className="py-4 font-bold">{item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</TableCell>
                      <TableCell className="py-4 font-medium text-gray-500">{item.numero_telephone}</TableCell>
                      <TableCell className="py-4 max-w-xs truncate font-medium text-gray-400">{item.remarque}</TableCell>
                      <TableCell className="text-right py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-white shadow-sm transition-all"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-10 w-10 rounded-xl text-red-400 hover:text-red-700 hover:bg-white shadow-sm transition-all"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Dashboard>
  );
}
