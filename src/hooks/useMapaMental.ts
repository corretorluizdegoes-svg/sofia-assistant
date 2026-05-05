import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { construirMapaBase, moduloGlow } from "@/lib/mapa-mental-base";

// XP por ação no mapa (mesmos valores do useProgresso, sem importar pra evitar ciclo)
const XP_NO_CRIADO = 10;
const XP_CONEXAO_CRIADA = 15;

async function ganharXpMapa(tipo: "no_criado" | "conexao_criada", metadata: Record<string, unknown> = {}) {
  const xp = tipo === "no_criado" ? XP_NO_CRIADO : XP_CONEXAO_CRIADA;
  const { error } = await supabase.rpc("registrar_xp", {
    _tipo: tipo,
    _xp: xp,
    _metadata: metadata as never,
  });
  if (error) console.error("registrar_xp (mapa) error", error);
}

export type MapNode = {
  id: string;            // node_key estável
  label: string;
  modulo_id: string;
  glow_color: string;
  descricao: string | null;
  is_custom: boolean;
  x: number;
  y: number;
  notes?: string | null;
  // True quando o node foi criado mas o usuário ainda não o posicionou.
  // Sentinela: persistido como (x=0, y=0) no banco para is_custom=true.
  unplaced?: boolean;
  // d3-force vai mutar fx/fy/vx/vy
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
};

export type MapEdge = {
  id?: string;
  source: string | MapNode;
  target: string | MapNode;
  is_custom: boolean;
};

type SaveQueueItem =
  | { kind: "node-pos"; node_key: string; x: number; y: number }
  | { kind: "node-create"; node: MapNode }
  | { kind: "edge-create"; source_key: string; target_key: string }
  | { kind: "edge-delete"; source_key: string; target_key: string };

// ─── Histórico (undo/redo) ─────────────────────────────────
// Cada ação aplicada pelo usuário gera um HistoryEntry com como desfazer/refazer.
type HistoryEntry =
  | {
      kind: "node-move";
      node_key: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }
  | { kind: "node-add"; node: MapNode }
  | { kind: "edge-add"; source_key: string; target_key: string }
  | { kind: "edge-remove"; source_key: string; target_key: string };

