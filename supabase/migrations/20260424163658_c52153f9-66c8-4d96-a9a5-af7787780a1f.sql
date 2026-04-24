-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  codinome TEXT,
  avatar_url TEXT,
  bio TEXT,
  cidade TEXT,
  social_x TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_linkedin TEXT,
  publico BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'pt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX profiles_codinome_unique_idx
  ON public.profiles (lower(codinome))
  WHERE codinome IS NOT NULL;

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- USER PROGRESS
-- =========================================
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  topicos_explorados TEXT[] NOT NULL DEFAULT '{}',
  conquistas TEXT[] NOT NULL DEFAULT '{}',
  total_mensagens INTEGER NOT NULL DEFAULT 0,
  streak_dias INTEGER NOT NULL DEFAULT 0,
  ultimo_dia_ativo DATE,
  data_alistamento TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progress viewable by owner"
  ON public.user_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Progress insertable by owner"
  ON public.user_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Progress updatable by owner"
  ON public.user_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- CONVERSATIONS
-- =========================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  disciplina TEXT,
  modulo_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversations_user_updated
  ON public.conversations (user_id, updated_at DESC);

CREATE POLICY "Conversations select own"
  ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Conversations insert own"
  ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Conversations update own"
  ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Conversations delete own"
  ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- MESSAGES
-- =========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation_created
  ON public.messages (conversation_id, created_at ASC);

CREATE POLICY "Messages select own"
  ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Messages insert own"
  ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Messages delete own"
  ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- MIND MAP
-- =========================================
CREATE TABLE public.mind_map_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  node_key TEXT NOT NULL,
  label TEXT NOT NULL,
  modulo_id TEXT,
  glow_color TEXT NOT NULL DEFAULT '#ffffff',
  descricao TEXT,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, node_key)
);
CREATE INDEX idx_mind_map_nodes_user ON public.mind_map_nodes(user_id);
ALTER TABLE public.mind_map_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mind nodes select own" ON public.mind_map_nodes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mind nodes insert own" ON public.mind_map_nodes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mind nodes update own" ON public.mind_map_nodes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mind nodes delete own" ON public.mind_map_nodes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.mind_map_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_key TEXT NOT NULL,
  target_key TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key, target_key)
);
CREATE INDEX idx_mind_map_edges_user ON public.mind_map_edges(user_id);
ALTER TABLE public.mind_map_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mind edges select own" ON public.mind_map_edges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mind edges insert own" ON public.mind_map_edges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mind edges update own" ON public.mind_map_edges
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mind edges delete own" ON public.mind_map_edges
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- XP EVENTS
-- =========================================
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  xp_ganho INTEGER NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_xp_events_user_created ON public.xp_events (user_id, created_at DESC);

CREATE POLICY "xp_events select own"
  ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "xp_events insert own"
  ON public.xp_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================
-- FUNÇÕES E TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mind_map_nodes_touch
  BEFORE UPDATE ON public.mind_map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-criar profile + progress no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- XP curve
CREATE OR REPLACE FUNCTION public.xp_para_level(_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _xp >= 3300 THEN 10
    WHEN _xp >= 2500 THEN 9
    WHEN _xp >= 1900 THEN 8
    WHEN _xp >= 1400 THEN 7
    WHEN _xp >= 1000 THEN 6
    WHEN _xp >= 700  THEN 5
    WHEN _xp >= 450  THEN 4
    WHEN _xp >= 250  THEN 3
    WHEN _xp >= 100  THEN 2
    ELSE 1
  END;
$$;

-- RPC atômico para registrar XP
CREATE OR REPLACE FUNCTION public.registrar_xp(
  _tipo text,
  _xp integer,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _novo_xp integer;
  _novo_level integer;
  _level_anterior integer;
  _hoje date := (now() AT TIME ZONE 'UTC')::date;
  _ultimo_dia date;
  _streak integer;
  _bonus_streak integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF _xp IS NULL OR _xp < 0 THEN
    RAISE EXCEPTION 'XP inválido';
  END IF;

  INSERT INTO public.user_progress (user_id, xp)
  VALUES (_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT xp, ultimo_dia_ativo, streak_dias
    INTO _novo_xp, _ultimo_dia, _streak
  FROM public.user_progress
  WHERE user_id = _uid
  FOR UPDATE;

  _level_anterior := public.xp_para_level(_novo_xp);

  IF _ultimo_dia IS NULL OR _ultimo_dia < _hoje - INTERVAL '1 day' THEN
    _streak := 1;
    _bonus_streak := 20;
  ELSIF _ultimo_dia = _hoje - INTERVAL '1 day' THEN
    _streak := _streak + 1;
    _bonus_streak := 20;
  END IF;

  _novo_xp := _novo_xp + _xp + _bonus_streak;
  _novo_level := public.xp_para_level(_novo_xp);

  UPDATE public.user_progress
     SET xp = _novo_xp,
         ultimo_dia_ativo = _hoje,
         streak_dias = _streak,
         updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.xp_events (user_id, tipo, xp_ganho, metadata)
  VALUES (_uid, _tipo, _xp, _metadata);

  IF _bonus_streak > 0 THEN
    INSERT INTO public.xp_events (user_id, tipo, xp_ganho, metadata)
    VALUES (_uid, 'streak_diario', _bonus_streak, jsonb_build_object('streak_dias', _streak));
  END IF;

  RETURN jsonb_build_object(
    'xp_total', _novo_xp,
    'xp_ganho', _xp + _bonus_streak,
    'bonus_streak', _bonus_streak,
    'level', _novo_level,
    'level_anterior', _level_anterior,
    'subiu_de_level', _novo_level > _level_anterior,
    'streak_dias', _streak
  );
END;
$$;

-- =========================================
-- STORAGE: bucket avatars
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Avatars são publicamente legíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Usuário envia o próprio avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuário atualiza o próprio avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuário remove o próprio avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);