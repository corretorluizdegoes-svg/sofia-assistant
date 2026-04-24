import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Trophy,
  Globe2,
  Lock,
  Instagram,
  Facebook,
  Linkedin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, isProfileCompleto } from "@/hooks/useProfile";
import { useProgresso } from "@/hooks/useProgresso";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { conquistaVisual, nivelIcon } from "@/lib/sofia-icons";
import { conquistasDisponiveis } from "@/lib/sofia-data";

export default function Perfil() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { profile, loading, salvar, uploadAvatar } = useProfile();
  const { xp, nivelAtual, patenteAtual, streakDias, conquistas, topicosExplorados } = useProgresso();
  const { toast } = useToast();

  const [form, setForm] = useState({
    display_name: "",
    codinome: "",
    bio: "",
    cidade: "",
    social_x: "",
    social_instagram: "",
    social_facebook: "",
    social_linkedin: "",
  });
  const [savingForm, setSavingForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        codinome: profile.codinome ?? "",
        bio: profile.bio ?? "",
        cidade: profile.cidade ?? "",
        social_x: profile.social_x ?? "",
        social_instagram: profile.social_instagram ?? "",
        social_facebook: profile.social_facebook ?? "",
        social_linkedin: profile.social_linkedin ?? "",
      });
    }
  }, [profile]);

  const NivelIcon = nivelIcon(nivelAtual.nivel);
  const completo = isProfileCompleto(profile);

  function setCampo<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    setSavingForm(true);
    const r = await salvar({
      display_name: form.display_name.trim() || null,
      codinome: form.codinome.trim() || null,
      bio: form.bio.trim() || null,
      cidade: form.cidade.trim() || null,
      social_x: form.social_x.trim() || null,
      social_instagram: form.social_instagram.trim() || null,
      social_facebook: form.social_facebook.trim() || null,
      social_linkedin: form.social_linkedin.trim() || null,
    });
    setSavingForm(false);
    if (!r.ok) {
      if (r.error === "codinome_em_uso") {
        toast({
          title: t("profile.codinameTaken"),
          description: t("profile.codinameTakenDesc"),
          variant: "destructive",
        });
      } else {
        toast({ title: t("profile.saveError"), description: r.error, variant: "destructive" });
      }
      return;
    }
    toast({ title: t("profile.saved"), description: t("profile.savedDesc") });
  }

  async function handleAvatar(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const r = await uploadAvatar(f);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) {
      toast({
        title: t("profile.avatarError"),
        description:
          r.error === "muito_grande"
            ? t("profile.avatarTooBig")
            : r.error === "tipo_invalido"
            ? t("profile.avatarInvalid")
            : r.error,
        variant: "destructive",
      });
      return;
    }
    toast({ title: t("profile.avatarUpdated") });
  }

  async function togglePublico(v: boolean) {
    const r = await salvar({ publico: v });
    if (!r.ok) {
      toast({ title: t("profile.saveError"), variant: "destructive" });
      return;
    }
    toast({
      title: v ? t("profile.nowPublic") : t("profile.nowPrivate"),
      description: v ? t("profile.nowPublicDesc") : t("profile.nowPrivateDesc"),
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full pb-20 lg:pb-12">
      {/* Top bar */}
      <header className="w-full px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 glass-card rounded-full px-3.5 py-1.5 text-sm text-foreground hover:shadow-soft transition-all"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
          {t("common.back")}
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-500">
          {t("header.logout")}
        </Button>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 space-y-6">
        {/* Card identidade */}
        <section className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              <UserAvatar profile={profile} size={108} ring />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-primary text-white flex items-center justify-center shadow-soft hover:shadow-glow transition-all disabled:opacity-60"
                aria-label={t("profile.changePhoto")}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatar}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="font-display font-bold text-2xl text-foreground tracking-tight">
                {profile?.codinome?.trim() || profile?.display_name?.trim() || t("profile.nameless")}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{user?.email}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-xs font-semibold"
                  style={{
                    borderColor: patenteAtual.cor,
                    color: patenteAtual.cor,
                    boxShadow: `0 0 14px ${patenteAtual.glow}`,
                    background: "rgba(255,255,255,0.6)",
                  }}
                >
                  <NivelIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {t(`sidebar.patente.${patenteAtual.id}`)}
                </span>
                <span className="text-xs text-slate-500">
                  {t("sidebar.levelLabel", { n: nivelAtual.nivel })} • {xp} XP
                </span>
                {streakDias > 0 && (
                  <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                    🔥 {streakDias}
                  </span>
                )}
              </div>

              {!completo && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t("profile.incompleteHint")}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Form principal */}
        <form onSubmit={handleSalvar} className="glass-card rounded-3xl p-6 space-y-5">
          <h2 className="font-display font-bold text-lg text-foreground">{t("profile.identity")}</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="codinome">{t("profile.codename")} *</Label>
              <Input
                id="codinome"
                value={form.codinome}
                onChange={(e) => setCampo("codinome", e.target.value)}
                placeholder={t("profile.codenamePh")}
                maxLength={32}
              />
              <p className="text-[11px] text-slate-500">{t("profile.codenameHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display_name">{t("profile.realName")}</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setCampo("display_name", e.target.value)}
                placeholder={t("profile.realNamePh")}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bio">{t("profile.bio")}</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setCampo("bio", e.target.value)}
                placeholder={t("profile.bioPh")}
                maxLength={280}
                rows={3}
              />
              <p className="text-[11px] text-slate-500 text-right">{form.bio.length}/280</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade">{t("profile.city")}</Label>
              <Input
                id="cidade"
                value={form.cidade}
                onChange={(e) => setCampo("cidade", e.target.value)}
                placeholder={t("profile.cityPh")}
                maxLength={60}
              />
            </div>
          </div>

          {/* Redes sociais */}
          <div className="pt-2 border-t border-border/40">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("profile.social")}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <SocialField
                icon={<XIcon />}
                label="X (Twitter)"
                value={form.social_x}
                onChange={(v) => setCampo("social_x", v)}
                placeholder="https://x.com/seu_usuario"
              />
              <SocialField
                icon={<Instagram className="w-4 h-4" strokeWidth={1.75} />}
                label="Instagram"
                value={form.social_instagram}
                onChange={(v) => setCampo("social_instagram", v)}
                placeholder="https://instagram.com/seu_usuario"
              />
              <SocialField
                icon={<Facebook className="w-4 h-4" strokeWidth={1.75} />}
                label="Facebook"
                value={form.social_facebook}
                onChange={(v) => setCampo("social_facebook", v)}
                placeholder="https://facebook.com/seu_usuario"
              />
              <SocialField
                icon={<Linkedin className="w-4 h-4" strokeWidth={1.75} />}
                label="LinkedIn"
                value={form.social_linkedin}
                onChange={(v) => setCampo("social_linkedin", v)}
                placeholder="https://linkedin.com/in/seu_usuario"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button type="submit" disabled={savingForm} className="rounded-full bg-gradient-primary text-white">
              {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
            </Button>
          </div>
        </form>

        {/* Visibilidade */}
        <section className="glass-card rounded-3xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {profile?.publico ? (
                  <Globe2 className="w-4 h-4 text-primary" strokeWidth={1.75} />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                )}
                <h3 className="font-semibold text-foreground">{t("profile.visibility")}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {profile?.publico ? t("profile.visibilityPublicDesc") : t("profile.visibilityPrivateDesc")}
              </p>
            </div>
            <Switch checked={!!profile?.publico} onCheckedChange={togglePublico} />
          </div>
        </section>

        {/* Estatísticas resumidas */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label={t("profile.statsXp")} value={xp.toLocaleString()} />
          <StatCard label={t("profile.statsLevel")} value={`Lv ${nivelAtual.nivel}`} />
          <StatCard label={t("profile.statsTopics")} value={topicosExplorados.length.toString()} />
          <StatCard label={t("profile.statsStreak")} value={`🔥 ${streakDias}`} />
        </section>

        {/* Conquistas */}
        <section className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-accent" strokeWidth={1.75} />
            <h3 className="font-semibold text-foreground">{t("sidebar.achievements")}</h3>
            <span className="ml-auto text-xs text-slate-500">
              {conquistas.length}/{conquistasDisponiveis.length}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {conquistasDisponiveis.map((c) => {
              const desbloq = conquistas.includes(c.id);
              const { icon: Icon, tone } = conquistaVisual(c.id);
              return (
                <div
                  key={c.id}
                  title={`${c.nome}${desbloq ? "" : ` — ${c.descricao}`}`}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 p-2 text-center transition-all ${
                    desbloq
                      ? "bg-white border border-border/60 shadow-soft hover:scale-105"
                      : "bg-slate-50 border border-transparent opacity-50 grayscale"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${tone} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-medium text-slate-700 leading-tight line-clamp-2">
                    {c.nome}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function SocialField({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="url" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-display font-bold text-xl text-foreground">{value}</div>
    </div>
  );
}

function XIcon() {
  // Ícone X (Twitter) — não está em lucide-react atualizado. Inline SVG.
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.84l-4.78-6.24L4.8 22H2.04l6.97-7.96L2 2h7l4.32 5.71L18.244 2Zm-2.4 18h1.61L7.27 4H5.55l10.293 16Z" />
    </svg>
  );
}
