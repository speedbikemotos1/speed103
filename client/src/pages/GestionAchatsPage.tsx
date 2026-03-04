import { useState } from "react";
import Dashboard from "@/pages/Dashboard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseReceipt, Product } from "@shared/schema";

export default function GestionAchatsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const { data: receipts = [] } = useQuery<PurchaseReceipt[]>({ queryKey: ["/api/purchase-receipts"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const createReceipt = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-receipts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-receipts"] });
      setOpen(false);
      setItems([]);
      toast({ title: "Bon de réception créé" });
    }
  });

  const validateReceipt = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/purchase-receipts/${id}/validate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bon validé et stock mis à jour" });
    }
  });

  const addItem = (productId: string) => {
    const p = products.find(prod => prod.id === parseInt(productId));
    if (!p) return;
    setItems([...items, {
      productId: p.id,
      reference: p.reference,
      designation: p.designation,
      quantity: 1,
      price: p.purchasePrice,
      tva: p.tva,
      discount: 0
    }]);
  };

  const calculateTotals = () => {
    let ht = 0, tva = 0;
    items.forEach(item => {
      const lineHt = item.quantity * item.price * (1 - item.discount / 100);
      ht += lineHt;
      tva += lineHt * (item.tva / 100);
    });
    return { ht, tva, ttc: ht + tva };
  };

  const totals = calculateTotals();

  return (
    <Dashboard contentOnly>
      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <ShoppingCart className="w-8 h-8" />
            <h1 className="text-3xl font-black italic uppercase">Gestion Achats</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">Nouveau Bon de Réception</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouveau Bon de Réception</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createReceipt.mutate({
                  receipt: {
                    bonNumber: fd.get("bonNumber"),
                    date: fd.get("date"),
                    supplier: fd.get("supplier"),
                    ...totals
                  },
                  items
                });
              }} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>N° Bon</Label><Input name="bonNumber" required /></div>
                  <div><Label>Date</Label><Input name="date" type="date" required /></div>
                  <div><Label>Fournisseur</Label><Input name="supplier" required /></div>
                </div>

                <div className="space-y-2">
                  <Label>Ajouter un produit</Label>
                  <Select onValueChange={addItem}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.reference} - {p.designation}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Qte</TableHead>
                      <TableHead>Prix HT</TableHead>
                      <TableHead>Remise %</TableHead>
                      <TableHead className="text-right">Total HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-bold">{item.reference}<br/><span className="text-gray-500 font-normal">{item.designation}</span></TableCell>
                        <TableCell><Input type="number" className="w-20" value={item.quantity} onChange={e => {
                          const newItems = [...items];
                          newItems[idx].quantity = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }} /></TableCell>
                        <TableCell><Input type="number" step="0.001" className="w-24" value={item.price} onChange={e => {
                          const newItems = [...items];
                          newItems[idx].price = parseFloat(e.target.value) || 0;
                          setItems(newItems);
                        }} /></TableCell>
                        <TableCell><Input type="number" className="w-20" value={item.discount} onChange={e => {
                          const newItems = [...items];
                          newItems[idx].discount = parseFloat(e.target.value) || 0;
                          setItems(newItems);
                        }} /></TableCell>
                        <TableCell className="text-right font-bold">{(item.quantity * item.price * (1 - item.discount / 100)).toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end border-t pt-4">
                  <div className="text-right space-y-1">
                    <p className="text-sm">Total HT: <span className="font-bold">{totals.ht.toFixed(3)} DT</span></p>
                    <p className="text-sm">Total TVA (19%): <span className="font-bold">{totals.tva.toFixed(3)} DT</span></p>
                    <p className="text-lg font-black italic uppercase">Total TTC: {totals.ttc.toFixed(3)} DT</p>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-red-600">Enregistrer le Bon</Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <Card>
          <CardHeader><CardTitle>Historique des Bons de Réception</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Bon</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold">{r.bonNumber}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.supplier}</TableCell>
                    <TableCell className="text-right font-bold">{r.totalTtc.toFixed(3)} DT</TableCell>
                    <TableCell>
                      {r.isValidated ? (
                        <span className="text-green-600 font-bold text-xs uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Validé</span>
                      ) : (
                        <span className="text-orange-600 font-bold text-xs uppercase italic underline decoration-dotted">En attente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                      {!r.isValidated && (
                        <Button variant="outline" size="sm" onClick={() => validateReceipt.mutate(r.id)} className="text-green-600 border-green-200 hover:bg-green-50">Valider</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Dashboard>
  );
}
