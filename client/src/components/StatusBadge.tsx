import { cn } from "@/lib/utils";
import { CARTE_GRISE_STATUS } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface StatusBadgeProps {
  status: string;
  onUpdate?: (newStatus: string) => void;
  editable?: boolean;
}

export function StatusBadge({ status, onUpdate, editable = false }: StatusBadgeProps) {
  const [currentStatus, setCurrentStatus] = useState(status);

  // Normalize status to remove quotes if CSV import was messy, though schema handles it
  const normalizedStatus = status?.replace(/['"]+/g, '') || "En cours";

  const getColor = (s: string) => {
    switch (s) {
      case "A Déposer": 
        return "bg-red-100 text-red-700 border-red-200 hover:bg-red-200";
      case "Récupérée": 
        return "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
      case "Impôt": 
        return "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200";
      case "En cours": 
        return "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200";
      case "Prête":
        return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
      case "None":
        return "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200";
      default: 
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleValueChange = (val: string) => {
    setCurrentStatus(val);
    if (onUpdate) onUpdate(val);
  };

  if (editable && onUpdate) {
    return (
      <Select value={currentStatus} onValueChange={handleValueChange}>
        <SelectTrigger 
          className={cn(
            "h-7 w-auto min-w-[110px] text-xs font-semibold rounded-full border px-3 transition-colors",
            getColor(currentStatus)
          )}
        >
          <span className="truncate">{currentStatus}</span>
        </SelectTrigger>
        <SelectContent>
          {CARTE_GRISE_STATUS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs font-medium">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      getColor(normalizedStatus)
    )}>
      {normalizedStatus}
    </span>
  );
}
