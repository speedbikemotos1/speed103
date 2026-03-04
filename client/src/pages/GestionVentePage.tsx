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
import { Tabs, TabsContent, List, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, CheckCircle, ArrowRight, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Devis, BonLivraison, Facture, Product, Client } from "@shared/schema";

export default function GestionVentePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("devis");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<any[]>([]);

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: devisList = [] } = useQuery<Devis[]>({ queryKey: ["/api/devis"] });
  const { data: blList = [] } = useQuery<BonLivraison[]>({ queryKey: ["/api/bl"] });
  const { data: factures = [] } = useQuery<Facture[]>({ queryKey: ["/api/factures"] });

  const createDevis = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/devis", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devis"] });
      setOpen(false);
      setLines([]);
      toast({ title: "Devis créé" });
    }
  });

  const convertToBl = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => apiRequest("POST", `/api/devis/${id}/convert-to-bl`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bl"] });
      toast({ title: "Devis converti en BL" });
    }
  });

  const validateBl = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/bl/${id}/validate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bl"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "BL validé et stock mis à jour" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  });

  const createFacture = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => apiRequest("POST", `/api/bl/${id}/create-facture`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bl"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factures"] });
      toast({ title: "Facture générée" });
    }
  });

  const addLine = (productId: string) => {
    const p = products.find(prod => prod.id === parseInt(productId));
    if (!p) return;
    setLines([...lines, {
      productId: p.id,
      reference: p.reference,
      designation: p.designation,
      quantity: 1,
      unitPrice: p.sellPrice,
      tva: p.tva,
      discount: 0
    }]);
  };

  const calculateTotals = () => {
    let ht = 0, tva = 0;
    lines.forEach(l => {
      const lineHt = l.quantity * l.unitPrice * (1 - (l.discount || 0) / 100);
      ht += lineHt;
      tva += lineHt * ((l.tva || 0) / 100);
    });
    return { 
      ht: Number(ht.toFixed(3)), 
      tva: Number(tva.toFixed(3)), 
      ttc: Number((ht + tva).toFixed(3)) 
    };
  };

  const totals = calculateTotals();

  return (
    <Dashboard contentOnly>
      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8" />
            <h1 className="text-3xl font-black italic uppercase">Gestion Vente</h1>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" /> Nouveau Devis
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="devis">Offres de Prix (Devis)</TabsTrigger>
            <TabsTrigger value="bl">Bons de Livraison</TabsTrigger>
            <TabsTrigger value="facture">Factures</TabsTrigger>
          </TabsList>

          <TabsContent value="devis">
            <Card>
              <CardHeader><CardTitle>Liste des Devis</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Devis</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total TTC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devisList.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-bold">{d.devisNumber}</TableCell>
                        <TableCell>{clients.find(c => c.id === d.clientId)?.nomPrenom}</TableCell>
                        <TableCell className="text-right font-bold">{d.totalTtc.toFixed(3)} DT</TableCell>
                        <TableCell>{d.status}</TableCell>
                        <TableCell className="text-right">
                          {d.status === "En attente" && (
                            <Button variant="outline" size="sm" onClick={() => convertToBl.mutate({ id: d.id, data: { blNumber: `BL-${d.devisNumber}`, date: new Date().toISOString().split('T')[0] } })}>
                              Convertir en BL <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bl">
            <Card>
              <CardHeader><CardTitle>Liste des BL</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° BL</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total TTC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blList.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-bold">{b.blNumber}</TableCell>
                        <TableCell>{clients.find(c => c.id === b.clientId)?.nomPrenom}</TableCell>
                        <TableCell className="text-right font-bold">{b.totalTtc.toFixed(3)} DT</TableCell>
                        <TableCell>{b.status}</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          {!b.isValidated && (
                            <Button variant="outline" size="sm" className="text-green-600 border-green-200" onClick={() => validateBl.mutate(b.id)}>Valider</Button>
                          )}
                          {b.isValidated && !b.factureId && (
                            <Button variant="outline" size="sm" onClick={() => createFacture.mutate({ id: b.id, data: { factureNumber: `FACT-${b.blNumber}`, date: new Date().toISOString().split('T')[0], timbreFiscal: 1, fodec: Number((b.totalHt * 0.01).toFixed(3)), totalNet: Number((b.totalTtc + 1 + (b.totalHt * 0.01)).toFixed(3)) } })}>
                              Facturer
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facture">
            <Card>
              <CardHeader><CardTitle>Liste des Factures</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Net à Payer</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factures.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-bold">{f.factureNumber}</TableCell>
                        <TableCell>{clients.find(c => c.id === f.clientId)?.nomPrenom}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{f.totalNet.toFixed(3)} DT</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon"><Printer className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau Devis</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createDevis.mutate({
                data: {
                  devisNumber: fd.get("number"),
                  date: fd.get("date"),
                  clientId: parseInt(fd.get("clientId") as string),
                  commercial: fd.get("commercial"),
                  ...totals
                },
                lines
              });
            }} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>N° Devis</Label><Input name="number" required /></div>
                <div><Label>Date</Label><Input name="date" type="date" required /></div>
                <div>
                  <Label>Client</Label>
                  <Select name="clientId" required>
                    <SelectTrigger><SelectValue placeholder="Choisir client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nomPrenom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ajouter un produit</Label>
                <Select onValueChange={addLine}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner produit" /></SelectTrigger>
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
                    <TableHead>Prix Unit HT</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-bold">{l.reference}<br/><span className="font-normal text-gray-500">{l.designation}</span></TableCell>
                      <TableCell><Input type="number" className="w-20" value={l.quantity} onChange={e => {
                        const newLines = [...lines];
                        newLines[idx].quantity = parseInt(e.target.value) || 0;
                        setLines(newLines);
                      }} /></TableCell>
                      <TableCell><Input type="number" step="0.001" className="w-24" value={l.unitPrice} onChange={e => {
                        const newLines = [...lines];
                        newLines[idx].unitPrice = parseFloat(e.target.value) || 0;
                        setLines(newLines);
                      }} /></TableCell>
                      <TableCell className="text-right font-bold">{(l.quantity * l.unitPrice).toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm">Total HT: <span className="font-bold">{totals.ht.toFixed(3)}</span></p>
                  <p className="text-lg font-black uppercase italic">Total TTC: {totals.ttc.toFixed(3)} DT</p>
                </div>
              </div>

              <Button type="submit" className="w-full bg-red-600">Enregistrer Devis</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Dashboard>
  );
}
