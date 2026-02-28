import { useState } from "react";
import Dashboard from "@/pages/Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/use-clients";

export default function GestionClientsPage() {
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nomPrenom: "",
    numeroTelephone: "",
    remarque: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient.mutateAsync(form);
      toast({ title: "Succès", description: "Client créé" });
      setOpen(false);
      setForm({ nomPrenom: "", numeroTelephone: "", remarque: "" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Création impossible", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce client ?")) return;
    try {
      await deleteClient.mutateAsync(id);
      toast({ title: "Supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Suppression impossible", variant: "destructive" });
    }
  };

  return (
    <Dashboard contentOnly>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen animate-enter">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-lg ring-4 ring-white">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">Gestion Clients</h1>
              <p className="text-gray-500 font-medium">Créer et gérer vos clients.</p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                <Plus className="w-5 h-5 stroke-[3px]" /> Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-[2rem] border-none shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Créer un client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-4">
                <div className="grid gap-2">
                  <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Nom / Prénom</Label>
                  <Input value={form.nomPrenom} onChange={(e) => setForm({ ...form, nomPrenom: e.target.value })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Téléphone</Label>
                  <Input value={form.numeroTelephone} onChange={(e) => setForm({ ...form, numeroTelephone: e.target.value })} className="h-12 rounded-xl border-gray-200 font-medium" placeholder="Optionnel" />
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Remarque</Label>
                  <Input value={form.remarque} onChange={(e) => setForm({ ...form, remarque: e.target.value })} className="h-12 rounded-xl border-gray-200 font-medium" placeholder="Optionnel" />
                </div>
                <Button type="submit" className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg mt-4">
                  Enregistrer
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <Card className="border-gray-200 shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden rounded-[2.5rem]">
          <CardHeader className="border-b bg-white/60">
            <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest">Liste clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b-2 border-gray-100">
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Nom/Prénom</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Téléphone</TableHead>
                    <TableHead className="font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Remarque</TableHead>
                    <TableHead className="text-right font-black text-gray-900 h-16 uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id} className="transition-all duration-200 h-16 border-b border-gray-50 group hover:bg-gray-50/50">
                      <TableCell className="py-4 font-bold">{c.nomPrenom}</TableCell>
                      <TableCell className="py-4 font-medium">{c.numeroTelephone || "-"}</TableCell>
                      <TableCell className="py-4 font-medium text-gray-500">{c.remarque || "-"}</TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-10 w-10 rounded-xl text-red-400 hover:text-red-700 hover:bg-white shadow-sm transition-all">
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

