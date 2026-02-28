import { useSales, useUpdateSale, useDeleteSale } from "@/hooks/use-sales";
import { cn } from "@/lib/utils";
import { PAYMENT_MONTHS, SaleResponse, CARTE_GRISE_STATUS } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentCell } from "@/components/PaymentCell";
import { format, isPast, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, User, Trash2, Edit2, Download, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSaleSchema } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const editFormSchema = insertSaleSchema.extend({
  totalToPay: z.coerce.number(),
  advance: z.coerce.number(),
  paymentMonths: z.coerce.number().min(0).max(24).default(0),
  startMonth: z.string().optional(),
  paymentDay: z.coerce.number().optional(),
  divisionType: z.enum(["decimal", "rounded"]).default("rounded"),
});

export function SalesTable() {
  const { data: sales, isLoading, error } = useSales();
  const { user, logoutMutation } = useAuth();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());

  const toggleYear = (year: string) => {
    const next = new Set(collapsedYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    setCollapsedYears(next);
  };

  const years = useMemo(() => {
    const y = new Set<string>();
    PAYMENT_MONTHS.forEach(m => y.add(m.split('_')[1]));
    return Array.from(y).sort();
  }, []);
  const [editingSale, setEditingSale] = useState<SaleResponse | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null);
  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
  });

  const totalToPay = editForm.watch("totalToPay");
  const advance = editForm.watch("advance");
  const credit = Math.max(0, (totalToPay || 0) - (advance || 0));
  const paymentMonths = editForm.watch("paymentMonths");
  const startMonth = editForm.watch("startMonth");
  const divisionType = editForm.watch("divisionType");
  const clientType = editForm.watch("clientType");

  const onEditClick = (sale: SaleResponse) => {
    setEditingSale(sale);
    editForm.reset({
      ...sale,
      totalToPay: sale.totalToPay || 0,
      advance: sale.advance || 0,
      paymentMonths: 0,
      startMonth: PAYMENT_MONTHS[0],
      paymentDay: (sale as any).paymentDay || 1,
      divisionType: "rounded",
    });
  };

  const { toast } = useToast();
  const onEditSubmit = async (values: z.infer<typeof editFormSchema>) => {
    if (!editingSale) return;
    try {
      const { paymentMonths, startMonth, divisionType, ...saleData } = values;
      let finalPayments = saleData.payments;

      if (paymentMonths > 0 && startMonth && credit > 0) {
        const payments: Record<string, { amount: number; isPaid: boolean }> = {};
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
        finalPayments = payments;
      }

      await updateSale.mutateAsync({ id: editingSale.id, ...saleData, payments: finalPayments });
      toast({ title: "Succès", description: "La vente a été mise à jour." });
      setEditingSale(null);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const exportToCSV = () => {
    if (!filteredSales.length) return;
    
    const headers = [
      "N° Facture", "Date", "Désignation", "Type Client", "Nom/Prénom", 
      "N° Chassis", "Immatriculation", "Carte Grise", "Total à Payer", "Avance", "Crédit", "Echu"
    ];
    
    PAYMENT_MONTHS.forEach(m => {
      headers.push(m.replace('_', ' '));
    });

    const rows = filteredSales.map(sale => {
      let paidSum = 0;
      let dueSum = 0;
      const payments = (sale.payments as any) || {};
      
      PAYMENT_MONTHS.forEach(month => {
        const pData = payments[month] || { amount: 0, isPaid: false };
        if (pData.isPaid) paidSum += pData.amount;
        
        const [mStr, yStr] = month.split('_');
        const monthMap: any = { 'janvier':0,'fevrier':1,'mars':2,'avril':3,'mai':4,'juin':5,'juillet':6,'aout':7,'septembre':8,'octobre':9,'novembre':10,'decembre':11 };
        const dateObj = new Date(parseInt(yStr), monthMap[mStr.toLowerCase()] + 1, 0);
        if (isPast(dateObj) && !pData.isPaid && pData.amount > 0) dueSum += pData.amount;
      });

      const rest = (sale.totalToPay || 0) - (sale.advance || 0) - paidSum;
      const rowData = [
        sale.invoiceNumber, sale.date, sale.designation, sale.clientType, sale.clientName,
        sale.chassisNumber, sale.registrationNumber, sale.grayCardStatus, 
        sale.totalToPay, sale.advance, rest, dueSum
      ];

      PAYMENT_MONTHS.forEach(month => {
        const pData = payments[month] || { amount: 0, isPaid: false };
        const status = pData.isPaid ? "PAYÉ" : "NON PAYÉ";
        rowData.push(`${pData.amount} (${status})`);
      });

      return rowData.join(';');
    });

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_ventes_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!searchTerm) return sales;
    
    const normalize = (str: string) => 
      str.toLowerCase()
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "") // Remove accents
         .replace(/prete/g, "prete") // Handle specific replacements if needed
         .trim();

    const lowerTerm = normalize(searchTerm);
    
    return sales.filter(s => {
      const clientName = normalize(s.clientName);
      const invoiceNumber = normalize(s.invoiceNumber);
      const designation = normalize(s.designation);
      const chassisNumber = normalize(s.chassisNumber || "");
      const grayCardStatus = normalize(s.grayCardStatus || "");
      const clientType = normalize(s.clientType || "");
      const conventionName = normalize(s.conventionName || "");

      // Fuzzy matching for status
      const statusMatch = (term: string, status: string) => {
        if (term === "prete" && status.includes("prete")) return true;
        if ((term === "a deposer" || term === "a deper") && status.includes("a deposer")) return true;
        if (term === "impo" && status.includes("impot")) return true;
        return status.includes(term);
      };

      return clientName.includes(lowerTerm) || 
             invoiceNumber.includes(lowerTerm) ||
             designation.includes(lowerTerm) ||
             chassisNumber.includes(lowerTerm) ||
             statusMatch(lowerTerm, grayCardStatus) ||
             clientType.includes(lowerTerm) ||
             conventionName.includes(lowerTerm);
    });
  }, [sales, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-destructive/20 rounded-xl bg-destructive/5">
        <AlertCircle className="w-10 h-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive">Erreur de chargement</h3>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!sales?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Aucune vente trouvée</h3>
        <p className="text-muted-foreground mb-6">Commencez par ajouter une nouvelle vente.</p>
      </div>
    );
  }

  // Calculate Column Totals moved after early returns
  const totals = filteredSales.reduce((acc, sale) => {
    acc.totalToPay = (acc.totalToPay || 0) + (sale.totalToPay || 0);
    acc.advance = (acc.advance || 0) + (sale.advance || 0);
    
    // Calculate Rest & Due for this row first
    let paidSum = 0;
    let dueSum = 0;
    
    PAYMENT_MONTHS.forEach(month => {
      const pData = (sale.payments as any)?.[month] || { amount: 0, isPaid: false };
      if (pData.isPaid) paidSum += (pData.amount || 0);
      
      const [mStr, yStr] = month.split('_');
      const monthMap: Record<string, number> = {
        'janvier': 0, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'decembre': 11
      };
      const monthIdx = monthMap[mStr.toLowerCase()] || 0;
      
      // Get the last day of the month by default if paymentDay is not set or 1
      const year = parseInt(yStr);
      let paymentDay = (sale as any).paymentDay || 1;
      
      if (paymentDay === 1) {
        paymentDay = new Date(year, monthIdx + 1, 0).getDate();
      }
      
      const dateObj = new Date(year, monthIdx, paymentDay);
      
      if (isPast(dateObj) && !pData.isPaid && pData.amount > 0) {
        dueSum += (pData.amount || 0);
      }

      if (!pData.isPaid) {
        acc[month] = (acc[month] || 0) + (pData.amount || 0);
      }
    });

    const rest = (sale.totalToPay || 0) - (sale.advance || 0) - paidSum;
    
    acc.paid = (acc.paid || 0) + paidSum;
    acc.credit = (acc.credit || 0) + rest;
    acc.due = (acc.due || 0) + dueSum;
    
    return acc;
  }, {} as Record<string, number>);

  const stats = {
    paidPercent: totals.totalToPay ? Math.round(((totals.paid || 0) + (totals.advance || 0)) / totals.totalToPay * 100) : 0,
    creditPercent: totals.totalToPay ? Math.round((totals.credit || 0) / totals.totalToPay * 100) : 0,
    duePercent: totals.totalToPay ? Math.round((totals.due || 0) / totals.totalToPay * 100) : 0
  };


  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm shrink-0">
          <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
            <User className="w-5 h-5 text-muted-foreground shrink-0" />
            <Input 
              placeholder="Rechercher..." 
              className="w-full sm:max-w-md border-0 bg-muted/50 focus-visible:ring-0 focus-visible:bg-muted"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
             <div className="flex items-center gap-4 bg-muted/30 px-4 py-2 rounded-xl border border-primary/10">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-green-600">Payé</span>
                  <span className="text-sm font-black">{stats.paidPercent}%</span>
                </div>
                <div className="w-[1px] h-8 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-purple-600">Crédit</span>
                  <span className="text-sm font-black">{stats.creditPercent}%</span>
                </div>
                <div className="w-[1px] h-8 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-red-600">Échu</span>
                  <span className="text-sm font-black">{stats.duePercent}%</span>
                </div>
             </div>
             <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border">
                <User className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold truncate max-w-[100px]">{user?.username}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="w-3 h-3" />
                </Button>
             </div>
             <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
               <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exporter</span>
             </Button>
             <div className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                {filteredSales.length} rés.
             </div>
          </div>
       </div>

      <div className="rounded-xl border bg-card shadow-sm flex flex-col flex-1 min-h-0 relative">
        <div 
          className="overflow-x-auto overflow-y-auto custom-scrollbar w-full h-full" 
          style={{ 
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table className="min-w-[1500px] sm:min-w-[2800px] w-full border-separate border-spacing-0 caption-bottom text-sm" style={{ borderCollapse: 'separate' }}>
            <thead className="sticky top-0 z-50">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="w-[100px] border-r font-bold bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">N° Facture</TableHead>
                <TableHead className="w-[100px] bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">Date</TableHead>
                <TableHead className="w-[250px] bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">Désignation</TableHead>
                <TableHead className="w-[100px] bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">Type Client</TableHead>
                <TableHead className="w-[300px] sticky left-0 top-0 z-[60] font-bold bg-[#f8fafc] dark:bg-zinc-900 border-b shadow-[1px_0_0_0_#e2e8f0] px-4">Nom / Prénom</TableHead>
                <TableHead className="w-[100px] text-center bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">Actions</TableHead>
                <TableHead className="w-[150px] bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">N° Châssis</TableHead>
                <TableHead className="w-[120px] bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">Immat.</TableHead>
                <TableHead className="w-[130px] bg-[#f8fafc] dark:bg-zinc-900 border-b px-4">Carte Grise</TableHead>
                
                {/* Financials */}
                <TableHead className="w-[100px] text-center sticky top-0 sm:left-[300px] z-[60] bg-[#f0f7ff] dark:bg-blue-950 font-bold text-blue-700 dark:text-blue-400 !bg-opacity-100 border-b p-0 m-0 shadow-[1px_0_0_0_#bfdbfe] border-l border-blue-100">
                  <div className="px-2 py-2">Total</div>
                </TableHead>
                <TableHead className="w-[100px] text-center sticky top-0 sm:left-[400px] z-[60] bg-[#f0f7ff] dark:bg-blue-950 font-bold text-blue-700 dark:text-blue-400 !bg-opacity-100 border-b p-0 m-0 shadow-[1px_0_0_0_#bfdbfe]">
                  <div className="px-2 py-2">Avance</div>
                </TableHead>
                <TableHead className="w-[100px] text-center sticky top-0 sm:left-[500px] z-[60] bg-[#eefaf3] dark:bg-green-950 font-bold text-green-700 dark:text-green-400 !bg-opacity-100 border-b p-0 m-0 border-l border-green-100 shadow-[1px_0_0_0_#bbf7d0]">
                  <div className="px-2 py-2">Payé</div>
                </TableHead>
                <TableHead className="w-[100px] text-center sticky top-0 sm:left-[600px] z-[60] bg-[#f5f0ff] dark:bg-purple-950 font-bold text-purple-700 dark:text-purple-400 !bg-opacity-100 border-b p-0 m-0 border-l border-purple-100 shadow-[1px_0_0_0_#e9d5ff]">
                  <div className="px-2 py-2">Crédit</div>
                </TableHead>
                <TableHead className="w-[100px] text-center sticky top-0 sm:left-[700px] z-[60] bg-[#fff0f0] dark:bg-red-950 font-bold text-red-700 dark:text-red-400 !bg-opacity-100 border-b p-0 m-0 border-l border-r border-red-100 shadow-[1px_0_0_0_#fecaca]">
                  <div className="px-2 py-2">Échu</div>
                </TableHead>

                {/* Months grouped by year */}
                {years.map(year => {
                  const monthsInYear = PAYMENT_MONTHS.filter(m => m.split('_')[1] === year);
                  const isCollapsed = collapsedYears.has(year);

                  if (isCollapsed) {
                    return (
                      <TableHead 
                        key={year} 
                        className="w-[50px] text-center text-[10px] font-black cursor-pointer bg-slate-200 dark:bg-slate-800 border-r border-slate-300 sticky top-0 z-50 hover:bg-slate-300 transition-colors"
                        onClick={() => toggleYear(year)}
                      >
                        {year}
                      </TableHead>
                    );
                  }

                  return (
                    <th key={year} className="p-0 border-0 align-top" style={{ borderCollapse: 'collapse' }}>
                      <div className="flex">
                        <TableHead 
                          className="w-[30px] flex items-center justify-center cursor-pointer bg-slate-100 dark:bg-slate-900 border-r border-slate-200 hover:bg-slate-200 transition-colors sticky top-0 z-50 text-[10px] font-bold"
                          onClick={() => toggleYear(year)}
                        >
                          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{year}</span>
                        </TableHead>
                        {monthsInYear.map(month => {
                          const [m, y] = month.split('_');
                          const formatted = `${m.slice(0, 3)} ${y.slice(2)}`;
                          return (
                            <TableHead key={month} className="w-[90px] text-center text-xs font-semibold border-r border-border/50 capitalize px-1 sticky top-0 z-50 bg-[#f8fafc] dark:bg-zinc-900 border-b">
                              {formatted}
                            </TableHead>
                          );
                        })}
                      </div>
                    </th>
                  );
                })}
              </TableRow>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredSales.map((sale) => {
                // Row Calculations
                const payments = (sale.payments as Record<string, any>) || {};
                let paidSum = 0;
                let dueSum = 0;

                const isConventionSteg =
                  sale.clientType === "Convention" && 
                  (sale.conventionName?.toLowerCase().includes("steg") || 
                   sale.clientName?.toLowerCase().includes("convention steg"));

                PAYMENT_MONTHS.forEach(month => {
                    const pData = payments[month] || { amount: 0, isPaid: false };
                    if (pData.isPaid) paidSum += (pData.amount || 0);
                    
                    const [mStr, yStr] = month.split('_');
                    const monthMap: Record<string, number> = {
                      'janvier': 0, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
                      'juillet': 6, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'decembre': 11
                    };
                    const monthIdx = monthMap[mStr.toLowerCase()] || 0;
                    
                    const year = parseInt(yStr);
                    let paymentDay = (sale as any).paymentDay || 1;
                    if (paymentDay === 1) {
                      paymentDay = new Date(year, monthIdx + 1, 0).getDate();
                    }
                    
                    const dateObj = new Date(year, monthIdx, paymentDay);
                    
                    if (isPast(dateObj) && !pData.isPaid && pData.amount > 0) {
                      dueSum += (pData.amount || 0);
                    }
                });

                const rest = (sale.totalToPay || 0) - (sale.advance || 0) - paidSum;

                // Format date properly
                let formattedDate = sale.date;
                try {
                  if (sale.date && sale.date.includes('/')) {
                    // Parse DD/MM/YYYY format
                    const [day, month, year] = sale.date.split('/');
                    formattedDate = `${day}/${month}/${year}`;
                  } else if (sale.date && sale.date.includes('-')) {
                    // Parse YYYY-MM-DD format
                    const [year, month, day] = sale.date.split('-');
                    formattedDate = `${day}/${month}/${year}`;
                  }
                } catch (e) {
                  // Keep original if parsing fails
                }

                return (
                  <TableRow key={sale.id} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="bg-white dark:bg-zinc-950 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900 font-medium border-r">{sale.invoiceNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formattedDate}</TableCell>
                    <TableCell className="text-sm truncate max-w-[250px]">{sale.designation}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sale.clientType === "Convention" && sale.conventionName 
                        ? `${sale.clientType} - ${sale.conventionName}` 
                        : sale.clientType}
                    </TableCell>
                    <TableCell className="sticky left-0 bg-white dark:bg-zinc-950 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900 z-10 font-medium border-r truncate max-w-[300px] shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">{sale.clientName}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => onEditClick(sale)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingSaleId(sale.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{sale.chassisNumber || "-"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground bg-muted/30 rounded px-1">{sale.registrationNumber || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={sale.grayCardStatus || "En cours"} 
                        editable 
                        onUpdate={(newStatus) => updateSale.mutate({ id: sale.id, grayCardStatus: newStatus })}
                      />
                    </TableCell>

                    {/* Financials */}
                    <TableCell className="text-right font-medium border-l sticky sm:left-[300px] bg-[#f0f7ff] dark:bg-blue-950 z-10 !bg-opacity-100 p-0 m-0 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="px-4 py-2">{(sale.totalToPay || 0).toLocaleString('fr-FR')}</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground sticky sm:left-[400px] bg-[#f0f7ff] dark:bg-blue-950 z-10 !bg-opacity-100 p-0 m-0 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="px-4 py-2">{(sale.advance || 0).toLocaleString('fr-FR')}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600 border-l sticky sm:left-[500px] bg-[#eefaf3] dark:bg-green-950 z-10 !bg-opacity-100 p-0 m-0 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="px-4 py-2">{paidSum.toLocaleString('fr-FR')}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-purple-600 border-l sticky sm:left-[600px] bg-[#f5f0ff] dark:bg-purple-950 z-10 !bg-opacity-100 p-0 m-0 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="px-4 py-2">{rest.toLocaleString('fr-FR')}</div>
                    </TableCell>
                    <TableCell className={cn("text-right font-bold border-l border-r sticky sm:left-[700px] bg-[#fff0f0] dark:bg-red-950 z-10 !bg-opacity-100 p-0 m-0 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]", dueSum > 0 ? "text-red-600" : "text-muted-foreground")}>
                      <div className="px-4 py-2">{dueSum > 0 ? Math.round(dueSum).toLocaleString('fr-FR') : "-"}</div>
                    </TableCell>

                    {/* Payments Grid Grouped by Year */}
                    {years.map(year => {
                      const monthsInYear = PAYMENT_MONTHS.filter(m => m.split('_')[1] === year);
                      const isCollapsed = collapsedYears.has(year);

                      if (isCollapsed) {
                        let yearTotal = 0;
                        monthsInYear.forEach(m => {
                          const pData = payments[m] || { amount: 0, isPaid: false };
                          if (!pData.isPaid) yearTotal += pData.amount;
                        });
                        return (
                          <TableCell key={year} className="text-center bg-slate-50/50 dark:bg-slate-900/50 border-r text-[10px] font-bold text-muted-foreground whitespace-nowrap px-1">
                            {yearTotal > 0 ? yearTotal.toLocaleString('fr-FR') : '-'}
                          </TableCell>
                        );
                      }

                      return (
                        <td key={year} className="p-0 border-0 align-top">
                          <div className="flex">
                            <div className="w-[30px] border-r border-slate-100 dark:border-slate-800 bg-slate-50/20" />
                            {monthsInYear.map(month => {
                              const [mStr, yStr] = month.split('_');
                              const monthMap: Record<string, number> = {
                                'janvier': 0, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
                                'juillet': 6, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'decembre': 11
                              };
                              const monthIdx = monthMap[mStr.toLowerCase()] || 0;
                              const dateObj = new Date(parseInt(yStr), monthIdx + 1, 0); 
                              const isMonthPast = isPast(dateObj);

                              const pData = payments[month] || { amount: 0, isPaid: false };
                              
                              return (
                                <div key={month} className="w-[90px] h-[45px] border-r border-border/30">
                                  <PaymentCell 
                                    data={pData}
                                    monthKey={month}
                                    isPastDue={isMonthPast}
                                    highlightFutureConvention={isConventionSteg}
                                    onUpdate={(newData) => {
                                      const newPayments = { ...payments, [month]: newData };
                                      updateSale.mutate({ id: sale.id, payments: newPayments });
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </TableRow>
                );
              })}
              
              <TableRow className="bg-muted font-bold sticky bottom-0 z-30 shadow-md border-t-2 border-primary/20">
                 <TableCell className="bg-muted border-r" colSpan={4}>TOTAUX</TableCell>
                 <TableCell className="sticky left-0 bg-muted z-40 border-r truncate max-w-[300px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" colSpan={5}></TableCell>
                 <TableCell className="text-right border-l text-blue-700 bg-[#f0f7ff] dark:bg-blue-950 sticky sm:left-[300px] z-40 !bg-opacity-100 p-0 m-0"><div className="px-4 py-2">{totals.totalToPay?.toLocaleString('fr-FR')}</div></TableCell>
                 <TableCell className="text-right text-blue-700 bg-[#f0f7ff] dark:bg-blue-950 sticky sm:left-[400px] z-40 !bg-opacity-100 p-0 m-0"><div className="px-4 py-2">{totals.advance?.toLocaleString('fr-FR')}</div></TableCell>
                 <TableCell className="text-right border-l text-green-700 bg-[#eefaf3] dark:bg-green-950 sticky sm:left-[500px] z-40 !bg-opacity-100 p-0 m-0"><div className="px-4 py-2">{totals.paid?.toLocaleString('fr-FR')}</div></TableCell>
                 <TableCell className="text-right border-l text-purple-700 bg-[#f5f0ff] dark:bg-purple-950 sticky sm:left-[600px] z-40 !bg-opacity-100 p-0 m-0"><div className="px-4 py-2">{totals.credit?.toLocaleString('fr-FR')}</div></TableCell>
                 <TableCell className="text-right border-l border-r text-red-700 bg-[#fff0f0] dark:bg-red-950 sticky sm:left-[700px] z-40 !bg-opacity-100 p-0 m-0"><div className="px-4 py-2">{totals.due?.toLocaleString('fr-FR')}</div></TableCell>
                 
                 {years.map(year => {
                   const monthsInYear = PAYMENT_MONTHS.filter(m => m.split('_')[1] === year);
                   const isCollapsed = collapsedYears.has(year);

                   if (isCollapsed) {
                     let yearTotal = 0;
                     monthsInYear.forEach(m => {
                       yearTotal += (totals[m] || 0);
                     });
                     return (
                       <TableCell key={year} className="text-center text-[10px] font-bold bg-slate-200 dark:bg-slate-800 border-r">
                         {yearTotal ? yearTotal.toLocaleString('fr-FR') : ''}
                       </TableCell>
                     );
                   }

                   return (
                     <td key={year} className="p-0 border-0 align-top">
                       <div className="flex bg-muted">
                         <div className="w-[30px] border-r border-slate-300" />
                         {monthsInYear.map(month => (
                           <div key={month} className="w-[90px] text-center text-xs p-1 text-muted-foreground border-r border-border/30">
                             {totals[month] ? totals[month].toLocaleString('fr-FR') : ''}
                           </div>
                         ))}
                       </div>
                     </td>
                   );
                 })}
              </TableRow>

            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la Vente</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° Facture</Label>
                <Input {...editForm.register("invoiceNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input {...editForm.register("date")} readOnly />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Désignation</Label>
                <Input {...editForm.register("designation")} />
              </div>
              <div className="space-y-2">
                <Label>Type Client</Label>
                <Select 
                  onValueChange={(val) => {
                    editForm.setValue("clientType", val);
                    if (val !== "Convention") {
                      editForm.setValue("conventionName", "");
                    }
                  }} 
                  defaultValue={editingSale?.clientType || "B2C"}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Input {...editForm.register("clientName")} />
              </div>
              {clientType === "Convention" && (
                <div className="space-y-2">
                  <Label>Nom de la Convention</Label>
                  <Input {...editForm.register("conventionName")} placeholder="Ex: convention steg" />
                </div>
              )}
              <div className="space-y-2">
                <Label>N° Châssis</Label>
                <Input {...editForm.register("chassisNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Immatriculation</Label>
                <Input {...editForm.register("registrationNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Carte Grise</Label>
                <Select 
                  onValueChange={(val) => editForm.setValue("grayCardStatus", val)} 
                  defaultValue={editingSale?.grayCardStatus || ""}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARTE_GRISE_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total à Payer</Label>
                <Input type="number" {...editForm.register("totalToPay")} />
              </div>
              <div className="space-y-2">
                <Label>Avance</Label>
                <Input type="number" {...editForm.register("advance")} />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-600 font-bold">Crédit (Reste)</Label>
                <Input value={credit.toLocaleString('fr-FR')} disabled className="bg-purple-50 font-bold text-purple-700" />
              </div>
              <div className="space-y-2">
                <Label>Rediviser le crédit</Label>
                <Select onValueChange={(val) => editForm.setValue("paymentMonths", parseInt(val))} defaultValue="0">
                  <SelectTrigger>
                    <SelectValue placeholder="Garder actuel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Garder actuel</SelectItem>
                    {[...Array(24)].map((_, i) => (
                      <SelectItem key={i+1} value={(i+1).toString()}>{i+1} mois</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de division</Label>
                <Select onValueChange={(val) => editForm.setValue("divisionType", val as "decimal" | "rounded")} defaultValue="rounded">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Arrondi (nombres entiers)</SelectItem>
                    <SelectItem value="decimal">Décimal (montants exacts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Jour de début (Modifie l'échéance)</Label>
                <Select 
                  onValueChange={(val) => editForm.setValue("paymentDay", parseInt(val))}
                  defaultValue={editForm.getValues("paymentDay")?.toString() || "1"}
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

              {paymentMonths > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Mois de début</Label>
                  <Input 
                    type="month"
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      const monthNames = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
                      const monthKey = `${monthNames[parseInt(month) - 1]}_${year}`;
                      editForm.setValue("startMonth", monthKey);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingSale(null)}>Annuler</Button>
              <Button type="submit" disabled={updateSale.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modern Delete Confirmation */}
      <Dialog open={!!deletingSaleId} onOpenChange={(open) => !open && setDeletingSaleId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible et toutes les données associées seront perdues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeletingSaleId(null)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (deletingSaleId) {
                  try {
                    await deleteSale.mutateAsync(deletingSaleId);
                    toast({ title: "Succès", description: "La vente a été supprimée." });
                    setDeletingSaleId(null);
                  } catch (err: any) {
                    toast({ title: "Erreur", description: err.message, variant: "destructive" });
                  }
                }
              }}
              disabled={deleteSale.isPending}
            >
              {deleteSale.isPending ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
