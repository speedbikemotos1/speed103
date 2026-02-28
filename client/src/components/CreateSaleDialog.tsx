import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSaleSchema, PAYMENT_MONTHS, CARTE_GRISE_STATUS } from "@shared/schema";
import { useCreateSale } from "@/hooks/use-sales";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Calendar } from "lucide-react";
import { z } from "zod";

const formSchema = insertSaleSchema.extend({
  totalToPay: z.coerce.number(),
  advance: z.coerce.number(),
  paymentMonths: z.coerce.number().min(0).max(24).default(0),
  startMonth: z.string().optional(),
  divisionType: z.enum(["decimal", "rounded"]).default("rounded"),
});

export function CreateSaleDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createSale = useCreateSale();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      date: new Date().toISOString().split('T')[0],
      designation: "",
      clientType: "B2C",
      clientName: "",
      chassisNumber: "",
      registrationNumber: "",
      grayCardStatus: "A Déposer",
      conventionName: "",
      totalToPay: 0,
      advance: 0,
      payments: {},
      paymentMonths: 0,
      startMonth: PAYMENT_MONTHS[0],
      paymentDay: 1,
      divisionType: "rounded",
    }
  });

  const totalToPay = form.watch("totalToPay");
  const advance = form.watch("advance");
  const credit = Math.max(0, (totalToPay || 0) - (advance || 0));
  const paymentMonths = form.watch("paymentMonths");
  const startMonth = form.watch("startMonth");
  const divisionType = form.watch("divisionType");
  const clientType = form.watch("clientType");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { paymentMonths, startMonth, divisionType, ...saleData } = values;
      const payments: Record<string, { amount: number; isPaid: boolean }> = {};
      
      if (paymentMonths > 0 && startMonth && credit > 0) {
        const startIndex = PAYMENT_MONTHS.indexOf(startMonth as any);
        
        if (divisionType === "decimal") {
          // Decimal division: divide evenly with decimals
          const monthlyAmount = credit / paymentMonths;
          for (let i = 0; i < paymentMonths; i++) {
            const monthIndex = startIndex + i;
            if (monthIndex < PAYMENT_MONTHS.length) {
              payments[PAYMENT_MONTHS[monthIndex]] = {
                amount: monthlyAmount,
                isPaid: false
              };
            }
          }
        } else {
          // Rounded division: round down and distribute remainder to first payments (smaller numbers first)
          const monthlyAmount = Math.floor(credit / paymentMonths);
          const remainder = credit % paymentMonths;
          
          for (let i = 0; i < paymentMonths; i++) {
            const monthIndex = startIndex + i;
            if (monthIndex < PAYMENT_MONTHS.length) {
              // Distribute remainder to first payments
              const extra = i < remainder ? 1 : 0;
              payments[PAYMENT_MONTHS[monthIndex]] = {
                amount: monthlyAmount + extra,
                isPaid: false
              };
            }
          }
        }
      }
      
      await createSale.mutateAsync({ ...saleData, payments });
      toast({ title: "Succès", description: "La vente a été enregistrée avec succès." });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
          <Plus className="w-4 h-4" /> Nouvelle Vente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-display">Nouvelle Vente</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N° Facture</Label>
              <Input {...form.register("invoiceNumber")} placeholder="Ex: F2025-001" />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <div className="relative">
                <Input 
                  type="date"
                  {...form.register("date")} 
                  className="block w-full"
                  onChange={(e) => {
                    const value = e.target.value;
                    form.setValue("date", value);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Désignation</Label>
              <Input {...form.register("designation")} />
            </div>

            <div className="space-y-2">
              <Label>Type Client</Label>
              <Select onValueChange={(val) => {
                form.setValue("clientType", val);
                if (val !== "Convention") {
                  form.setValue("conventionName", "");
                }
              }} defaultValue="B2C">
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2C">B2C (Particulier)</SelectItem>
                  <SelectItem value="B2B">B2B (Professionnel)</SelectItem>
                  <SelectItem value="Convention">Convention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nom / Prénom</Label>
              <Input {...form.register("clientName")} />
            </div>

            {clientType === "Convention" && (
              <div className="space-y-2">
                <Label>Nom de la Convention</Label>
                <Input {...form.register("conventionName")} placeholder="Ex: convention steg" />
              </div>
            )}

            <div className="space-y-2">
              <Label>N° Châssis</Label>
              <Input {...form.register("chassisNumber")} />
            </div>

            <div className="space-y-2">
              <Label>Immatriculation</Label>
              <Input {...form.register("registrationNumber")} />
            </div>

            <div className="space-y-2">
              <Label>Carte Grise</Label>
              <Select onValueChange={(val) => form.setValue("grayCardStatus", val)} defaultValue="A Déposer">
                <SelectTrigger>
                  <SelectValue placeholder="Statut..." />
                </SelectTrigger>
                <SelectContent>
                  {CARTE_GRISE_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total à Payer (TND)</Label>
              <Input type="number" step="0.01" {...form.register("totalToPay")} />
            </div>

            <div className="space-y-2">
              <Label>Avance (TND)</Label>
              <Input type="number" step="0.01" {...form.register("advance")} />
            </div>

            <div className="space-y-2">
              <Label className="text-purple-600 font-bold">Crédit (Reste)</Label>
              <Input value={credit.toLocaleString('fr-FR')} disabled className="bg-purple-50 font-bold text-purple-700" />
            </div>

            <div className="space-y-2">
              <Label>Nombre de mensualités</Label>
              <Select onValueChange={(val) => form.setValue("paymentMonths", parseInt(val))} defaultValue="0">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n === 0 ? "Aucun" : `${n} mois`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentMonths > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Type de division</Label>
                  <Select onValueChange={(val) => form.setValue("divisionType", val as "decimal" | "rounded")} defaultValue="rounded">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rounded">Arrondi (nombres entiers)</SelectItem>
                      <SelectItem value="decimal">Décimal (montants exacts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mois de début</Label>
                  <Input 
                    type="month"
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      const monthNames = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
                      const monthKey = `${monthNames[parseInt(month) - 1]}_${year}`;
                      form.setValue("startMonth", monthKey);
                    }}
                    defaultValue={`${PAYMENT_MONTHS[0].split('_')[1]}-${String(1 + ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"].indexOf(PAYMENT_MONTHS[0].split('_')[0].toLowerCase())).padStart(2, '0')}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jour de début</Label>
                  <Select 
                    onValueChange={(val) => form.setValue("paymentDay", parseInt(val))} 
                    defaultValue={form.getValues("paymentDay")?.toString() || "1"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Jour..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createSale.isPending}>
              {createSale.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</> : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
