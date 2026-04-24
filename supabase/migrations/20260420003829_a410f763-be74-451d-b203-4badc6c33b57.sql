-- =============================================================
-- CICLO 2 — Fundação: Perfil Operacional + Storage de Avatars
-- =============================================================

-- 1) Estende a tabela profiles com os campos do Ciclo 2
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS codinome           text,
  ADD COLUMN IF NOT EXISTS avatar_url         text,
  ADD COLUMN IF NOT EXISTS bio                text,
  ADD COLUMN IF NOT EXISTS cidade             text,
  ADD COLUMN IF NOT EXISTS social_x           text,
  ADD COLUMN IF NOT EXISTS social_instagram   text,
  ADD COLUMN IF NOT EXISTS social_facebook    text,
  ADD COLUMN IF NOT EXISTS social_linkedin    text,
  ADD COLUMN IF NOT EXISTS publico            boolean NOT NULL DEFAULT false;

-- 2) Codinome único (case-insensitive). Permite NULL (usuário ainda não definiu).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_codinome_unique_idx
  ON public.profiles (lower(codinome))
  WHERE codinome IS NOT NULL;

-- 3) Bucket público para avatares (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4) Policies de Storage para o bucket 'avatars'
-- Layout esperado: avatars/<user_id>/<file>
DROP POLICY IF EXISTS "Avatars são publicamente legíveis"            ON storage.objects;
DROP POLICY IF EXISTS "Usuário envia o próprio avatar"               ON storage.objects;
DROP POLICY IF EXISTS "Usuário atualiza o próprio avatar"            ON storage.objects;
DROP POLICY IF EXISTS "Usuário remove o próprio avatar"              ON storage.objects;

CREATE POLICY "Avatars são publicamente legíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Usuário envia o próprio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuário atualiza o próprio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuário remove o próprio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);