import { useState, useMemo } from "react";
import Dashboard from "@/pages/Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users, Edit2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from "@/hooks/use-clients";

export default function GestionClientsPage() {
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const updateClient = useUpdateClient();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    nomPrenom: "",
    numeroTelephone: "",
    remarque: "",
    hasSubClient: false,
    subClientName: "",
    subClientPhone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateClient.mutateAsync({ id: editingId, ...form });
        toast({ title: "Succès", description: "Client modifié" });
      } else {
        await createClient.mutateAsync(form);
        toast({ title: "Succès", description: "Client créé" });
      }
      setOpen(false);
      setEditingId(null);
      setForm({
        nomPrenom: "",
        numeroTelephone: "",
        remarque: "",
        hasSubClient: false,
        subClientName: "",
        subClientPhone: "",
      });
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

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Use uniqueNumber for ordering if available, otherwise preserve DB order (which is import order)
    const sorted = [...clients].sort((a, b) => (b.uniqueNumber || 0) - (a.uniqueNumber || 0));
    if (!q) return sorted;
    return sorted.filter((c) => {
      const name = c.nomPrenom?.toLowerCase() ?? "";
      const phone = c.numeroTelephone?.toLowerCase() ?? "";
      const subName = c.subClientName?.toLowerCase() ?? "";
      const subPhone = c.subClientPhone?.toLowerCase() ?? "";
      const remark = c.remarque?.toLowerCase() ?? "";
      return (
        name.includes(q) ||
        phone.includes(q) ||
        subName.includes(q) ||
        subPhone.includes(q) ||
        remark.includes(q)
      );
    });
  }, [clients, search]);

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

          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                setEditingId(null);
                setForm({
                  nomPrenom: "",
                  numeroTelephone: "",
                  remarque: "",
                  hasSubClient: false,
                  subClientName: "",
                  subClientPhone: "",
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                <Plus className="w-5 h-5 stroke-[3px]" /> Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-[2rem] border-none shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">
                  {editingId ? "Modifier un client" : "Créer un client"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-4">
                <div className="grid gap-2">
                  <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Nom / Prénom</Label>
                  <Input value={form.nomPrenom} onChange={(e) => setForm({ ...form, nomPrenom: e.target.value })} required className="h-12 rounded-xl border-gray-200 font-medium" />
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold text-gray-700 uppercase tracking-wider text-xs px-1">Téléphone</Label>
                  <Input value={form.numeroTelephone} onChange={(e) => setForm({ ...form, numeroTelephone: e.target.value })} className="h-12 rounded-xl border-gray-200 font-medium" placeholder="Ex: 55 123 456" />
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="hasSubClient"
                    checked={form.hasSubClient}
                    onChange={(e) => setForm({ ...form, hasSubClient: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <Label htmlFor="hasSubClient" className="font-bold text-gray-700 uppercase tracking-wider text-xs cursor-pointer">Deuxième numéro / Sous-client</Label>
                </div>

                {form.hasSubClient && (
                  <div className="grid gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <div className="grid gap-2">
                      <Label className="font-bold text-gray-700 uppercase tracking-wider text-[10px] px-1">Nom Sous-client (Optionnel)</Label>
                      <Input value={form.subClientName || ""} onChange={(e) => setForm({ ...form, subClientName: e.target.value })} className="h-11 rounded-xl border-gray-200 bg-white font-medium" placeholder="Ex: Mme Flen" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold text-gray-700 uppercase tracking-wider text-[10px] px-1">Téléphone Sous-client</Label>
                      <Input value={form.subClientPhone || ""} onChange={(e) => setForm({ ...form, subClientPhone: e.target.value })} className="h-11 rounded-xl border-gray-200 bg-white font-medium" placeholder="Ex: 98 765 432" />
                    </div>
                  </div>
                )}

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

        <Card className="border-gray-200 shadow-2xl bg-white/90 backdrop-blur-md overflow-hidden rounded-[2.5rem] ring-1 ring-gray-100/80">
          <CardHeader className="border-b border-gray-100/80 bg-gradient-to-r from-slate-50/90 to-gray-50/90 flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-gray-900 uppercase tracking-widest">Liste clients</CardTitle>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher nom, téléphone, remarque..."
                className="h-11 pl-10 rounded-xl border-gray-200 bg-white/80 font-medium text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/90 hover:bg-slate-50/90 border-b-2 border-slate-100">
                    <TableHead className="font-black text-slate-700 h-14 w-14 text-center uppercase tracking-widest text-[10px]">N° Unique</TableHead>
                    <TableHead className="font-black text-slate-700 h-14 uppercase tracking-widest text-[10px]">Nom / Prénom</TableHead>
                    <TableHead className="font-black text-slate-700 h-14 uppercase tracking-widest text-[10px]">Téléphone(s)</TableHead>
                    <TableHead className="font-black text-slate-700 h-14 uppercase tracking-widest text-[10px] min-w-[180px]">Remarque</TableHead>
                    <TableHead className="text-right font-black text-slate-700 h-14 uppercase tracking-widest text-[10px] pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((c) => (
                    <TableRow
                      key={c.id}
                      className="transition-all duration-200 h-16 border-b border-gray-50/80 group hover:bg-slate-50/50 last:border-b-0"
                    >
                      <TableCell className="py-4 text-center font-bold text-slate-500 tabular-nums w-14">{c.uniqueNumber || "—"}</TableCell>
                      <TableCell className="py-4 font-bold text-gray-900">
                        {c.nomPrenom}
                        {c.hasSubClient && c.subClientName && (
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">
                            Sous-client: {c.subClientName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4 font-medium text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          <span className="tabular-nums">{c.numeroTelephone || "—"}</span>
                          {c.hasSubClient && c.subClientPhone && (
                            <span className="text-[11px] text-slate-400 tabular-nums flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              {c.subClientPhone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-medium text-gray-500 max-w-[220px] truncate" title={c.remarque || ""}>{c.remarque || "—"}</TableCell>
                      <TableCell className="text-right py-4 pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(c.id);
                              setForm({
                                nomPrenom: c.nomPrenom,
                                numeroTelephone: c.numeroTelephone || "",
                                remarque: c.remarque || "",
                                hasSubClient: c.hasSubClient || false,
                                subClientName: c.subClientName || "",
                                subClientPhone: c.subClientPhone || "",
                              });
                              setOpen(true);
                            }}
                            className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white shadow-sm transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c.id)}
                            className="h-10 w-10 rounded-xl text-red-400 hover:text-red-700 hover:bg-white shadow-sm transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredClients.length === 0 && (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">{search ? "Aucun client trouvé" : "Aucun client enregistré"}</p>
                <p className="text-xs text-gray-400 mt-1">{search ? "Essayez une autre recherche" : "Cliquez sur Nouveau client pour commencer"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Dashboard>
  );
}

