// components/ui/integration-showcase.tsx
"use client";

import * as React from "react";
import { cn, DEFAULT_RAG_ASSISTANT_LOGO } from "../../lib/utils";

export interface Integration {
  name: string;
  description: string;
  iconSrc: string;
}

export interface IntegrationShowcaseProps {
  title: string;
  subtitle: string;
  illustrationSrc?: string;
  illustrationAlt?: string;
  integrations: Integration[];
  className?: string;
  onSelectIntegration?: (name: string) => void;
}

const HighlightedTitle = ({ text }: { text: string }) => {
  const parts = text.split(/~/);
  return (
    <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
      {parts.map((part, index) =>
        index === 1 ? (
          <span key={index} className="relative whitespace-nowrap text-indigo-300">
            <span className="relative z-10">{part}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 418 42"
              className="absolute -bottom-1.5 left-0 h-auto w-full text-indigo-500/70"
              preserveAspectRatio="none"
            >
              <path
                d="M203.371.916c-26.013-2.078-76.686 1.98-114.243 8.919-37.556 6.939-78.622 17.103-122.256 28.703-43.633 11.6-4.984 14.306 43.123 7.021 48.107-7.285 93.638-16.096 146.446-17.742 52.808-1.646 105.706 5.429 158.649 14.13 52.943 8.701 105.886 19.342 158.826 29.483 52.94 10.141 52.94 10.141-11.41-19.043C371.18 14.363 322.753 5.488 281.339 2.143 239.925-1.201 203.371.916 203.371.916z"
                fill="currentColor"
              />
            </svg>
          </span>
        ) : (
          part
        )
      )}
    </h2>
  );
};

export const DEFAULT_RAG_INTEGRATIONS: Integration[] = [
  {
    name: "Local PDF Knowledge Base",
    description:
      "Semantic ChromaDB vector retrieval across your indexed research papers, manuals, and reports.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#ef4444" d="M12 6h18l10 10v24c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4V10c0-2.2 1.8-4 4-4z"/><path fill="#fca5a5" d="M30 6v10h10z"/><text x="24" y="34" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">PDF</text></svg>`
      ),
  },
  {
    name: "Gmail",
    description:
      "Search inbox threads, summarize correspondence, and draft or dispatch emails with explicit user consent.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/><path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/><polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/><path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8C4.924,8,3,9.924,3,12.298z"/><path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8C43.076,8,45,9.924,45,12.298z"/></svg>`
      ),
  },
  {
    name: "Google Drive",
    description:
      "Locate Drive documents and extract structured text directly from Google Docs and cloud files.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/><path fill="#00832d" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/><path fill="#2684fc" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"/></svg>`
      ),
  },
  {
    name: "GitHub",
    description:
      "Inspect repository source files, search codebases, and open tracked engineering issues.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`
      ),
  },
  {
    name: "Notion",
    description:
      "Query connected workspaces, knowledge wikis, and structured database pages in real time.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#ffffff"/><path d="M28 24h14l24 38V24h10v52H62L38 38v38H28V24z" fill="#0f172a"/></svg>`
      ),
  },
  {
    name: "Slack",
    description:
      "Deliver automated summaries and team notifications to designated channels with approval controls.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.8 122.8"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"/><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"/><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"/><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"/></svg>`
      ),
  },
  {
    name: "Live Web Research",
    description:
      "Real-time web search and full-text article extraction for up-to-the-minute external citations.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#0284c7"/><path fill="none" stroke="#e0f2fe" stroke-width="2.5" d="M24 5c5 5 8 11.7 8 19s-3 14-8 19M24 5c-5 5-8 11.7-8 19s3 14 8 19M6 18h36M6 30h36"/></svg>`
      ),
  },
  {
    name: "Custom REST Webhooks",
    description:
      "Bridge internal microservices, CRMs, or proprietary APIs via authenticated JSON webhooks.",
    iconSrc:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#4f46e5"/><path d="M16 24h16M24 16l8 8-8 8" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
      ),
  },
];

export const IntegrationShowcase = React.forwardRef<
  HTMLElement,
  IntegrationShowcaseProps
>(
  (
    {
      title,
      subtitle,
      illustrationSrc = DEFAULT_RAG_ASSISTANT_LOGO,
      illustrationAlt = "RAG Assistant Emblem",
      integrations,
      className,
      onSelectIntegration,
    },
    ref
  ) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }, []);

    return (
      <section
        ref={ref}
        className={cn(
          "w-full rounded-3xl border border-white/10 bg-slate-900/50 py-8 px-5 sm:py-10 sm:px-8",
          className
        )}
      >
        <div className="mx-auto max-w-6xl">
          {/* Header Section with RAG Assistant Logo */}
          <div className="grid grid-cols-1 items-center gap-x-10 gap-y-8 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="max-w-xl">
              <HighlightedTitle text={title} />
              <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                {subtitle}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center rounded-3xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-sky-500/10 p-5 shadow-xl shadow-indigo-950/40">
                <img
                  src={illustrationSrc || DEFAULT_RAG_ASSISTANT_LOGO}
                  alt={illustrationAlt}
                  className="h-24 w-24 rounded-2xl object-contain sm:h-28 sm:w-28"
                />
                <div className="ml-4 hidden sm:block">
                  <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                    RAG Assistant Core
                  </span>
                  <p className="mt-1 text-xs font-medium text-slate-200">
                    Hybrid Vector + Agentic Loop
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Grounded citations & tool consent
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations Grid */}
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {integrations.map((item, idx) => (
              <div
                key={item.name}
                onClick={() => onSelectIntegration?.(item.name)}
                style={{ transitionDelay: `${idx * 55}ms` }}
                className={cn(
                  "group flex items-start space-x-3.5 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 transition-all duration-500",
                  onSelectIntegration &&
                    "cursor-pointer hover:border-indigo-400/40 hover:bg-slate-900/90",
                  mounted
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900 p-1.5">
                  <img
                    src={item.iconSrc}
                    alt={`${item.name} logo`}
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
);

IntegrationShowcase.displayName = "IntegrationShowcase";
export default IntegrationShowcase;
