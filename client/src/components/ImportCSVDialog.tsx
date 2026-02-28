import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function ImportCSVDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    added: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const importMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      const response = await fetch("/api/sales/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          csv: csvContent,
          skipDuplicates: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import CSV");
      }

      return response.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      toast({
        title: "Import réussi",
        description: `${result.added} nouveaux enregistrements ajoutés${result.skipped > 0 ? `, ${result.skipped} doublons ignorés` : ""}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Fichier invalide",
          description: "Veuillez sélectionner un fichier CSV",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      // Convert to base64 for transmission (browser-compatible)
      const base64 = btoa(unescape(encodeURIComponent(content)));
      importMutation.mutate(base64);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Importer CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importer un fichier CSV</DialogTitle>
          <DialogDescription>
            Sélectionnez un fichier CSV pour importer de nouvelles données. Les doublons (même numéro de facture) seront automatiquement ignorés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!file && !importResult && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Sélectionnez un fichier CSV</p>
                <p className="text-xs text-muted-foreground">
                  Format attendu: SUIVI_CARTES_GRISES
                </p>
              </div>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button asChild variant="outline">
                  <span>Choisir un fichier</span>
                </Button>
              </label>
            </div>
          )}

          {file && !importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="flex-1"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={importMutation.isPending}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  {importResult.added > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Import terminé</p>
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <p>Total traité: {importResult.total}</p>
                      <p className="text-green-600">
                        Nouveaux ajoutés: {importResult.added}
                      </p>
                      {importResult.skipped > 0 && (
                        <p className="text-orange-600">
                          Doublons ignorés: {importResult.skipped}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-xs max-h-40 overflow-y-auto">
                    <p className="font-medium text-destructive mb-2">
                      Erreurs et lignes ignorées ({importResult.errors.length}):
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-destructive/80">
                      {importResult.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx} className="break-words">{error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>... et {importResult.errors.length - 10} autres</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    handleReset();
                  }}
                  className="flex-1"
                >
                  Fermer
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  Importer un autre fichier
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
