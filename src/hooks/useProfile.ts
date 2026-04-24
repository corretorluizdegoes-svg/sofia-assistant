import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Profile = {
  user_id: string;
  display_name: string | null;
  codinome: string | null;
  avatar_url: string | null;
  bio: string | null;
  cidade: string | null;
  social_x: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  publico: boolean;
  language: string;
};

const CAMPOS_OBRIGATORIOS: (keyof Profile)[] = ["codinome", "bio", "cidade"];

export function isProfileCompleto(p: Profile | null): boolean {
  if (!p) return false;
  return CAMPOS_OBRIGATORIOS.every((c) => {
    const v = p[c];
    return typeof v === "string" && v.trim().length > 0;
  }) && !!p.avatar_url;
}

export function nomeExibido(p: Profile | null, fallback = "Agente sem nome"): string {
  if (!p) return fallback;
  if (p.codinome && p.codinome.trim()) return p.codinome.trim();
  if (p.display_name && p.display_name.trim()) return p.display_name.trim();
  return fallback;
}

export function iniciaisDe(p: Profile | null): string {
  const nome = nomeExibido(p, "?");
  const partes = nome.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function corDeIniciais(seed: string | null | undefined): string {
  // gera hue determinística entre 0-360
  const s = seed ?? "";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 70% 55%)`;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) console.error("loadProfile error", error);
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const salvar = useCallback(
    async (patch: Partial<Profile>): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "no_user" };
      const limpo: Partial<Profile> = { ...patch };
      // Normaliza codinome
      if (typeof limpo.codinome === "string") {
        limpo.codinome = limpo.codinome.trim();
        if (limpo.codinome === "") limpo.codinome = null;
      }
      const { data, error } = await supabase
        .from("profiles")
        .update(limpo)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();
      if (error) {
        // 23505 = unique violation (codinome em uso)
        if ((error as { code?: string }).code === "23505") {
          return { ok: false, error: "codinome_em_uso" };
        }
        return { ok: false, error: error.message };
      }
      if (data) setProfile(data as Profile);
      return { ok: true };
    },
    [user],
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<{ ok: boolean; url?: string; error?: string }> => {
      if (!user) return { ok: false, error: "no_user" };
      if (!file.type.startsWith("image/")) return { ok: false, error: "tipo_invalido" };
      if (file.size > 5 * 1024 * 1024) return { ok: false, error: "muito_grande" };

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) return { ok: false, error: upErr.message };

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;

      const r = await salvar({ avatar_url: url });
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true, url };
    },
    [user, salvar],
  );

  return {
    profile,
    loading,
    completo: isProfileCompleto(profile),
    nome: nomeExibido(profile),
    iniciais: iniciaisDe(profile),
    corFundo: corDeIniciais(profile?.codinome ?? profile?.display_name ?? user?.email ?? ""),
    salvar,
    uploadAvatar,
    recarregar,
  };
}
