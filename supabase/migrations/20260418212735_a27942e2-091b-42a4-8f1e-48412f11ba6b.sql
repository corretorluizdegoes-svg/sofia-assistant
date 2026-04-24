-- Tabela de nós (pontos) do mapa mental
CREATE TABLE public.mind_map_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  node_key TEXT NOT NULL, -- identificador estável (id da disciplina, módulo, convergência ou uuid para custom)
  label TEXT NOT NULL,
  modulo_id TEXT, -- matematica | computacao | inteligencia_artificial | computacao_simbolica | fisica_quantica | convergencias | custom
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

-- Tabela de arestas (conexões) do mapa mental
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

-- Trigger de updated_at para nodes
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER mind_map_nodes_touch
BEFORE UPDATE ON public.mind_map_nodes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();