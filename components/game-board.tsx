"use client";
import {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  PARTS,
  WORLD,
  type Level,
  type Placement,
  type PartKind,
} from "@/lib/game/levels";
import { createSimulation, type RunResult } from "@/lib/game/physics";
export type BoardHandle = {
  drop: (kind: PartKind, clientX: number, clientY: number) => void;
};
type Props = {
  level: Level;
  parts: Placement[];
  selected: string | null;
  tool: PartKind | null;
  mode: "build" | "running" | "paused" | "finished";
  runKey: number;
  hint: boolean;
  onParts: (p: Placement[]) => void;
  onSelect: (id: string | null) => void;
  onDrop: (kind: PartKind, x: number, y: number) => void;
  onComplete: (r: RunResult) => void;
  onTime: (seconds: number) => void;
};
function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function drawPart(
  c: CanvasRenderingContext2D,
  p: Placement,
  selected = false,
  ghost = false,
) {
  const d = PARTS[p.kind];
  c.save();
  c.translate(p.x, p.y);
  c.rotate((p.angle * Math.PI) / 180);
  c.globalAlpha = ghost ? 0.22 : 1;
  if (selected) {
    c.strokeStyle = "#243d52";
    c.lineWidth = 2;
    c.setLineDash([5, 5]);
    c.strokeRect(
      -d.width / 2 - 7,
      -d.height / 2 - 7,
      d.width + 14,
      d.height + 14,
    );
    c.setLineDash([]);
  }
  roundRect(
    c,
    -d.width / 2,
    -d.height / 2 + 4,
    d.width,
    d.height,
    5,
    "#23374640",
  );
  roundRect(c, -d.width / 2, -d.height / 2, d.width, d.height, 5, d.color);
  c.strokeStyle =
    p.kind === "ramp" ? "#9c673c" : p.kind === "spring" ? "#537e34" : "#55758e";
  c.lineWidth = 2;
  c.strokeRect(-d.width / 2 + 3, -d.height / 2 + 3, d.width - 6, d.height - 6);
  if (p.kind === "spring") {
    c.beginPath();
    for (let x = -30; x <= 30; x += 10) {
      c.lineTo(x, x % 20 === 0 ? 22 : 13);
    }
    c.stroke();
    c.strokeStyle = "#3a662b";
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(0, -52);
    c.lineTo(-7, -43);
    c.moveTo(0, -52);
    c.lineTo(7, -43);
    c.stroke();
  } else {
    for (const x of [-d.width / 2 + 12, d.width / 2 - 12]) {
      c.beginPath();
      c.arc(x, 0, 2, 0, Math.PI * 2);
      c.stroke();
    }
  }
  c.restore();
}
export const GameBoard = forwardRef<BoardHandle, Props>(
  function GameBoard(props, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const live = useRef(props);
    live.current = props;
    const simulation = useRef<ReturnType<typeof createSimulation> | null>(null);
    const trail = useRef<{ x: number; y: number }[]>([]);
    const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
    const toPoint = useCallback((x: number, y: number) => {
      const r = canvas.current!.getBoundingClientRect();
      return {
        x: ((x - r.left) / r.width) * WORLD.width,
        y: ((y - r.top) / r.height) * WORLD.height,
        inside: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
      };
    }, []);
    useImperativeHandle(
      ref,
      () => ({
        drop(kind, x, y) {
          const p = toPoint(x, y);
          if (p.inside && live.current.mode === "build")
            live.current.onDrop(kind, p.x, p.y);
        },
      }),
      [toPoint],
    );
    useEffect(() => {
      simulation.current?.dispose();
      simulation.current = null;
      trail.current = [];
      const current = live.current;
      if (current.mode !== "build")
        simulation.current = createSimulation(current.level, current.parts);
      return () => {
        simulation.current?.dispose();
        simulation.current = null;
      };
    }, [props.level.id, props.runKey]); // A run is a snapshot; editing changes runKey in the parent.
    useEffect(() => {
      let frame = 0,
        last = 0,
        accumulator = 0,
        reported = false,
        lastSecond = -1;
      const loop = (now: number) => {
        const p = live.current;
        const c = canvas.current?.getContext("2d");
        if (!c) return;
        const sim = simulation.current;
        if (p.mode === "running" && sim && !sim.finished) {
          accumulator += Math.min(now - last, 100);
          while (accumulator >= WORLD.dt && !sim.finished) {
            sim.step();
            accumulator -= WORLD.dt;
            if (sim.ticks % 3 === 0) {
              trail.current.push({ ...sim.ball.position });
              if (trail.current.length > 100) trail.current.shift();
            }
          }
          const sec = Math.floor(sim.ticks / 60);
          if (sec !== lastSecond) {
            lastSecond = sec;
            p.onTime(sim.ticks / 60);
          }
        } else accumulator = 0;
        last = now;
        if (sim?.finished && !reported) {
          reported = true;
          p.onComplete(sim.result());
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.current!.clientWidth;
        if (canvas.current!.width !== Math.round(w * dpr)) {
          canvas.current!.width = Math.round(w * dpr);
          canvas.current!.height = Math.round(((w * 540) / 960) * dpr);
        }
        c.setTransform(
          canvas.current!.width / 960,
          0,
          0,
          canvas.current!.height / 540,
          0,
          0,
        );
        c.fillStyle = "#e4edf1";
        c.fillRect(0, 0, 960, 540);
        c.fillStyle = "#bdcdd5";
        for (let x = 20; x < 960; x += 30)
          for (let y = 20; y < 540; y += 30) {
            c.beginPath();
            c.arc(x, y, 1, 0, Math.PI * 2);
            c.fill();
          }
        c.fillStyle = "#203a50";
        c.font = "bold 12px Arial";
        c.fillText("DROP ZONE", 24, 31);
        c.fillStyle = "#668093";
        c.textAlign = "right";
        c.fillText("MOTION LAB  /  0" + p.level.id, 936, 31);
        c.textAlign = "left";
        c.fillStyle = "#c5d5dc";
        c.fillRect(0, 522, 960, 18);
        c.strokeStyle = "#9cafb9";
        c.lineWidth = 2;
        for (let x = 0; x < 960; x += 20) {
          c.beginPath();
          c.moveTo(x, 540);
          c.lineTo(x + 18, 522);
          c.stroke();
        }
        p.level.platforms.forEach((b) => {
          c.save();
          c.translate(b.x, b.y);
          c.rotate(((b.angle || 0) * Math.PI) / 180);
          roundRect(
            c,
            -b.width / 2,
            -b.height / 2,
            b.width,
            b.height,
            5,
            "#466078",
          );
          c.fillStyle = "#6c879d";
          c.fillRect(-b.width / 2 + 4, -b.height / 2 + 2, b.width - 8, 4);
          c.restore();
        });
        const g = p.level.goal;
        c.fillStyle = "#99dbaa55";
        c.fillRect(g.x - g.width / 2, g.y - 18, g.width, 62);
        roundRect(c, g.x - g.width / 2 - 5, g.y - 12, 10, 66, 5, "#4a966b");
        roundRect(c, g.x + g.width / 2 - 5, g.y - 12, 10, 66, 5, "#4a966b");
        roundRect(c, g.x - g.width / 2, g.y + 39, g.width, 12, 5, "#4a966b");
        c.fillStyle = "#377755";
        c.font = "bold 13px Arial";
        c.textAlign = "center";
        c.fillText("GOAL", g.x, g.y + 20);
        c.textAlign = "left";
        if (p.hint && p.mode === "build")
          p.level.solution.forEach((part) => drawPart(c, part, false, true));
        p.parts.forEach((part) =>
          drawPart(c, part, p.selected === part.id && p.mode === "build"),
        );
        if (trail.current.length > 1) {
          c.strokeStyle = "#e6976360";
          c.lineWidth = 3;
          c.setLineDash([2, 7]);
          c.beginPath();
          trail.current.forEach((pt, i) =>
            i ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y),
          );
          c.stroke();
          c.setLineDash([]);
        }
        const pos =
          sim && p.mode !== "build" ? sim.ball.position : p.level.spawn;
        c.beginPath();
        c.fillStyle = "#d1764740";
        c.ellipse(pos.x + 3, pos.y + 14, 15, 5, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
        c.fillStyle = "#f08b50";
        c.fill();
        c.strokeStyle = "#a9552b";
        c.lineWidth = 2;
        c.stroke();
        c.beginPath();
        c.arc(pos.x - 4, pos.y - 5, 4, 0, Math.PI * 2);
        c.fillStyle = "#ffd3aa";
        c.fill();
        if (p.mode === "build") {
          c.fillStyle = "#486276";
          c.font = "bold 12px Arial";
          c.textAlign = "center";
          c.fillText("START", p.level.spawn.x, p.level.spawn.y - 29);
          c.textAlign = "left";
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frame);
    }, [props.runKey]);
    function down(e: React.PointerEvent<HTMLCanvasElement>) {
      if (props.mode !== "build") return;
      const p = toPoint(e.clientX, e.clientY);
      if (props.tool) {
        props.onDrop(props.tool, p.x, p.y);
        return;
      }
      const hit = [...props.parts].reverse().find((part) => {
        const a = (-part.angle * Math.PI) / 180,
          dx = p.x - part.x,
          dy = p.y - part.y;
        return (
          Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) <
            PARTS[part.kind].width / 2 + 10 &&
          Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) < 25
        );
      });
      if (hit) {
        props.onSelect(hit.id);
        drag.current = { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      } else props.onSelect(null);
    }
    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drag.current || props.mode !== "build") return;
      const p = toPoint(e.clientX, e.clientY);
      const d = drag.current;
      props.onParts(
        props.parts.map((part) =>
          part.id === d.id
            ? {
                ...part,
                x: Math.round(Math.max(35, Math.min(925, p.x - d.dx))),
                y: Math.round(Math.max(160, Math.min(495, p.y - d.dy))),
              }
            : part,
        ),
      );
    }
    return (
      <canvas
        ref={canvas}
        data-testid="game-board"
        className="game-board"
        role="img"
        aria-label={`${props.level.name}. Orange ball at the start, green goal. Drag parts on the board, or use the position controls.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const kind = e.dataTransfer.getData("inventra/part") as PartKind;
          if (Object.hasOwn(PARTS, kind)) {
            const p = toPoint(e.clientX, e.clientY);
            props.onDrop(kind, p.x, p.y);
          }
        }}
      />
    );
  },
);
