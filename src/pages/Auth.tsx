import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FlowBackground } from "@/components/FlowBackground";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { SofiaAvatarIcon } from "@/lib/sofia-icons";

export default function Auth() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) navigate("/app", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setMode(params.get("mode") === "signup" ? "signup" : "login");
  }, [params]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast({
          title: t("auth.checkEmail"),
          description: t("auth.checkEmailDesc"),
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app", { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "—";
      toast({ title: t("auth.errorTitle"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) {
        toast({ title: t("auth.errorGoogle"), description: String(result.error), variant: "destructive" });
        return;
      }
      if (result.redirected) return;
      navigate("/app", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F7FF] via-white to-[#F0F7FF] px-4 py-10">
      <FlowBackground />

      <Link
        to="/"
        className="absolute top-5 left-5 z-10 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} /> {t("auth.home")}
      </Link>

      <div className="absolute top-5 right-5 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-16 h-16 rounded-[20px] bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
            <SofiaAvatarIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground tracking-tight">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.startJourney")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
          </p>
        </div>

        <div className="glass-strong rounded-[32px] p-6 sm:p-8">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-white/90 rounded-full h-11"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            {t("auth.google")}
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            {t("auth.orEmail")}
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.namePh")}
                  className="mt-1 rounded-full"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="mt-1 rounded-full"
              />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary text-white hover:shadow-glow rounded-full h-11"
            >
              {loading ? t("common.wait") : mode === "login" ? t("auth.login") : t("auth.signup")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-foreground/70">
            {mode === "login" ? (
              <>
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("auth.switchSignup")}
                </button>
              </>
            ) : (
              <>
                {t("auth.hasAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("auth.switchLogin")}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
