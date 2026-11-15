"use client";

import * as React from "react";
import { gsap } from "gsap";

export type ComposerAccent = "ice" | "ember" | "lime";

export interface ChatComposerProps {
  onSubmit: (question: string) => void | Promise<void>;
  disabled?: boolean;
  prompts?: string[];
  placeholder?: string;
  models?: string[];
  modelNotes?: string[];
  hint?: boolean;
  accent?: ComposerAccent;
  className?: string;
}

const DEFAULT_PROMPTS = [
  "What does the document say about data retention?",
  "Summarize the key recommendations.",
  "List every action item in section 3.",
  "Compare the two policy versions.",
];

const ACCENTS: Record<
  ComposerAccent,
  { a1: string; a2: string; a3: string; glow: string; ink: string }
> = {
  ice: {
    a1: "#e8f6ff",
    a2: "#a9dcff",
    a3: "#5fb2f2",
    glow: "rgba(95,178,242,.42)",
    ink: "#06233a",
  },
  ember: {
    a1: "#fcc8a6",
    a2: "#f49d70",
    a3: "#e07a45",
    glow: "rgba(224,122,69,.42)",
    ink: "#3a1606",
  },
  lime: {
    a1: "#efffc4",
    a2: "#c4f26a",
    a3: "#8fcf2e",
    glow: "rgba(143,207,46,.38)",
    ink: "#1c2a05",
  },
};

const ICONS: Record<string, string> = {
  spark: "...#.../...#.../..###../#######/..###../...#.../...#...",
  bolt: "....##./...##../..##.../.######/...##../..##.../.##....",
  arrow: "...#.../..###../.#.#.#./#..#..#/...#.../...#.../...#...",
};

function PixelIcon({ name }: { name: string }): JSX.Element {
  const rows = (ICONS[name] ?? ICONS.spark).split("/");
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
  prompts = DEFAULT_PROMPTS,
  placeholder = "Ask about your documents...",
  models = ["Turbo", "Studio", "Deep"],
  modelNotes,
  hint = true,
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
  const [model, setModel] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [nudge, setNudge] = React.useState(false);

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

  // Animated typing placeholder
  const promptKey = prompts.join("|");
  React.useEffect(() => {
    if (!prompts.length) return;
    if (reduced) {
      setTyped(prompts[0]);
      return;
    }
    let i = 0;
    let n = 0;
    let back = false;
    let id = 0;
    const tick = (): void => {
      const full = prompts[i % prompts.length];
      if (!back) {
        n += 1;
        setTyped(full.slice(0, n));
        if (n >= full.length) {
          back = true;
          id = window.setTimeout(tick, 2400);
          return;
        }
        id = window.setTimeout(tick, 28 + Math.random() * 42);
      } else {
        n = Math.max(0, n - 3);
        setTyped(full.slice(0, n));
        if (n === 0) {
          back = false;
          i += 1;
          id = window.setTimeout(tick, 420);
          return;
        }
        id = window.setTimeout(tick, 16);
      }
    };
    id = window.setTimeout(tick, 900);
    return () => window.clearTimeout(id);
  }, [promptKey, reduced]);

  // Model menu: close on outside press / Escape, focus first item on open
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
      <style>{PPC_CSS}</style>
      <form
        ref={formRef}
        className="ppc-card"
        data-nudge={nudge ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
        onSubmit={submit}
        onPointerMove={sheen}
        aria-label="Ask a question about your documents"
      >
        <span className="ppc-sheen" aria-hidden="true" />
        <div className="ppc-field ppc-enter">
          <label htmlFor={ids.input} className="ppc-sr">
            Ask a question
          </label>
          <textarea
            ref={inputRef}
            id={ids.input}
            className="ppc-input"
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {empty && (
            <span className="ppc-ph" aria-hidden="true">
              {focused ? placeholder : typed}
              {!focused && <i className="ppc-caret" />}
            </span>
          )}
        </div>
        <div className="ppc-tools ppc-enter">
          <span className="ppc-label">
            <PixelIcon name="spark" />
            RAG · citations on
          </span>
          <div className="ppc-right">
            <div className="ppc-model-wrap">
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
                  <path
                    d="M1 1l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  id={ids.menu}
                  className="ppc-menu"
                  role="menu"
                  aria-label="Model"
                  onKeyDown={menuKeys}
                >
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
            </div>
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
          <kbd>Enter</kbd> to send <span aria-hidden="true">/</span> <kbd>Shift</kbd> +{" "}
          <kbd>Enter</kbd> for a new line
        </p>
      )}
    </div>
  );
}