export function useMapaMental() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [emergingField, setEmergingField] = useState<string | null>(null);
  const queueRef = useRef<SaveQueueItem[]>([]);
  const flushTimer = useRef<number | null>(null);
  // pilhas de undo/redo
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const bumpHistory = () => setHistoryVersion((v) => v + 1);

  // ─── Carregamento inicial ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: dbNodes } = await supabase
        .from("mind_map_nodes")
        .select("*")
        .eq("user_id", user.id);
      const { data: dbEdges } = await supabase
        .from("mind_map_edges")
        .select("*")
        .eq("user_id", user.id);
      if (cancelled) return;

      // Se o usuário ainda não tem mapa, cria a partir da base e persiste
      if (!dbNodes || dbNodes.length === 0) {
        const base = construirMapaBase();
        const seed: MapNode[] = base.nodes.map((n, i) => {
          const angulo = (i / base.nodes.length) * Math.PI * 2;
          const raio = 220 + (i % 5) * 40;
          return {
            id: n.node_key,
            label: n.label,
            modulo_id: n.modulo_id,
            glow_color: n.glow_color,
            descricao: n.descricao,
            is_custom: false,
            x: Math.cos(angulo) * raio,
            y: Math.sin(angulo) * raio,
          };
        });
        const seedEdges: MapEdge[] = base.edges.map((e) => ({
          source: e.source_key,
          target: e.target_key,
          is_custom: false,
        }));
        setNodes(seed);
        setEdges(seedEdges);

        await supabase.from("mind_map_nodes").insert(
          seed.map((n) => ({
            user_id: user.id,
            node_key: n.id,
            label: n.label,
            modulo_id: n.modulo_id,
            glow_color: n.glow_color,
            descricao: n.descricao,
            is_custom: false,
            x: n.x,
            y: n.y,
          })),
        );
        await supabase.from("mind_map_edges").insert(
          seedEdges.map((e) => ({
            user_id: user.id,
            source_key: typeof e.source === "string" ? e.source : e.source.id,
            target_key: typeof e.target === "string" ? e.target : e.target.id,
            is_custom: false,
          })),
        );
      } else {
        const mapped: MapNode[] = dbNodes.map((n) => {
          // Custom node sem posição persistida (sentinela 0,0) = "unplaced".
          // Restantes ficam travados com fx/fy = posição salva pra não serem
          // movidos pelo d3-force a cada reabertura do mapa.
          const isUnplaced = n.is_custom && n.x === 0 && n.y === 0;
          return {
            id: n.node_key,
            label: n.label,
            modulo_id: n.modulo_id ?? "custom",
            glow_color: n.glow_color,
            descricao: n.descricao,
            is_custom: n.is_custom,
            x: n.x,
            y: n.y,
            notes: (n as { notes?: string | null }).notes ?? null,
            unplaced: isUnplaced,
            fx: isUnplaced ? null : n.x,
            fy: isUnplaced ? null : n.y,
          };
        });
        setNodes(mapped);
        setEdges(
          (dbEdges ?? []).map((e) => ({
            id: e.id,
            source: e.source_key,
            target: e.target_key,
            is_custom: e.is_custom,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ─── Fila de salvamento (debounced) ────────────────────────
  const enqueue = useCallback((item: SaveQueueItem) => {
    if (!user) return;
    queueRef.current.push(item);
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(flush, 200);
  }, [user]);

  const flush = useCallback(async () => {
    if (!user) return;
    const batch = queueRef.current;
    queueRef.current = [];
    flushTimer.current = null;

    // Agrupa atualizações de posição pelo node_key (última vence)
    const posMap = new Map<string, { x: number; y: number }>();
    const newNodes: MapNode[] = [];
    const newEdges: { source_key: string; target_key: string }[] = [];
    const delEdges: { source_key: string; target_key: string }[] = [];

    for (const it of batch) {
      if (it.kind === "node-pos") posMap.set(it.node_key, { x: it.x, y: it.y });
      else if (it.kind === "node-create") newNodes.push(it.node);
      else if (it.kind === "edge-create") newEdges.push(it);
      else if (it.kind === "edge-delete") delEdges.push(it);
    }

    await Promise.all([
      ...Array.from(posMap.entries()).map(([node_key, p]) =>
        supabase
          .from("mind_map_nodes")
          .update({ x: p.x, y: p.y })
          .eq("user_id", user.id)
          .eq("node_key", node_key),
      ),
      newNodes.length
        ? supabase.from("mind_map_nodes").insert(
            newNodes.map((n) => ({
              user_id: user.id,
              node_key: n.id,
              label: n.label,
              modulo_id: n.modulo_id,
              glow_color: n.glow_color,
              descricao: n.descricao,
              is_custom: n.is_custom,
              x: n.x,
              y: n.y,
            })),
          )
        : null,
      newEdges.length
        ? supabase.from("mind_map_edges").insert(
            newEdges.map((e) => ({
              user_id: user.id,
              source_key: e.source_key,
              target_key: e.target_key,
              is_custom: true,
            })),
          )
        : null,
      ...delEdges.map((e) =>
        supabase
          .from("mind_map_edges")
          .delete()
          .eq("user_id", user.id)
          .eq("source_key", e.source_key)
          .eq("target_key", e.target_key),
      ),
    ]);
  }, [user]);

  // Garante salvamento ao sair da página
  useEffect(() => {
    const onBeforeUnload = () => {
      if (queueRef.current.length > 0) {
        // dispara o flush; navigator.sendBeacon não é compatível com supabase-js,
        // então confiamos no flush assíncrono (na prática o Supabase responde rápido).
        void flush();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  // ─── Ações públicas ────────────────────────────────────────
  // Atualização "ao vivo" (durante o tick da simulação) — não vai para o histórico.
  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
    );
    enqueue({ kind: "node-pos", node_key: id, x, y });
  }, [enqueue]);

  // Chamado no fim do drag, com posição inicial e final — entra no histórico.
  const commitNodeMove = useCallback(
    (id: string, from: { x: number; y: number }, to: { x: number; y: number }) => {
      if (Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5) return;
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: to.x, y: to.y } : n)));
      enqueue({ kind: "node-pos", node_key: id, x: to.x, y: to.y });
      void flush();
      undoStack.current.push({ kind: "node-move", node_key: id, from, to });
      redoStack.current = [];
      bumpHistory();
    },
    [enqueue, flush],
  );

  const addNode = useCallback((label: string) => {
    const id = `custom:${crypto.randomUUID()}`;
    // Persistido como (0,0) — sentinela de "unplaced". Será posicionado
    // pelo MapaMental na "Área de chegada" até o usuário arrastar pra fora.
    const node: MapNode = {
      id,
      label,
      modulo_id: "custom",
      glow_color: moduloGlow.custom,
      descricao: null,
      is_custom: true,
      x: 0,
      y: 0,
      unplaced: true,
    };
    setNodes((prev) => [...prev, node]);
    enqueue({ kind: "node-create", node });
    void flush();
    void ganharXpMapa("no_criado", { label });
    undoStack.current.push({ kind: "node-add", node });
    redoStack.current = [];
    bumpHistory();
    return node;
  }, [enqueue, flush]);

  // Marca um node como "placed" (saiu da área de chegada). Atualiza estado
  // local + persiste posição. Fire-and-forget.
  const markPlaced = useCallback(
    (id: string, x: number, y: number) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, x, y, unplaced: false, fx: x, fy: y } : n,
        ),
      );
      enqueue({ kind: "node-pos", node_key: id, x, y });
      void flush();
    },
    [enqueue, flush],
  );

  const addEdge = useCallback((sourceId: string, targetId: string, fromHistory = false) => {
    if (sourceId === targetId) return;
    let inserted = false;
    setEdges((prev) => {
      const exists = prev.some((e) => {
        const s = typeof e.source === "string" ? e.source : e.source.id;
        const t = typeof e.target === "string" ? e.target : e.target.id;
        return (s === sourceId && t === targetId) || (s === targetId && t === sourceId);
      });
      if (exists) return prev;
      inserted = true;
      return [...prev, { source: sourceId, target: targetId, is_custom: true }];
    });
    if (!inserted) return;
    enqueue({ kind: "edge-create", source_key: sourceId, target_key: targetId });
    void flush();
    if (!fromHistory) {
      void ganharXpMapa("conexao_criada", { source: sourceId, target: targetId });
      undoStack.current.push({ kind: "edge-add", source_key: sourceId, target_key: targetId });
      redoStack.current = [];
      bumpHistory();
    }

    // Detecção de campo emergente
    setNodes((currNodes) => {
      const target = currNodes.find((n) => n.id === targetId);
      const source = currNodes.find((n) => n.id === sourceId);
      if (target?.is_custom || source?.is_custom) {
        const customNode = target?.is_custom ? target : source;
        if (customNode) {
          setEdges((currEdges) => {
            const conectados = new Set<string>();
            for (const e of currEdges) {
              const s = typeof e.source === "string" ? e.source : e.source.id;
              const t = typeof e.target === "string" ? e.target : e.target.id;
              if (s === customNode.id) conectados.add(t);
              else if (t === customNode.id) conectados.add(s);
            }
            const modulosOrigens = new Set<string>();
            for (const k of conectados) {
              const n = currNodes.find((x) => x.id === k);
              if (n && !n.is_custom) modulosOrigens.add(n.modulo_id);
            }
            if (modulosOrigens.size >= 2) {
              setEmergingField(customNode.label);
              setTimeout(() => setEmergingField(null), 4500);
            }
            return currEdges;
          });
        }
      }
      return currNodes;
    });
  }, [enqueue, flush]);

  const removeEdge = useCallback((sourceId: string, targetId: string, fromHistory = false) => {
    setEdges((prev) =>
      prev.filter((e) => {
        const s = typeof e.source === "string" ? e.source : e.source.id;
        const t = typeof e.target === "string" ? e.target : e.target.id;
        return !((s === sourceId && t === targetId) || (s === targetId && t === sourceId));
      }),
    );
    enqueue({ kind: "edge-delete", source_key: sourceId, target_key: targetId });
    enqueue({ kind: "edge-delete", source_key: targetId, target_key: sourceId });
    void flush();
    if (!fromHistory) {
      undoStack.current.push({ kind: "edge-remove", source_key: sourceId, target_key: targetId });
      redoStack.current = [];
      bumpHistory();
    }
  }, [enqueue, flush]);

  // Apaga um nó (e arestas conectadas) — interno, usado pelo undo de "node-add".
  const deleteNodeInternal = useCallback(
    async (id: string) => {
      if (!user) return;
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) =>
        prev.filter((e) => {
          const s = typeof e.source === "string" ? e.source : e.source.id;
          const t = typeof e.target === "string" ? e.target : e.target.id;
          return s !== id && t !== id;
        }),
      );
      await Promise.all([
        supabase.from("mind_map_nodes").delete().eq("user_id", user.id).eq("node_key", id),
        supabase.from("mind_map_edges").delete().eq("user_id", user.id).eq("source_key", id),
        supabase.from("mind_map_edges").delete().eq("user_id", user.id).eq("target_key", id),
      ]);
    },
    [user],
  );

  // Re-insere um nó no banco (usado pelo redo de "node-add" ou desfazer um futuro "node-remove").
  const reinsertNode = useCallback(
    async (node: MapNode) => {
      if (!user) return;
      setNodes((prev) => (prev.find((n) => n.id === node.id) ? prev : [...prev, node]));
      await supabase.from("mind_map_nodes").insert({
        user_id: user.id,
        node_key: node.id,
        label: node.label,
        modulo_id: node.modulo_id,
        glow_color: node.glow_color,
        descricao: node.descricao,
        is_custom: node.is_custom,
        x: node.x,
        y: node.y,
      });
    },
    [user],
  );

  const undo = useCallback(async () => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    bumpHistory();
    if (entry.kind === "node-move") {
      setNodes((prev) =>
        prev.map((n) => (n.id === entry.node_key ? { ...n, x: entry.from.x, y: entry.from.y } : n)),
      );
      enqueue({ kind: "node-pos", node_key: entry.node_key, x: entry.from.x, y: entry.from.y });
      void flush();
    } else if (entry.kind === "node-add") {
      await deleteNodeInternal(entry.node.id);
    } else if (entry.kind === "edge-add") {
      await removeEdge(entry.source_key, entry.target_key, true);
    } else if (entry.kind === "edge-remove") {
      await addEdge(entry.source_key, entry.target_key, true);
    }
  }, [enqueue, flush, deleteNodeInternal, removeEdge, addEdge]);

  const redo = useCallback(async () => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    bumpHistory();
    if (entry.kind === "node-move") {
      setNodes((prev) =>
        prev.map((n) => (n.id === entry.node_key ? { ...n, x: entry.to.x, y: entry.to.y } : n)),
      );
      enqueue({ kind: "node-pos", node_key: entry.node_key, x: entry.to.x, y: entry.to.y });
      void flush();
    } else if (entry.kind === "node-add") {
      await reinsertNode(entry.node);
    } else if (entry.kind === "edge-add") {
      await addEdge(entry.source_key, entry.target_key, true);
    } else if (entry.kind === "edge-remove") {
      await removeEdge(entry.source_key, entry.target_key, true);
    }
  }, [enqueue, flush, reinsertNode, addEdge, removeEdge]);

  return {
    nodes,
    edges,
    loading,
    emergingField,
    updateNodePosition,
    commitNodeMove,
    addNode,
    markPlaced,
    addEdge,
    removeEdge,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    historyVersion,
  };
}
