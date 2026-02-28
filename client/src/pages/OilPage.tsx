import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, TrendingUp, DollarSign, Droplet, PackagePlus } from "lucide-react";
import Dashboard from "./Dashboard";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateOilPurchase,
  useCreateOilSale,
  useDeleteOilPurchase,
  useDeleteOilSale,
  useOilPurchases,
  useOilSales,
  useOilStock,
  useUpdateOilSale,
} from "@/hooks/use-oil";

export default function OilPage() {
  const { toast } = useToast();
  const { data: sales = [] } = useOilSales();
  const { data: purchases = [] } = useOilPurchases();
  const { data: stock } = useOilStock();
  const createSale = useCreateOilSale();
  const updateSale = useUpdateOilSale();
  const deleteSale = useDeleteOilSale();
  const createPurchase = useCreateOilPurchase();
  const deletePurchase = useDeleteOilPurchase();

  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const [saleForm, setSaleForm] = useState({
    date: new Date().toISOString().split('T')[0],
    huile10w40: 0,
    huile20w50: 0,
    prix: 0,
    encaissement: "KARIM",
    client: "",
  });

  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    huile10w40: 0,
    huile20w50: 0,
    fournisseur: "",
    prix: 0,
  });

  const slicedSales = useMemo(
    () => (selectedRowIndex !== null ? sales.slice(0, selectedRowIndex + 1) : sales),
    [selectedRowIndex, sales],
  );

  const totalSoldBidons = useMemo(() => {
    return slicedSales.reduce((acc, s) => acc + Number(s.huile10w40) + Number(s.huile20w50), 0);
  }, [slicedSales]);

  const totalRevenue = useMemo(() => {
    return slicedSales.reduce((acc, s) => acc + Number(s.prix), 0);
  }, [slicedSales]);

  const todayCount = useMemo(() => {
    const todayString = new Date().toISOString().split('T')[0];
    return sales.filter(r => r.date === todayString).length;
  }, [sales]);

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSaleId) {
        await updateSale.mutateAsync({ id: editingSaleId, ...saleForm });
        toast({ title: "Succès", description: "Vente modifiée" });
      } else {
        await createSale.mutateAsync(saleForm);
        toast({ title: "Succès", description: "Vente ajoutée" });
      }
      setSaleDialogOpen(false);
      setEditingSaleId(null);
      setSaleForm({ date: new Date().toISOString().split('T')[0], huile10w40: 0, huile20w50: 0, prix: 0, encaissement: "KARIM", client: "" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible d'enregistrer la vente", variant: "destructive" });
    }
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPurchase.mutateAsync(purchaseForm);
      toast({ title: "Succès", description: "Achat ajouté (stock mis à jour)" });
      setPurchaseDialogOpen(false);
      setPurchaseForm({ date: new Date().toISOString().split('T')[0], huile10w40: 0, huile20w50: 0, fournisseur: "", prix: 0 });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible d'ajouter l'achat", variant: "destructive" });
    }
  };

  const handleEditSale = (item: (typeof sales)[number]) => {
    setEditingSaleId(item.id);
    setSaleForm({
      date: item.date,
      huile10w40: item.huile10w40,
      huile20w50: item.huile20w50,
      prix: item.prix,
      encaissement: item.encaissement,
      client: item.client ?? "",
    });
    setSaleDialogOpen(true);
  };

  const handleDeleteSale = async (id: number) => {
    if (!confirm("Supprimer ?")) return;
    try {
      await deleteSale.mutateAsync(id);
      toast({ title: "Supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Suppression impossible", variant: "destructive" });
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (!confirm("Supprimer ?")) return;
    try {
      await deletePurchase.mutateAsync(id);
      toast({ title: "Supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Suppression impossible", variant: "destructive" });
    }
  };

  return (
    <Dashboard contentOnly={true}>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen animate-enter">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg ring-4 ring-white">
              <Droplet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">Ventes d'Huile</h1>
              <p className="text-gray-500 font-medium">Gestion des stocks et ventes d'huiles.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 px-6 py-6 rounded-2xl shadow-sm bg-white/70">
                  <PackagePlus className="w-5 h-5" /> Ajouter achat
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[460px] rounded-[2rem] border-none shadow-2xl p-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Nouvel achat (stock)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitPurchase} className="flex flex-col gap-5 py-4">
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Date d'achat</Label>
                    <Input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Qte 10W40 (Bidon)</Label>
                      <Input type="number" min="0" value={purchaseForm.huile10w40} onChange={e => setPurchaseForm({ ...purchaseForm, huile10w40: Number(e.target.value) })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Qte 20W50 (Bidon)</Label>
                      <Input type="number" min="0" value={purchaseForm.huile20w50} onChange={e => setPurchaseForm({ ...purchaseForm, huile20w50: Number(e.target.value) })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Fournisseur</Label>
                    <Input value={purchaseForm.fournisseur} onChange={e => setPurchaseForm({ ...purchaseForm, fournisseur: e.target.value })} className="h-12 rounded-xl border-gray-200 font-medium" placeholder="Optionnel" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Prix total (TND)</Label>
                    <Input type="number" min="0" step="0.001" value={purchaseForm.prix} onChange={e => setPurchaseForm({ ...purchaseForm, prix: Number(e.target.value) })} required className="h-12 rounded-xl border-gray-200 font-bold text-red-600" />
                  </div>
                  <Button type="submit" className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg mt-4">
                    Ajouter au stock
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={saleDialogOpen} onOpenChange={(open) => { setSaleDialogOpen(open); if (!open) setEditingSaleId(null); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <Plus className="w-5 h-5 stroke-[3px]" /> Ajouter une vente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{editingSaleId ? "Modifier" : "Nouvelle vente"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitSale} className="flex flex-col gap-5 py-4">
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Date de vente</Label>
                    <Input type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Qte 10W40 (Bidon)</Label>
                      <Input type="number" min="0" value={saleForm.huile10w40} onChange={e => setSaleForm({ ...saleForm, huile10w40: Number(e.target.value) })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                      <p className="text-[10px] font-bold text-muted-foreground px-1">Stock: {stock?.huile_10w40 ?? 0}</p>
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Qte 20W50 (Bidon)</Label>
                      <Input type="number" min="0" value={saleForm.huile20w50} onChange={e => setSaleForm({ ...saleForm, huile20w50: Number(e.target.value) })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                      <p className="text-[10px] font-bold text-muted-foreground px-1">Stock: {stock?.huile_20w50 ?? 0}</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Prix total (TND)</Label>
                    <Input type="number" min="0" step="0.001" value={saleForm.prix} onChange={e => setSaleForm({ ...saleForm, prix: Number(e.target.value) })} required className="h-12 rounded-xl border-gray-200 font-bold text-red-600" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Vendeur responsable</Label>
                    <Select value={saleForm.encaissement} onValueChange={v => setSaleForm({ ...saleForm, encaissement: v })}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 font-medium"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        {["KARIM", "ANAS", "BASSEM", "YASSIN"].map(v => <SelectItem key={v} value={v} className="rounded-lg font-medium">{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Nom du client</Label>
                    <Input value={saleForm.client} onChange={e => setSaleForm({ ...saleForm, client: e.target.value })} className="h-12 rounded-xl border-gray-200 font-medium" placeholder="Optionnel" />
                  </div>
                  <Button type="submit" className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg mt-4">
                    {editingSaleId ? "Mettre à jour" : "Confirmer la vente"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Stock 10W40</CardTitle>
              <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors"><Droplet className="w-4 h-4 text-orange-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{stock?.huile_10w40 ?? 0}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Bidons disponibles</p>
            </CardContent>
          </Card>
          <Card className={`bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl group ${selectedRowIndex !== null ? "ring-2 ring-red-500 bg-red-50/30" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Stock 20W50</CardTitle>
              <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors"><Droplet className="w-4 h-4 text-orange-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{stock?.huile_20w50 ?? 0}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Bidons disponibles</p>
            </CardContent>
          </Card>
          <Card className={`bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl group ${selectedRowIndex !== null ? "ring-2 ring-red-500 bg-red-50/30" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Aujourd'hui</CardTitle>
              <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors"><TrendingUp className="w-4 h-4 text-orange-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{todayCount}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Ventes du jour</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Historique</CardTitle>
              <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors"><TrendingUp className="w-4 h-4 text-gray-500" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{sales.length}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Ventes enregistrées</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Bidons vendus</CardTitle>
              <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors"><Droplet className="w-4 h-4 text-orange-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900 tracking-tighter italic">{totalSoldBidons}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Total cumulé</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Revenu</CardTitle>
              <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors"><DollarSign className="w-4 h-4 text-green-600" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-red-600 tracking-tighter italic">{totalRevenue.toFixed(2)} <span className="text-lg uppercase not-italic">TND</span></div>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Total ventes</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 shadow-2xl shadow-gray-200/50 bg-white/80 backdrop-blur-md overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Tabs defaultValue="sales" className="w-full">
                <div className="p-4 border-b bg-white/60">
                  <TabsList className="rounded-xl">
                    <TabsTrigger value="sales" className="rounded-lg font-bold uppercase text-xs tracking-widest">Ventes</TabsTrigger>
                    <TabsTrigger value="purchases" className="rounded-lg font-bold uppercase text-xs tracking-widest">Achats</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="sales" className="m-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b-2 border-gray-100">
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Date</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">10W40</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">20W50</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Prix</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Vendeur</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Client</TableHead>
                        <TableHead className="text-right font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((item, index) => (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer transition-all duration-200 h-16 border-b border-gray-50 group ${
                            selectedRowIndex === index
                              ? "bg-red-50/80 text-red-700 font-bold hover:bg-red-100/80"
                              : "hover:bg-gray-50/50"
                          }`}
                          onClick={() =>
                            setSelectedRowIndex(selectedRowIndex === index ? null : index)
                          }
                        >
                          <TableCell className="py-4 font-bold">{new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell className="py-4 font-medium">{item.huile10w40}</TableCell>
                          <TableCell className="py-4 font-medium">{item.huile20w50}</TableCell>
                          <TableCell className="py-4 font-black text-red-600 italic tracking-tighter">{Number(item.prix).toFixed(2)} TND</TableCell>
                          <TableCell className="py-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider bg-gray-100/30 rounded-lg inline-block my-2 px-3">{item.encaissement}</TableCell>
                          <TableCell className="py-4 font-medium text-gray-500">{item.client || "-"}</TableCell>
                          <TableCell className="text-right py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => handleEditSale(item)} className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-white shadow-sm transition-all"><Edit2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteSale(item.id)} className="h-10 w-10 rounded-xl text-red-400 hover:text-red-700 hover:bg-white shadow-sm transition-all"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="purchases" className="m-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b-2 border-gray-100">
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Date</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">10W40</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">20W50</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Fournisseur</TableHead>
                        <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Prix</TableHead>
                        <TableHead className="text-right font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((item) => (
                        <TableRow key={item.id} className="transition-all duration-200 h-16 border-b border-gray-50 group hover:bg-gray-50/50">
                          <TableCell className="py-4 font-bold">{new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell className="py-4 font-medium">{item.huile10w40}</TableCell>
                          <TableCell className="py-4 font-medium">{item.huile20w50}</TableCell>
                          <TableCell className="py-4 font-medium text-gray-500">{item.fournisseur || "-"}</TableCell>
                          <TableCell className="py-4 font-black text-red-600 italic tracking-tighter">{Number(item.prix).toFixed(2)} TND</TableCell>
                          <TableCell className="text-right py-4">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePurchase(item.id)} className="h-10 w-10 rounded-xl text-red-400 hover:text-red-700 hover:bg-white shadow-sm transition-all"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </Dashboard>
  );
}
