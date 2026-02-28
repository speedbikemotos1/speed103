import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PaymentData } from "@shared/schema";
import { Check, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PaymentCellProps {
  data: PaymentData;
  monthKey: string;
  isPastDue: boolean; // Calculated by parent (date < now)
  onUpdate: (data: PaymentData) => void;
  highlightFutureConvention?: boolean; // For \"CONVENTION STEG\" clients: future unpaid payments
}

export function PaymentCell({ data, monthKey, isPastDue, onUpdate, highlightFutureConvention }: PaymentCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(data.amount?.toString() || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAmount(data.amount?.toString() || "");
  }, [data.amount]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleTogglePaid = (e: React.MouseEvent) => {
    // Prevent toggling if clicking into input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    
    // Toggle status on simple click instead of shift/alt
    onUpdate({ ...data, isPaid: !data.isPaid });
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount !== data.amount) {
      onUpdate({ ...data, amount: numAmount });
    } else if (amount === "") {
        onUpdate({ ...data, amount: 0 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  // Status visual logic
  // Green: Paid
  // Red: Unpaid + Past Due
  // Grey: Unpaid + Future
  // Light orange: Future unpaid for CONVENTION STEG rows
  let bgClass = "bg-muted/30 hover:bg-muted/50";
  let textClass = "text-muted-foreground";
  
  if (data.isPaid) {
    bgClass = "bg-green-100/50 hover:bg-green-100 dark:bg-green-900/20";
    textClass = "text-green-700 dark:text-green-400 font-medium";
  } else if (isPastDue && (data.amount > 0)) {
    bgClass = "bg-red-50 hover:bg-red-100 dark:bg-red-900/20";
    textClass = "text-red-600 dark:text-red-400 font-medium";
  } else if (!isPastDue && highlightFutureConvention && data.amount > 0) {
    bgClass = "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20";
    textClass = "text-amber-700 dark:text-amber-400 font-medium";
  } else if (data.amount > 0) {
    textClass = "text-foreground font-medium";
  }

  return (
    <div 
      className={cn(
        "h-full w-full min-h-[40px] flex items-center justify-center p-1 cursor-pointer transition-colors border-r border-border/40 relative group",
        bgClass
      )}
      onClick={handleTogglePaid}
      onDoubleClick={() => setIsEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        onUpdate({ ...data, isPaid: !data.isPaid });
      }}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-7 w-20 text-xs px-1 text-center bg-background"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs", textClass)}>
            {data.amount > 0 ? data.amount.toLocaleString('fr-FR') : "-"}
          </span>
          {data.isPaid && <Check className="w-3 h-3 text-green-600" />}
          {!data.isPaid && isPastDue && data.amount > 0 && (
             <Tooltip>
               <TooltipTrigger>
                  <AlertCircle className="w-3 h-3 text-red-500" />
               </TooltipTrigger>
               <TooltipContent>Echéance dépassée</TooltipContent>
             </Tooltip>
          )}
        </div>
      )}
      
      {/* Hover tooltip for instructions - removed redundant span causing issues */}
    </div>
  );
}
