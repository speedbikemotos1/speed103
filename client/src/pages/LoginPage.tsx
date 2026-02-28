import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { Redirect } from "wouter";
import logoImg from "@assets/LOGOBranding_1771926826080.png";

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "password", // Dummy password to satisfy LocalStrategy
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = (data: { username: string; password?: string }) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-1 bg-white rounded-full overflow-hidden border shadow-lg w-28 h-28 transform transition-transform hover:scale-105">
            <img src={logoImg} alt="Speed Bike Motos" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">Speed Bike Motos</h1>
            <p className="text-muted-foreground mt-2">Système de gestion des ventes et des paiements</p>
          </div>
        </div>

        <Card className="shadow-2xl border-none ring-1 ring-black/5">
          <CardHeader className="space-y-1">
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold">Nom d'utilisateur</Label>
                <div className="relative group">
                  <Input
                    id="username"
                    {...form.register("username", { required: true })}
                    className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                    autoComplete="username"
                    autoFocus
                  />
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full h-11 font-bold text-base transition-all active:scale-[0.98]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connexion...
                  </>
                ) : (
                  "Accéder au système"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Speed Bike Motos. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
