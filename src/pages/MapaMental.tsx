import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Link } from "react-router-dom";
import { ArrowLeft, X, Sparkles, Plus, Link2, Undo2, Redo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StarField } from "@/components/StarField";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useMapaMental, MapNode } from "@/hooks/useMapaMental";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCurriculoI18n, translateLabel } from "@/i18n/curriculo";
import { encontrarDisciplina } from "@/lib/sofia-data";
import { supabase } from "@/integrations/supabase/client";

type Mode = "idle" | "connecting";

type EdgeCardState = {
  s: string;        // id do nó origem
  t: string;        // id do nó destino
  x: number;        // posição na tela do clique
  y: number;
  loading: boolean;
  text: string;
};

const EDGE_FUN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sofia-explicar-conexao`;

// "Área de chegada" — retângulo em coordenadas do mundo (SVG interno) onde
// nodes recém-criados sem posição salva ficam empilhados pulsando até o
// usuário arrastá-los pra fora. Coordenadas escolhidas pra cair no canto
// inferior esquerdo no zoom inicial (translate(w/2, h/2) scale(0.7)).
const ARRIVAL_AREA = { x: -780, y: 220, w: 280, h: 420 };
const ARRIVAL_SLOT_H = 70;
function arrivalSlotPos(index: number) {
  return {
    x: ARRIVAL_AREA.x + ARRIVAL_AREA.w / 2,
    y: ARRIVAL_AREA.y + 40 + index * ARRIVAL_SLOT_H,
  };
}
function pointInArrival(x: number, y: number): boolean {
  return (
    x >= ARRIVAL_AREA.x &&
    x <= ARRIVAL_AREA.x + ARRIVAL_AREA.w &&
    y >= ARRIVAL_AREA.y &&
    y <= ARRIVAL_AREA.y + ARRIVAL_AREA.h
  );
}

export default function MapaMental() {
  const { t, i18n } = useTranslation();
  const curr = useCurriculoI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simRef = useRef<d3.Simulation<MapNode, undefined> | null>(null);
  const {
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
    canUndo,
    canRedo,
  } = useMapaMental();

  const [selected, setSelected] = useState<MapNode | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [edgeCard, setEdgeCard] = useState<EdgeCardState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  // refs sempre atuais p/ handlers do d3
  const modeRef = useRef(mode);
  const pendingRef = useRef(pendingSource);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { pendingRef.current = pendingSource; }, [pendingSource]);

  // Tradução de label baseado no nó
  function nodeLabel(n: MapNode): string {
    if (n.is_custom) return n.label;
    if (n.id.startsWith("mod:")) return curr.moduloNome(n.modulo_id, n.label);
    if (n.id.startsWith("conv:")) return curr.convergencia(n.label);
    return curr.disciplinaNome(n.label);
  }

  // ─── Inicializa simulação D3 ───────────────────────────────
  useEffect(() => {
    if (loading || !svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    // Defs com gradientes por aresta
    let defs = g.select<SVGDefsElement>("defs");
    if (defs.empty()) defs = g.append("defs");
    defs.selectAll("*").remove();

    // Zoom + pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });
    svg.call(zoom);
    const w = svgRef.current.clientWidth;
    const h = svgRef.current.clientHeight;
    svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.7));

    // ── Cópias internas ──
    // Nodes "unplaced" vão pra Área de chegada com fx/fy travados em slots.
    // Nodes posicionados (com fx/fy vindos do banco) ficam estáticos onde
    // o usuário os deixou — d3-force ignora qualquer node com fx/fy.
    let arrivalIdx = 0;
    const simNodes: MapNode[] = nodes.map((n) => {
      const copy: MapNode = { ...n };
      if (n.unplaced) {
        const slot = arrivalSlotPos(arrivalIdx++);
        copy.x = slot.x;
        copy.y = slot.y;
        copy.fx = slot.x;
        copy.fy = slot.y;
      }
      return copy;
    });
    const simLinks = edges
      .map((e) => ({
        source: typeof e.source === "string" ? e.source : e.source.id,
        target: typeof e.target === "string" ? e.target : e.target.id,
      }))
      .filter((l) => simNodes.find((n) => n.id === l.source) && simNodes.find((n) => n.id === l.target));

    // Cria um gradient por aresta
    simLinks.forEach((l, i) => {
      const s = simNodes.find((n) => n.id === l.source)!;
      const t = simNodes.find((n) => n.id === l.target)!;
      const gid = `lg-${i}`;
      const grad = defs.append("linearGradient")
        .attr("id", gid)
        .attr("gradientUnits", "userSpaceOnUse");
      grad.append("stop").attr("offset", "0%").attr("stop-color", s.glow_color).attr("stop-opacity", 0.85);
      grad.append("stop").attr("offset", "100%").attr("stop-color", t.glow_color).attr("stop-opacity", 0.85);
      (l as unknown as { gid: string }).gid = gid;
    });

    // ── Force simulation ──
    // Alpha baixo e decay rápido: a maioria dos nodes já vem com fx/fy
    // travados, então só os realmente novos/unplaced precisam acomodar.
    const temUnplaced = simNodes.some((n) => n.unplaced);
    const sim = d3
      .forceSimulation<MapNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<MapNode, { source: string | MapNode; target: string | MapNode }>(simLinks)
          .id((d) => d.id)
          .distance(280)
          .strength(0.08),
      )
      .force("charge", d3.forceManyBody().strength(-900))
      .force("collide", d3.forceCollide<MapNode>().radius(70))
      .force("x", d3.forceX(0).strength(0.02))
      .force("y", d3.forceY(0).strength(0.02))
      .alpha(temUnplaced ? 0.4 : 0.05)
      .alphaDecay(0.05);
    simRef.current = sim;

    // ── Render links ──
    const linkSel = g
      .select<SVGGElement>(".links")
      .selectAll<SVGLineElement, { source: MapNode; target: MapNode; gid: string }>("line")
      .data(
        simLinks as unknown as { source: MapNode; target: MapNode; gid: string }[],
        (d) => {
          const s = typeof d.source === "string" ? d.source : (d.source as MapNode).id;
          const t = typeof d.target === "string" ? d.target : (d.target as MapNode).id;
          return `${s}|${t}`;
        },
      )
      .join("line")
      .attr("stroke", (d) => `url(#${d.gid})`)
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        const s = typeof d.source === "string" ? d.source : (d.source as MapNode).id;
        const tt = typeof d.target === "string" ? d.target : (d.target as MapNode).id;
        // posição do clique em coordenadas de tela
        const px = event.clientX;
        const py = event.clientY;
        openEdgeCard(s, tt, px, py);
      })
      .on("mouseenter", function () {
        d3.select(this).attr("stroke-width", 2.5);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-width", 1.5);
      });

    // ── Render nodes ──
    const nodeSel = g
      .select<SVGGElement>(".nodes")
      .selectAll<SVGGElement, MapNode>("g.node")
      .data(simNodes, (d) => d.id)
      .join((enter) => {
        const ge = enter.append("g").attr("class", "node").style("cursor", "pointer");
        ge.append("circle")
          .attr("class", "glow")
          .attr("r", 22)
          .attr("fill", (d) => d.glow_color)
          .attr("opacity", 0.18)
          .style("filter", "blur(10px)");
        ge.append("circle")
          .attr("class", "core")
          .attr("r", (d) => (d.modulo_id === "custom" ? 5 : d.id.startsWith("mod:") ? 9 : 6))
          .attr("fill", (d) => d.glow_color)
          .attr("stroke", "rgba(255,255,255,0.7)")
          .attr("stroke-width", 0.6);
        ge.append("text")
          .attr("class", "label")
          .attr("dy", 26)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("font-family", "Plus Jakarta Sans, system-ui")
          .attr("fill", "rgba(255,255,255,0.78)")
          .attr("pointer-events", "none");
        return ge;
      });

    // labels (re-aplica em mudança de idioma)
    nodeSel.select<SVGTextElement>("text.label").text((d) => nodeLabel(d));

    // Click — selecionar / conectar
    nodeSel.on("click", (event, d) => {
      event.stopPropagation();
      if (modeRef.current === "connecting") {
        if (pendingRef.current && pendingRef.current !== d.id) {
          addEdge(pendingRef.current, d.id);
          setPendingSource(null);
          setMode("idle");
          return;
        }
        setPendingSource(d.id);
        return;
      }
      setSelected(d);
      setEdgeCard(null);
    });

    // destaque do nó pendente (modo conectar)
    nodeSel.select<SVGCircleElement>("circle.glow")
      .attr("opacity", (d) => (pendingSource === d.id ? 0.55 : 0.18));

    // Drag
    // Comportamento padrão: ao soltar, mantém fx/fy = posição final (node
    // trava onde foi solto, persistido no banco).
    // Se o node estava "unplaced" (Área de chegada): se for solto FORA da
    // área → vira placed; se for solto DENTRO → continua unplaced no slot.
    const drag = d3
      .drag<SVGGElement, MapNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        (d as unknown as { __from?: { x: number; y: number } }).__from = {
          x: d.x ?? 0,
          y: d.y ?? 0,
        };
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        if (typeof d.x !== "number" || typeof d.y !== "number") return;

        const wasUnplaced = !!d.unplaced;
        const stillInArrival = pointInArrival(d.x, d.y);

        if (wasUnplaced && stillInArrival) {
          // Manteve no berçário — re-trava no slot original e não persiste
          const from = (d as unknown as { __from?: { x: number; y: number } }).__from;
          d.fx = from?.x ?? d.x;
          d.fy = from?.y ?? d.y;
          d.x = d.fx;
          d.y = d.fy;
          // força re-render do glow pra parar/continuar pulsando se mudou estado
          d3.select(this as unknown as Element);
          return;
        }

        // Caso normal: trava no destino e persiste
        d.fx = d.x;
        d.fy = d.y;

        if (wasUnplaced) {
          d.unplaced = false;
          markPlaced(d.id, d.x, d.y);
          // remove pulsação imediatamente
          d3.select(gRef.current!)
            .select(".nodes")
            .selectAll<SVGGElement, MapNode>("g.node")
            .filter((nn) => nn.id === d.id)
            .select<SVGCircleElement>("circle.glow")
            .interrupt("pulse")
            .attr("opacity", 0.18);
        } else {
          const from = (d as unknown as { __from?: { x: number; y: number } }).__from;
          if (from) {
            commitNodeMove(d.id, from, { x: d.x, y: d.y });
          } else {
            updateNodePosition(d.id, d.x, d.y);
          }
        }
      });
    nodeSel.call(drag);

    // ── Pulsação dos nodes "unplaced" (Área de chegada) ──
    function tickPulse() {
      nodeSel
        .filter((d) => !!d.unplaced)
        .select<SVGCircleElement>("circle.glow")
        .transition("pulse")
        .duration(900)
        .attr("opacity", 0.55)
        .attr("r", 28)
        .transition("pulse")
        .duration(900)
        .attr("opacity", 0.18)
        .attr("r", 22)
        .on("end", tickPulse);
    }
    tickPulse();

    // Tick
    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as MapNode).x ?? 0)
        .attr("y1", (d) => (d.source as MapNode).y ?? 0)
        .attr("x2", (d) => (d.target as MapNode).x ?? 0)
        .attr("y2", (d) => (d.target as MapNode).y ?? 0);
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    svg.on("click", () => {
      setSelected(null);
      setEdgeCard(null);
      if (modeRef.current === "connecting") {
        setMode("idle");
        setPendingSource(null);
      }
    });

    return () => {
      sim.stop();
    };
    // re-cria quando mudam nós/arestas; idioma muda só os labels via outro effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, nodes.length, edges.length]);

  // Atualiza labels quando idioma muda (sem recriar simulação)
  useEffect(() => {
    if (!gRef.current) return;
    d3.select(gRef.current)
      .select(".nodes")
      .selectAll<SVGTextElement, MapNode>("g.node text.label")
      .text((d) => nodeLabel(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, nodes]);

  // Destaca o nó pendente sem re-criar
  useEffect(() => {
    if (!gRef.current) return;
    d3.select(gRef.current)
      .select(".nodes")
      .selectAll<SVGCircleElement, MapNode>("g.node circle.glow")
      .attr("opacity", (d) => (pendingSource === d.id ? 0.55 : 0.18));
  }, [pendingSource]);

  // Tecla Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
        setEdgeCard(null);
        setMode("idle");
        setPendingSource(null);
      }
      // Undo / Redo
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        void redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ─── Texto da conexão ────────────────────────────────────
  function bridgeFromCurriculum(aLabel: string, bLabel: string): string | null {
    // intersecção das listas de "conexões" das duas disciplinas (PT)
    const A = encontrarDisciplina(aLabel)?.disciplina;
    const B = encontrarDisciplina(bLabel)?.disciplina;
    if (!A || !B) return null;
    const inter = A.conexoes.filter((c) => B.conexoes.includes(c));
    const ponteOriginal = inter[0];
    if (ponteOriginal) {
      const ponte = curr.disciplinaNome(ponteOriginal);
      const aT = curr.disciplinaNome(aLabel);
      const bT = curr.disciplinaNome(bLabel);
      // Texto base em PT, traduzido textual a partir do i18next quando útil
      const fromTo = t("mindMap.edgeFromTo", { a: aT, b: bT });
      // Mensagem simples e poética; quando necessário, IA gera versão melhor — mas evita custo aqui.
      return `${fromTo} — ${ponte}.`;
    }
    return null;
  }

  async function openEdgeCard(sId: string, tId: string, x: number, y: number) {
    const sNode = nodes.find((n) => n.id === sId);
    const tNode = nodes.find((n) => n.id === tId);
    if (!sNode || !tNode) return;
    const aLabel = nodeLabel(sNode);
    const bLabel = nodeLabel(tNode);

    setEdgeCard({ s: sId, t: tId, x, y, loading: true, text: "" });

    // 1) Tenta heurística da grade (sem custo)
    let text: string | null = null;
    if (!sNode.is_custom && !tNode.is_custom) {
      text = bridgeFromCurriculum(sNode.label, tNode.label);
    }

    // 2) Se nada encontrado OU pelo menos um é custom: chama IA
    if (!text) {
      try {
        const r = await fetch(EDGE_FUN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            source: aLabel,
            target: bLabel,
            language: i18n.language,
          }),
        });
        const data = await r.json();
        text = data?.text ?? "";
      } catch (err) {
        console.error("explicar-conexao error", err);
        text = "";
      }
    }

    setEdgeCard((curr) => curr ? { ...curr, loading: false, text: text ?? "" } : curr);
  }

  // Conexões do nó selecionado (labels já traduzidos)
  const selectedConexoes = useMemo(() => {
    if (!selected) return [] as string[];
    const out: string[] = [];
    for (const e of edges) {
      const s = typeof e.source === "string" ? e.source : e.source.id;
      const tt = typeof e.target === "string" ? e.target : e.target.id;
      const otherId = s === selected.id ? tt : tt === selected.id ? s : null;
      if (!otherId) continue;
      const n = nodes.find((x) => x.id === otherId);
      if (n) out.push(nodeLabel(n));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, edges, nodes, i18n.language]);

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    const node = addNode(label);
    setAdding(false);
    setNewLabel("");
    setSelected(node);
  }

  // Cores p/ borda do edgeCard (gradiente)
  const edgeCardColors = useMemo(() => {
    if (!edgeCard) return null;
    const sN = nodes.find((n) => n.id === edgeCard.s);
    const tN = nodes.find((n) => n.id === edgeCard.t);
    if (!sN || !tN) return null;
    return { a: sN, b: tN };
  }, [edgeCard, nodes]);

  return (
    <main
      className={`fixed inset-0 bg-black text-white overflow-hidden ${
        mode === "connecting" ? "cursor-crosshair" : ""
      }`}
    >
      <StarField />

      {/* Topo: voltar + título */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-4 pointer-events-none">
        <Link
          to="/app"
          className="pointer-events-auto inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.75} />
          {t("common.back")}
        </Link>
        <div className="text-xs uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
          <span aria-hidden>🌌</span> {t("mindMap.title")}
        </div>
        <div className="pointer-events-auto">
          <LanguageSwitcher variant="dark" />
        </div>
      </div>

      {/* Botões superiores direita: adicionar / conectar */}
      <div className="absolute top-16 right-5 z-20 flex items-center gap-2">
        <button
          onClick={() => void undo()}
          disabled={!canUndo}
          title={t("mindMap.undo")}
          aria-label={t("mindMap.undo")}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs text-white/85 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all backdrop-blur-md disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/15"
        >
          <Undo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => void redo()}
          disabled={!canRedo}
          title={t("mindMap.redo")}
          aria-label={t("mindMap.redo")}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs text-white/85 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all backdrop-blur-md disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/15"
        >
          <Redo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/85 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all backdrop-blur-md shadow-[0_0_18px_rgba(167,139,250,0.18)]"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t("mindMap.addConcept")}
        </button>
        <button
          onClick={() => {
            setMode((m) => (m === "connecting" ? "idle" : "connecting"));
            setPendingSource(null);
            setSelected(null);
            setEdgeCard(null);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all backdrop-blur-md border ${
            mode === "connecting"
              ? "bg-white/15 text-white border-white/40 shadow-[0_0_22px_rgba(77,168,255,0.35)]"
              : "bg-white/5 text-white/85 border-white/15 hover:bg-white/10 hover:border-white/30 shadow-[0_0_18px_rgba(77,168,255,0.18)]"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t("mindMap.connectConcepts")}
        </button>
      </div>

      {/* Instrução modo conectar */}
      {mode === "connecting" && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 text-xs text-white/80 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/15">
          {pendingSource ? t("mindMap.selectSecond") : t("mindMap.selectFirst")}
        </div>
      )}

      {/* SVG */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        <g ref={gRef}>
          <g className="links" />
          <g className="nodes" />
        </g>
      </svg>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm z-10">
          {t("mindMap.loading")}
        </div>
      )}

      {/* Card flutuante do nó */}
      {selected && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[min(420px,90vw)] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-white animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: selected.glow_color, boxShadow: `0 0 12px ${selected.glow_color}` }}
              />
              <h2 className="font-display font-semibold text-lg leading-tight truncate">
                {nodeLabel(selected)}
              </h2>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {selected.descricao && (
            <p className="mt-2 text-xs text-white/70 leading-relaxed">{selected.descricao}</p>
          )}
          {selectedConexoes.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                {t("mindMap.connectedTo")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedConexoes.map((l, i) => (
                  <span key={i} className="text-[11px] bg-white/10 rounded-full px-2 py-0.5 text-white/80">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-full text-xs"
              onClick={() => {
                setPendingSource(selected.id);
                setMode("connecting");
                setSelected(null);
              }}
            >
              {t("mindMap.connectToOther")}
            </Button>
          </div>
        </div>
      )}

      {/* Card flutuante da CONEXÃO (sobre a linha) */}
      {edgeCard && edgeCardColors && (
        <EdgeCard
          state={edgeCard}
          colors={edgeCardColors}
          onClose={() => setEdgeCard(null)}
          onDelete={() => {
            removeEdge(edgeCard.s, edgeCard.t);
            setEdgeCard(null);
          }}
          getLabel={(id) => {
            const n = nodes.find((x) => x.id === id);
            return n ? nodeLabel(n) : id;
          }}
        />
      )}

      {/* Mensagem de campo emergente */}
      {emergingField && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-full px-4 py-2 text-sm text-white/90">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t("mindMap.emerging")}
          </div>
        </div>
      )}

      {/* Dialog de adicionar */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">{t("mindMap.newDialogTitle")}</DialogTitle>
            <DialogDescription className="text-white/60">
              {t("mindMap.newDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={t("mindMap.newPlaceholder")}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-full"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAdding(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-white text-black hover:bg-white/90 rounded-full"
            >
              {t("mindMap.createPoint")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ───────────────────────────────────────────────────────────
function EdgeCard({
  state,
  colors,
  onClose,
  onDelete,
  getLabel,
}: {
  state: EdgeCardState;
  colors: { a: MapNode; b: MapNode };
  onClose: () => void;
  onDelete: () => void;
  getLabel: (id: string) => string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Posiciona próximo ao clique sem sair da viewport
  const W = 360;
  const H = 220;
  const padding = 16;
  const left = Math.min(Math.max(padding, state.x - W / 2), window.innerWidth - W - padding);
  const top = Math.min(Math.max(padding, state.y - H - 12), window.innerHeight - H - padding);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const aColor = colors.a.glow_color;
  const bColor = colors.b.glow_color;

  return (
    <div
      ref={ref}
      className="absolute z-30 animate-fade-in"
      style={{ left, top, width: W }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-3xl p-[1px]"
        style={{ background: `linear-gradient(135deg, ${aColor}, ${bColor})` }}
      >
        <div className="rounded-3xl bg-black/80 backdrop-blur-xl p-4 text-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full" style={{ background: aColor, boxShadow: `0 0 8px ${aColor}` }} />
              <span className="text-xs text-white/80 truncate">{getLabel(state.s)}</span>
              <span className="text-white/30 text-xs px-1">→</span>
              <span className="w-2 h-2 rounded-full" style={{ background: bColor, boxShadow: `0 0 8px ${bColor}` }} />
              <span className="text-xs text-white/80 truncate">{getLabel(state.t)}</span>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[13px] leading-relaxed text-white/85 min-h-[3.2em]">
            {state.loading ? (
              <span className="text-white/55 italic">{t("mindMap.edgeCardLoading")}</span>
            ) : state.text ? (
              state.text
            ) : (
              "—"
            )}
          </p>

          <div className="mt-3 flex justify-end">
            <button
              onClick={onDelete}
              className="text-[11px] text-red-300/80 hover:text-red-200 rounded-full px-2 py-1"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
