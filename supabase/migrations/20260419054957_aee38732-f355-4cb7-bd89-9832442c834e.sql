-- ============================================================
-- FASE 1 RPG — Fundação: XP, Levels, Patentes e memória de posição
-- ============================================================

-- 1. Estender user_progress com campos de RPG
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS streak_dias integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_dia_ativo date,
  ADD COLUMN IF NOT EXISTS data_alistamento timestamp with time zone NOT NULL DEFAULT now();

-- 2. Tabela de eventos de XP (auditoria + base para badges/streak)
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL, -- 'mensagem' | 'no_criado' | 'conexao_criada' | 'conversa_nova' | 'streak_diario'
  xp_ganho integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_events select own"
  ON public.xp_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "xp_events insert own"
  ON public.xp_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created
  ON public.xp_events (user_id, created_at DESC);

-- 3. Função pura para calcular level a partir de XP total
-- Curva decrescente: Lv1=0, Lv2=100, Lv3=250, Lv4=450, Lv5=700,
--                    Lv6=1000, Lv7=1400, Lv8=1900, Lv9=2500, Lv10=3300
CREATE OR REPLACE FUNCTION public.xp_para_level(_xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
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

-- 4. RPC atômico para registrar XP
-- Garante que o INSERT em xp_events e o UPDATE em user_progress
-- aconteçam na mesma transação, sem race conditions.
CREATE OR REPLACE FUNCTION public.registrar_xp(
  _tipo text,
  _xp integer,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Garante linha em user_progress
  INSERT INTO public.user_progress (user_id, xp)
  VALUES (_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Snapshot atual
  SELECT xp, ultimo_dia_ativo, streak_dias
    INTO _novo_xp, _ultimo_dia, _streak
  FROM public.user_progress
  WHERE user_id = _uid
  FOR UPDATE;

  _level_anterior := public.xp_para_level(_novo_xp);

  -- Atualiza streak
  IF _ultimo_dia IS NULL OR _ultimo_dia < _hoje - INTERVAL '1 day' THEN
    -- quebrou (ou primeiro dia)
    _streak := 1;
    _bonus_streak := 20; -- bônus diário
  ELSIF _ultimo_dia = _hoje - INTERVAL '1 day' THEN
    _streak := _streak + 1;
    _bonus_streak := 20;
  END IF;
  -- se _ultimo_dia = _hoje, mantém streak e não dá bônus

  _novo_xp := _novo_xp + _xp + _bonus_streak;
  _novo_level := public.xp_para_level(_novo_xp);

  -- Persiste
  UPDATE public.user_progress
     SET xp = _novo_xp,
         ultimo_dia_ativo = _hoje,
         streak_dias = _streak,
         updated_at = now()
   WHERE user_id = _uid;

  -- Registra evento principal
  INSERT INTO public.xp_events (user_id, tipo, xp_ganho, metadata)
  VALUES (_uid, _tipo, _xp, _metadata);

  -- Registra bônus de streak separadamente, se houve
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

-- 5. Garantir UNIQUE em user_progress.user_id (necessário pro ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_progress_user_id_key'
  ) THEN
    ALTER TABLE public.user_progress
      ADD CONSTRAINT user_progress_user_id_key UNIQUE (user_id);
  END IF;
END $$;
