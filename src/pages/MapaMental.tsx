import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, X, Sparkles, Plus, Link2, Undo2, Redo2, LayoutGrid, MessageCircle, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StarField } from "@/components/StarField";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useMapaMental, MapNode } from "@/hooks/useMapaMental";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCurriculoI18n } from "@/i18n/curriculo";
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
  const navigate = useNavigate();
  const { user } = useAuth();
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
    updateNotes,
    bulkUpdatePositions,
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
  const [organizing, setOrganizing] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<{ s: string; t: string } | null>(null);
  const [panelNode, setPanelNode] = useState<MapNode | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaveState, setNotesSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const notesTimer = useRef<number | null>(null);

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
        setSelectedEdge({ s, t: tt });
        setPanelNode(null);
        setSelected(null);
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
        // wrapper interno onde aplicamos o "float" estético — mantém o transform
        // do d3 (translate x,y) intacto no g.node externo.
        const gf = ge.append("g").attr("class", "float");
        gf.append("circle")
          .attr("class", "glow")
          .attr("r", 22)
          .attr("fill", (d) => d.glow_color)
          .attr("opacity", 0.18)
          .style("filter", "blur(10px)");
        gf.append("circle")
          .attr("class", "core")
          .attr("r", (d) => (d.modulo_id === "custom" ? 5 : d.id.startsWith("mod:") ? 9 : 6))
          .attr("fill", (d) => d.glow_color)
          .attr("stroke", "rgba(255,255,255,0.7)")
          .attr("stroke-width", 0.6);
        gf.append("text")
          .attr("class", "label")
          .attr("dy", 26)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("font-family", "Plus Jakarta Sans, system-ui")
          .attr("fill", "rgba(255,255,255,0.78)")
          .attr("pointer-events", "none");
        // Parâmetros aleatórios de oscilação por node — fixados na montagem.
        ge.each(function (d) {
          const dd = d as MapNode & {
            __osc?: {
              ax: number; ay: number;
              fx: number; fy: number;
              px: number; py: number;
              baseGlow: number;
            };
          };
          dd.__osc = {
            ax: 2 + Math.random() * 2,            // 2-4px
            ay: 2 + Math.random() * 2,
            fx: (2 * Math.PI) / (3 + Math.random() * 4), // período 3-7s
            fy: (2 * Math.PI) / (3 + Math.random() * 4),
            px: Math.random() * Math.PI * 2,
            py: Math.random() * Math.PI * 2,
            baseGlow: 0.18,
          };
        });
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
      setPanelNode(d);
      setSelectedEdge(null);
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
        .transition()
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
      setSelectedEdge(null);
      setPanelNode(null);
      if (modeRef.current === "connecting") {
        setMode("idle");
        setPendingSource(null);
      }
    });

    // ── Float estético contínuo (rAF) ──
    // Aplica translate sutil em g.float SEM tocar em fx/fy/x/y do d3.
    // Cada node tem fase/período próprios, então nunca ficam sincronizados.
    // Pulsação do glow ±15% acompanha a oscilação do node — exceto nos
    // unplaced, que têm sua própria pulsação maior controlada por tickPulse.
    let rafId = 0;
    const t0 = performance.now();
    const floatSel = nodeSel.select<SVGGElement>("g.float");
    floatSel.style("will-change", "transform");
    function tickFloat(now: number) {
      const t = (now - t0) / 1000;
      floatSel.each(function (d) {
        const osc = (d as MapNode & { __osc?: { ax: number; ay: number; fx: number; fy: number; px: number; py: number; baseGlow: number } }).__osc;
        if (!osc) return;
        const dx = Math.sin(t * osc.fx + osc.px) * osc.ax;
        const dy = Math.cos(t * osc.fy + osc.py) * osc.ay;
        (this as SVGGElement).setAttribute("transform", `translate(${dx.toFixed(2)},${dy.toFixed(2)})`);
        if (!(d as MapNode).unplaced && pendingRef.current !== (d as MapNode).id) {
          // pulsação ±15% do baseGlow (0.18) → 0.153 a 0.207
          const phase = Math.sin(t * osc.fx + osc.px);
          const op = osc.baseGlow * (1 + 0.15 * phase);
          const glow = (this as SVGGElement).querySelector("circle.glow");
          if (glow) (glow as SVGCircleElement).setAttribute("opacity", op.toFixed(3));
        }
      });
      rafId = requestAnimationFrame(tickFloat);
    }
    rafId = requestAnimationFrame(tickFloat);

    return () => {
      cancelAnimationFrame(rafId);
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

  // Realça edge selecionada (e os 2 nodes conectados); apaga o resto.
  useEffect(() => {
    if (!gRef.current) return;
    const root = d3.select(gRef.current);
    const lines = root.select(".links").selectAll<SVGLineElement, { source: MapNode | string; target: MapNode | string }>("line");
    const nodesSel = root.select(".nodes").selectAll<SVGGElement, MapNode>("g.node");
    if (!selectedEdge) {
      lines.attr("stroke-opacity", 1).attr("stroke-width", 1.5);
      nodesSel.style("opacity", 1);
      nodesSel.select<SVGCircleElement>("circle.glow").attr("r", 22);
      return;
    }
    const { s, t: tt } = selectedEdge;
    lines
      .attr("stroke-opacity", (d) => {
        const ds = typeof d.source === "string" ? d.source : (d.source as MapNode).id;
        const dt = typeof d.target === "string" ? d.target : (d.target as MapNode).id;
        return (ds === s && dt === tt) || (ds === tt && dt === s) ? 1 : 0.2;
      })
      .attr("stroke-width", (d) => {
        const ds = typeof d.source === "string" ? d.source : (d.source as MapNode).id;
        const dt = typeof d.target === "string" ? d.target : (d.target as MapNode).id;
        return (ds === s && dt === tt) || (ds === tt && dt === s) ? 3.2 : 1.5;
      });
    nodesSel.style("opacity", (d) => (d.id === s || d.id === tt ? 1 : 0.35));
    nodesSel
      .select<SVGCircleElement>("circle.glow")
      .attr("r", (d) => (d.id === s || d.id === tt ? 32 : 22));
  }, [selectedEdge, nodes.length, edges.length]);

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

  // ─── Painel lateral: notes auto-save ──────────────────────
  useEffect(() => {
    if (!panelNode) {
      setNotesDraft("");
      setNotesSaveState("idle");
      if (notesTimer.current) window.clearTimeout(notesTimer.current);
      return;
    }
    setNotesDraft(panelNode.notes ?? "");
    setNotesSaveState("idle");
  }, [panelNode?.id]);

  function handleNotesChange(val: string) {
    setNotesDraft(val);
    if (!panelNode) return;
    setNotesSaveState("saving");
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
    const id = panelNode.id;
    notesTimer.current = window.setTimeout(async () => {
      await updateNotes(id, val);
      setNotesSaveState("saved");
      window.setTimeout(() => setNotesSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
    }, 1000);
  }

  // Conexões do nó do painel
  const panelConexoes = useMemo(() => {
    if (!panelNode) return [] as MapNode[];
    const out: MapNode[] = [];
    for (const e of edges) {
      const s = typeof e.source === "string" ? e.source : e.source.id;
      const tt = typeof e.target === "string" ? e.target : e.target.id;
      const otherId = s === panelNode.id ? tt : tt === panelNode.id ? s : null;
      if (!otherId) continue;
      const n = nodes.find((x) => x.id === otherId);
      if (n) out.push(n);
    }
    return out;
  }, [panelNode, edges, nodes]);

  // Centraliza o mapa (zoom) em um node — usado pelos chips de conexão.
  function focusNode(targetId: string) {
    if (!svgRef.current) return;
    const target = nodes.find((n) => n.id === targetId);
    if (!target) return;
    const w = svgRef.current.clientWidth;
    const h = svgRef.current.clientHeight;
    const tx = w / 2 - (target.x ?? 0) * 0.9;
    const ty = h / 2 - (target.y ?? 0) * 0.9;
    d3.select(svgRef.current)
      .transition()
      .duration(700)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform as never,
        d3.zoomIdentity.translate(tx, ty).scale(0.9),
      );
    setPanelNode(target);
  }

  // Conversar com Sofia sobre este node
  async function conversarSobreNode() {
    if (!panelNode || !user) return;
    const disciplina = encontrarDisciplina(panelNode.label)?.disciplina?.nome ?? null;
    const { data } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: nodeLabel(panelNode),
        disciplina,
      })
      .select()
      .single();
    if (data) navigate(`/app`);
  }

  // ─── Auto-organizar ───────────────────────────────────────
  // Distribui nodes em 5 regiões do canvas por módulo, depois aplica
  // d3-force só de repulsão dentro de cada região, anima 800ms e salva.
  const REGIONS: Record<string, { cx: number; cy: number }> = {
    matematica: { cx: 0, cy: 380 },
    computacao: { cx: -560, cy: 380 },
    inteligencia_artificial: { cx: 0, cy: 0 },
    computacao_simbolica: { cx: -560, cy: -380 },
    fisica_quantica: { cx: 560, cy: -380 },
    convergencias: { cx: 560, cy: 380 },
    custom: { cx: 0, cy: 0 },
  };

  async function organizar() {
    if (organizing || nodes.length === 0) return;
    setOrganizing(true);
    setSelected(null);
    setPanelNode(null);
    setSelectedEdge(null);

    // 1) Agrupa por módulo e calcula posições alvo dentro de cada região.
    const buckets = new Map<string, MapNode[]>();
    for (const n of nodes) {
      const key = REGIONS[n.modulo_id] ? n.modulo_id : "custom";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(n);
    }
    const targets: { id: string; x: number; y: number }[] = [];
    for (const [mod, list] of buckets) {
      const center = REGIONS[mod] ?? REGIONS.custom;
      // Coloca em grid radial dentro da região
      const tmp = list.map((n, i) => {
        const ang = (i / Math.max(list.length, 1)) * Math.PI * 2;
        const r = 40 + Math.sqrt(i) * 38;
        return {
          id: n.id,
          x: center.cx + Math.cos(ang) * r,
          y: center.cy + Math.sin(ang) * r,
        };
      });
      // Espaçamento: pequena simulação de colisão localizada
      type P = { id: string; x: number; y: number; vx: number; vy: number };
      const pts: P[] = tmp.map((p) => ({ ...p, vx: 0, vy: 0 }));
      const sim = d3
        .forceSimulation(pts as unknown as d3.SimulationNodeDatum[])
        .force("collide", d3.forceCollide(70))
        .force("x", d3.forceX(center.cx).strength(0.08))
        .force("y", d3.forceY(center.cy).strength(0.08))
        .stop();
      for (let i = 0; i < 80; i++) sim.tick();
      pts.forEach((p) => targets.push({ id: p.id, x: p.x, y: p.y }));
    }

    // 2) Animação 800ms ease-in-out via d3 transitions sobre g.node.
    if (gRef.current) {
      const sel = d3
        .select(gRef.current)
        .select(".nodes")
        .selectAll<SVGGElement, MapNode>("g.node");
      sel
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attrTween("transform", function (d) {
          const target = targets.find((tt) => tt.id === d.id);
          if (!target) return () => `translate(${d.x ?? 0},${d.y ?? 0})`;
          const i = d3.interpolate([d.x ?? 0, d.y ?? 0], [target.x, target.y]);
          return (k: number) => {
            const [nx, ny] = i(k);
            d.x = nx;
            d.y = ny;
            d.fx = nx;
            d.fy = ny;
            return `translate(${nx},${ny})`;
          };
        });
    }

    await new Promise((r) => setTimeout(r, 850));
    await bulkUpdatePositions(targets);
    if (simRef.current) simRef.current.stop();
    setOrganizing(false);
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
        {!organizing && (
          <button
            onClick={() => void organizar()}
            title={t("mindMap.organize", { defaultValue: "Organizar" })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/85 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all backdrop-blur-md"
          >
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t("mindMap.organize", { defaultValue: "Organizar" })}
          </button>
        )}
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
          {nodes.some((n) => n.unplaced) && (
            <g className="arrival-area" pointerEvents="none">
              <rect
                x={ARRIVAL_AREA.x}
                y={ARRIVAL_AREA.y}
                width={ARRIVAL_AREA.w}
                height={ARRIVAL_AREA.h}
                rx={20}
                fill="rgba(167,139,250,0.05)"
                stroke="rgba(167,139,250,0.35)"
                strokeWidth={1}
                strokeDasharray="6 6"
              />
              <text
                x={ARRIVAL_AREA.x + ARRIVAL_AREA.w / 2}
                y={ARRIVAL_AREA.y + 22}
                textAnchor="middle"
                fontSize={11}
                fill="rgba(167,139,250,0.7)"
                fontFamily="Plus Jakarta Sans, system-ui"
                style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                {t("mindMap.arrivalArea", { defaultValue: "Área de chegada" })}
              </text>
            </g>
          )}
          <g className="links" />
          <g className="nodes" />
        </g>
      </svg>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm z-10">
          {t("mindMap.loading")}
        </div>
      )}

      {/* Painel lateral do node */}
      {panelNode && (
        <aside
          className="absolute top-0 right-0 bottom-0 z-30 w-[320px] bg-white/5 backdrop-blur-2xl border-l border-white/10 text-white animate-slide-in-right flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: panelNode.glow_color, boxShadow: `0 0 12px ${panelNode.glow_color}` }}
                />
                <h2 className="font-display font-semibold text-base leading-tight truncate">
                  {nodeLabel(panelNode)}
                </h2>
              </div>
              <button onClick={() => setPanelNode(null)} className="text-white/40 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            {panelNode.descricao && (
              <p className="mt-2 text-xs text-white/65 leading-relaxed">{panelNode.descricao}</p>
            )}
            {panelConexoes.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                  {t("mindMap.connectedTo")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {panelConexoes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => focusNode(c.id)}
                      className="text-[11px] bg-white/10 hover:bg-white/20 rounded-full px-2 py-0.5 text-white/85 transition-colors"
                      style={{ boxShadow: `inset 0 0 0 1px ${c.glow_color}40` }}
                    >
                      {nodeLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Body — anotações */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {t("mindMap.notesTitle", { defaultValue: "Anotações" })}
              </div>
              <div className="text-[10px] text-white/40 flex items-center gap-1 h-3.5">
                {notesSaveState === "saving" && (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>{t("mindMap.notesSaving", { defaultValue: "salvando…" })}</span>
                  </>
                )}
                {notesSaveState === "saved" && (
                  <>
                    <Check className="w-2.5 h-2.5" />
                    <span>{t("mindMap.notesSaved", { defaultValue: "salvo" })}</span>
                  </>
                )}
              </div>
            </div>
            <Textarea
              value={notesDraft}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={t("mindMap.notesPlaceholder", {
                defaultValue: "Suas anotações sobre este conceito...",
              })}
              className="flex-1 resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm leading-relaxed rounded-2xl"
            />
          </div>

          {/* Rodapé */}
          <div className="p-4 border-t border-white/10">
            <Button
              size="sm"
              onClick={() => void conversarSobreNode()}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-full text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
              {t("mindMap.talkSofia", { defaultValue: "Conversar com Sofia sobre este tema" })}
            </Button>
          </div>
        </aside>
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
