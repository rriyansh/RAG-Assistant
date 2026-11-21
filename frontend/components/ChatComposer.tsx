"use client";

import * as React from "react";
import { gsap } from "gsap";
import { Wand2 } from "lucide-react";
import { enhancePrompt } from "@/lib/api";

export type ComposerAccent = "ice" | "ember" | "lime";

export interface ChatComposerProps {
  onSubmit: (question: string) => void | Promise<void>;
  disabled?: boolean;
  mode?: "agent" | "chat";
  draft?: { text: string };
  models?: string[];
  modelNotes?: string[];
  hint?: boolean;
  accent?: ComposerAccent;
  className?: string;
}

const ACCENTS: Record<ComposerAccent, { a1: string; a2: string; a3: string; glow: string; ink: string }> = {
  ice: { a1: "#e8f6ff", a2: "#a9dcff", a3: "#5fb2f2", glow: "rgba(95,178,242,.42)", ink: "#06233a" },
  ember: { a1: "#fcc8a6", a2: "#f49d70", a3: "#e07a45", glow: "rgba(224,122,69,.42)", ink: "#3a1606" },
  lime: { a1: "#efffc4", a2: "#c4f26a", a3: "#8fcf2e", glow: "rgba(143,207,46,.38)", ink: "#1c2a05" },
};

const ICONS: Record<string, string> = {
  bolt: "....##./...##../..##.../.######/...##../..##.../.##....",
  arrow: "...#.../..###../.#.#.#./#..#..#/...#.../...#.../...#...",
};

function PixelIcon({ name }: { name: string }): JSX.Element {
  const rows = (ICONS[name] ?? "....##./...##../..##.../.######/...##../..##.../.##....").split("/");
  const cells: Array<[number, number]> = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x += 1) if (r[x] === "#") cells.push([x, y]);
  });
  return (
    <svg className="ppc-icon" viewBox="0 0 7 7" aria-hidden="true" focusable="false">
      {cells.map(([x, y], i) => (
        <rect key={i} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.12} />
      ))}
    </svg>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (): void => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export default function ChatComposer({
  onSubmit,
  disabled = false,
  draft,
  mode = "agent",
  models = ["Turbo", "Studio", "Deep"],
  modelNotes,
  hint = false,
  accent = "ice",
  className,
}: ChatComposerProps): JSX.Element {
  const reduced = useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tone = ACCENTS[accent];

  const formRef = React.useRef<HTMLFormElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const modelBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const [value, setValue] = React.useState("");
  React.useEffect(() => {
    if (draft) {
      setValue(draft.text);
      inputRef.current?.focus();
    }
  }, [draft]);
  const [model, setModel] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [nudge, setNudge] = React.useState(false);
  const [enhancing, setEnhancing] = React.useState(false);

  const note = (i: number): string =>
    modelNotes?.[i] ??
    (i === 0 ? "Fastest drafts" : i === models.length - 1 ? "Most careful" : "Balanced");

  const submit = (e?: { preventDefault: () => void }): void => {
    if (e) e.preventDefault();
    if (disabled) return;
    const text = value.trim();
    if (!text) {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 500);
      inputRef.current?.focus();
      return;
    }
    setValue("");
    void onSubmit(text);
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { scale: 1 },
        { scale: 0.995, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }
      );
    }
  };

  const runEnhance = async (): Promise<void> => {
    const text = value.trim();
    if (!text || enhancing) return;
    setEnhancing(true);
    try {
      const res = await enhancePrompt(text, mode);
      setValue(res);
      inputRef.current?.focus();
    } catch {
      // silent
    } finally {
      setEnhancing(false);
    }
  };

  React.useEffect(() => {
    if (!menuOpen) return;
    const first = menuRef.current?.querySelector<HTMLElement>("[role=menuitemradio]");
    first?.focus();
    const down = (e: PointerEvent): void => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        modelBtnRef.current?.contains(e.target as Node)
      )
        return;
      setMenuOpen(false);
    };
    const key = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        modelBtnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [menuOpen]);

  const menuKeys = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? []
    );
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    next?.focus();
  };

  const sheen = (e: React.PointerEvent<HTMLFormElement>): void => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const empty = value.trim().length === 0;
  const ids = { input: `${uid}-input`, menu: `${uid}-menu` };
  const style = {
    "--ppc-a1": tone.a1,
    "--ppc-a2": tone.a2,
    "--ppc-a3": tone.a3,
    "--ppc-glow": tone.glow,
    "--ppc-ink": tone.ink,
  } as React.CSSProperties;

  return (
    <div className={`ppc-root${className ? ` ${className}` : ""}`} style={style}>
      <form
        ref={formRef}
        className="ppc-card"
        data-nudge={nudge ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
        onSubmit={submit}
        onPointerMove={sheen}
        aria-label="Ask a question"
      >
        <span className="ppc-sheen" aria-hidden="true" />
        <div className="ppc-field ppc-enter">
          <label htmlFor={ids.input} className="ppc-sr">Ask a question</label>
          <textarea
            ref={inputRef}
            id={ids.input}
            className="ppc-input"
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <div className="ppc-tools ppc-enter">
          <div className="ppc-right">
            <button
              type="button"
              onClick={runEnhance}
              disabled={disabled || enhancing || empty}
              className="ppc-enhance"
              aria-label="Enhance prompt"
              title="Enhance prompt with AI"
            >
              <Wand2 size={14} className={enhancing ? "animate-pulse" : ""} />
            </button>
            {models.length > 0 && <div className="ppc-model-wrap">
              <button
                ref={modelBtnRef}
                type="button"
                className="ppc-model"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={ids.menu}
                disabled={disabled}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <PixelIcon name="bolt" />
                <span>{models[model]}</span>
                <svg className="ppc-chev" viewBox="0 0 10 6" aria-hidden="true">
                  <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {menuOpen && (
                <div ref={menuRef} id={ids.menu} className="ppc-menu" role="menu" aria-label="Model" onKeyDown={menuKeys}>
                  {models.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      role="menuitemradio"
                      aria-checked={model === i}
                      className="ppc-menu-item"
                      onClick={() => {
                        setModel(i);
                        setMenuOpen(false);
                        modelBtnRef.current?.focus();
                      }}
                    >
                      <span>{m}</span>
                      <small>{note(i)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>}
            <button
              type="submit"
              className="ppc-send"
              aria-label="Send message"
              disabled={disabled}
              data-ready={empty || disabled ? "false" : "true"}
            >
              <PixelIcon name="arrow" />
            </button>
          </div>
        </div>
      </form>
      {hint && (
        <p className="ppc-hint">
          <kbd>Enter</kbd> to send <span aria-hidden="true">/</span> <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
        </p>
      )}
    </div>
  );
}