const PPC_CSS = `
.ppc-root{--ppc-fg:#f5f5f6;--ppc-mute:#a3a3ab;--ppc-line:rgba(214,228,255,.13);--ppc-glass:rgba(32,32,36,.62);width:min(760px,100%);margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:12px;color:var(--ppc-fg);font-family:var(--font-body);-webkit-font-smoothing:antialiased;text-align:left;line-height:1.5}
.ppc-root :where(svg){display:block;max-width:none}
.ppc-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ppc-root :where(p,ul,ol,li){margin:0;padding:0}
.ppc-root :where(button,textarea):focus-visible{outline:2px solid var(--ppc-a2);outline-offset:3px;border-radius:8px}
.ppc-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.ppc-icon{fill:currentColor}

.ppc-card{--mx:50%;--my:0%;position:relative;width:100%;border-radius:26px;padding:20px 16px 14px 22px;background:var(--ppc-glass);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);box-shadow:inset 0 0 0 1px var(--ppc-line),inset 0 1px 0 rgba(255,255,255,.08),0 24px 70px rgba(0,0,0,.5);transition:box-shadow .35s ease}
.ppc-card:focus-within{box-shadow:inset 0 0 0 1px rgba(214,228,255,.24),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 6px rgba(255,255,255,.035),0 24px 70px rgba(0,0,0,.55)}
.ppc-card[data-nudge="true"]{animation:ppc-nudge .45s cubic-bezier(.36,.07,.19,.97)}
.ppc-card[data-disabled="true"]{opacity:.65;pointer-events:none}
@keyframes ppc-nudge{20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
.ppc-sheen{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;background:radial-gradient(420px circle at var(--mx) var(--my),rgba(255,255,255,.075),transparent 55%);opacity:.9}
.ppc-field{position:relative}
.ppc-input{display:block;width:100%;min-height:44px;max-height:200px;resize:none;border:0;outline:0;background:transparent;color:var(--ppc-fg);font:inherit;font-size:16px;line-height:1.55;letter-spacing:.005em;padding:0;field-sizing:content}
.ppc-root .ppc-input:focus-visible{outline:none}
.ppc-ph{position:absolute;left:0;top:0;right:0;font-size:16px;line-height:1.55;color:#85868b;pointer-events:none;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ppc-caret{display:inline-block;width:2px;height:1.05em;margin-left:2px;vertical-align:-2px;background:var(--ppc-a2);animation:ppc-blink 1s steps(1) infinite}
@keyframes ppc-blink{50%{opacity:0}}
.ppc-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}
.ppc-label{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#9d9da4;font-weight:500}
.ppc-label .ppc-icon{width:11px;height:11px;fill:var(--ppc-a2)}
.ppc-right{display:flex;align-items:center;gap:6px;flex:none}
.ppc-model-wrap{position:relative}
.ppc-model{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 10px;border-radius:10px;font-size:12.5px;color:#a3a3aa;transition:background .2s,color .2s}
.ppc-model:hover,.ppc-model[aria-expanded="true"]{background:rgba(255,255,255,.07);color:#fff}
.ppc-model .ppc-icon{width:11px;height:11px;fill:var(--ppc-a2)}
.ppc-chev{width:9px;height:6px;transition:transform .3s}
.ppc-model[aria-expanded="true"] .ppc-chev{transform:rotate(180deg)}
.ppc-menu{position:absolute;right:0;bottom:calc(100% + 10px);z-index:20;min-width:200px;padding:6px;border-radius:14px;background:rgba(22,22,26,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 18px 50px rgba(0,0,0,.55);transform-origin:90% 100%;animation:ppc-pop .28s cubic-bezier(.16,1,.3,1)}
@keyframes ppc-pop{from{opacity:0;transform:translateY(6px) scale(.96)}}
.ppc-menu-item{display:flex;width:100%;align-items:baseline;justify-content:space-between;gap:16px;padding:9px 10px;border-radius:9px;font-size:13.5px;text-align:left}
.ppc-menu-item small{font-size:11.5px;color:#7d7d85}
.ppc-menu-item:hover,.ppc-menu-item:focus-visible{background:rgba(255,255,255,.08)}
.ppc-menu-item[aria-checked="true"] span{color:var(--ppc-a2)}
.ppc-send{position:relative;width:38px;height:38px;margin-left:4px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(160deg,var(--ppc-a1),var(--ppc-a2) 48%,var(--ppc-a3));box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 4px 16px var(--ppc-glow);transition:transform .3s cubic-bezier(.16,1,.3,1),filter .2s}
.ppc-send .ppc-icon{width:14px;height:14px;fill:var(--ppc-ink)}
.ppc-send[data-ready="false"]{filter:saturate(.35) brightness(.8)}
.ppc-send[data-ready="true"]{animation:ppc-ready 2.4s ease-in-out infinite}
@keyframes ppc-ready{50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 4px 26px var(--ppc-glow),0 0 0 6px rgba(255,255,255,.04)}}
.ppc-send:hover{transform:scale(1.07)}
.ppc-send:active{transform:scale(.94)}
.ppc-hint{font-size:12px;color:var(--ppc-mute);letter-spacing:.01em;text-shadow:0 1px 8px rgba(0,0,0,.8)}
.ppc-hint kbd{font:inherit;font-size:11px;padding:1px 6px;border-radius:5px;background:rgba(20,20,24,.7);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:#e2e2e7}

@media (max-width:760px){
.ppc-card{padding:16px 12px 12px 16px;border-radius:22px}
.ppc-tools{flex-direction:column;align-items:stretch;gap:12px;margin-top:14px}
.ppc-right{justify-content:flex-end}
.ppc-model-wrap{margin-right:auto}
.ppc-menu{left:0;right:auto;transform-origin:10% 100%}
.ppc-hint{display:none}
}
@media (max-width:420px){
.ppc-input,.ppc-ph{font-size:15px}
}
@media (prefers-reduced-motion:reduce){
.ppc-root *{animation:none;transition-duration:.01ms}
}
`;
