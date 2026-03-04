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
import { Package, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductFamily } from "@shared/schema";

export default function GestionStockPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: families = [] } = useQuery<ProductFamily[]>({ queryKey: ["/api/product-families"] });

  const createProduct = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setOpen(false);
      toast({ title: "Produit créé" });
    }
  });

  const createFamily = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/product-families", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-families"] });
      setFamilyOpen(false);
      toast({ title: "Famille créée" });
    }
  });

  return (
    <Dashboard contentOnly>
      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Package className="w-8 h-8" />
            <h1 className="text-3xl font-black italic uppercase">Gestion Stock</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={familyOpen} onOpenChange={setFamilyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Nouvelle Famille</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Créer une famille</DialogTitle></DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createFamily.mutate({ name: fd.get("name") });
                }} className="space-y-4">
                  <div><Label>Nom</Label><Input name="name" required /></div>
                  <Button type="submit" className="w-full">Enregistrer</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">Nouveau Produit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Créer un produit</DialogTitle></DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createProduct.mutate({
                    reference: fd.get("reference"),
                    designation: fd.get("designation"),
                    familyId: parseInt(fd.get("familyId") as string),
                    purchasePrice: parseFloat(fd.get("purchasePrice") as string),
                    sellPrice: parseFloat(fd.get("sellPrice") as string),
                    minimumStock: parseInt(fd.get("minimumStock") as string),
                  });
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Référence</Label><Input name="reference" required /></div>
                    <div><Label>Désignation</Label><Input name="designation" required /></div>
                  </div>
                  <div>
                    <Label>Famille</Label>
                    <Select name="familyId" required>
                      <SelectTrigger><SelectValue placeholder="Choisir une famille" /></SelectTrigger>
                      <SelectContent>
                        {families.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Prix Achat</Label><Input name="purchasePrice" type="number" step="0.01" required /></div>
                    <div><Label>Prix Vente</Label><Input name="sellPrice" type="number" step="0.01" required /></div>
                  </div>
                  <div><Label>Stock Minimum</Label><Input name="minimumStock" type="number" required /></div>
                  <Button type="submit" className="w-full">Enregistrer</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Card>
          <CardHeader><CardTitle>Inventaire des produits</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Prix Vente</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{p.reference}</TableCell>
                    <TableCell>{p.designation}</TableCell>
                    <TableCell>{families.find(f => f.id === p.familyId)?.name}</TableCell>
                    <TableCell className="text-right font-bold">{p.stockQuantity}</TableCell>
                    <TableCell className="text-right">{p.sellPrice.toFixed(3)} DT</TableCell>
                    <TableCell>
                      {p.stockQuantity <= p.minimumStock && (
                        <div className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase">
                          <AlertTriangle className="w-3 h-3" /> Stock Faible
                        </div>
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
