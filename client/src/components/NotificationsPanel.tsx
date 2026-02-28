import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Clock, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const unreadCount = notifications.filter(n => n.isRead === false).length;

  // Mark as read when panel opens
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const clearNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to clear notifications");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Succès", description: "Notifications supprimées." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer les notifications.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, unreadCount]);

  const formatNotificationDate = (timestamp: any) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } else {
      return format(date, "dd MMM yyyy 'à' HH:mm", { locale: fr });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover-elevate">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </h4>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => clearNotificationsMutation.mutate()}
              disabled={clearNotificationsMutation.isPending}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          <div className="flex flex-col">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune modification récente.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 border-b last:border-0 hover:bg-muted/50 transition-colors flex flex-col gap-2 ${
                    notif.isRead === false ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      notif.action === 'CRÉATION' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      notif.action === 'MODIFICATION' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      notif.action === 'IMPORT CSV' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {notif.action}
                    </span>
                    {notif.isRead === false && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-xs font-semibold">{notif.target}</div>
                  {notif.details && (
                    <div className="text-[11px] text-muted-foreground">{notif.details}</div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {notif.timestamp && formatNotificationDate(notif.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
