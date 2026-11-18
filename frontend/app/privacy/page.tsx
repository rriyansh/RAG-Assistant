import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · RAG Assistant",
  description:
    "How RAG Assistant handles local storage, API credentials, document indexing, and third-party LLM requests.",
};

const EFFECTIVE_DATE = "November 18, 2026";

const SECTIONS = [
  { id: "overview", label: "1. Overview & Architecture" },
  { id: "local-storage", label: "2. Local Data Storage" },
  { id: "network-transmission", label: "3. External Data Transmission" },
  { id: "not-collected", label: "4. What Is Never Collected" },
  { id: "security", label: "5. Security Safeguards" },
  { id: "third-parties", label: "6. Third-Party Providers" },
  { id: "user-controls", label: "7. Retention & User Controls" },
  { id: "updates", label: "8. Policy Updates" },
];

const PROVIDERS = [
  {
    name: "Groq",
    role: "LLM Inference",
    url: "https://groq.com/privacy-policy/",
  },
  {
    name: "Google Gemini",
    role: "LLM Inference & Embeddings",
    url: "https://policies.google.com/privacy",
  },
  {
    name: "OpenAI",
    role: "LLM Inference & Embeddings",
    url: "https://openai.com/policies/privacy-policy",
  },
  {
    name: "OpenRouter",
    role: "Unified LLM Routing",
    url: "https://openrouter.ai/privacy",
  },
  {
    name: "Tavily",
    role: "Optional Web Search Fallback",
    url: "https://tavily.com/privacy",
  },
  {
    name: "DuckDuckGo",
    role: "Optional Web Search Fallback",
    url: "https://duckduckgo.com/privacy",
  },
];

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 text-sm text-gray-300 leading-relaxed">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5FB2F2] hover:underline"
        >
          ← Back to application
        </Link>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-gray-400">
          Local-First Self-Hosted Software
        </span>
      </div>

      {/* Header */}
      <header className="mt-6 border-b border-white/10 pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-100">
          Privacy Policy
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          This Privacy Policy explains how RAG Assistant processes, stores, and transmits data
          when you run the application on your local machine or private infrastructure.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>
            <strong className="font-medium text-gray-400">Effective Date:</strong> {EFFECTIVE_DATE}
          </span>
          <span>
            <strong className="font-medium text-gray-400">Last Updated:</strong> {EFFECTIVE_DATE}
          </span>
        </div>
      </header>

      {/* At-a-Glance Privacy Highlights */}
      <section aria-label="Privacy Highlights" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Zero Telemetry</p>
          <p className="mt-1.5 text-xs text-gray-400">
            No analytics, tracking pixels, crash reporters, or background usage beacons.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Local Indexing</p>
          <p className="mt-1.5 text-xs text-gray-400">
            PDFs, URLs, and vector embeddings remain strictly on your local disk.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Direct Routing</p>
          <p className="mt-1.5 text-xs text-gray-400">
            Prompts go directly from your machine to your chosen AI provider—never through an intermediary.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Full Control</p>
          <p className="mt-1.5 text-xs text-gray-400">
            Wipe browser state, API keys, or vector databases at any time with one click.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <nav
        aria-label="Table of contents"
        className="mt-8 rounded-xl border border-white/10 bg-[#0f141c]/70 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Contents</p>
        <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {SECTIONS.map((sec) => (
            <li key={sec.id}>
              <a
                href={`#${sec.id}`}
                className="text-gray-300 hover:text-[#5FB2F2] transition-colors"
              >
                {sec.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Policy Sections */}
      <div className="mt-10 space-y-10">
        <section id="overview" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            1. Overview & Local-First Architecture
          </h2>
          <p>
            RAG Assistant is designed as a self-hosted, local-first Retrieval-Augmented Generation
            (RAG) application. Unlike cloud-hosted AI platforms, the application operates directly on
            your computer or private server and does not maintain central user accounts or external
            databases.
          </p>
          <p>
            Data leaves your environment only when you actively submit a query that requires an
            external Large Language Model (LLM) or optional web-search provider, and even then,
            transmission is limited strictly to the context required to generate your response.
          </p>
        </section>

        <section id="local-storage" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            2. Information Stored Locally on Your Device
          </h2>
          <p>
            All application state is persisted locally across your web browser and the local backend
            filesystem:
          </p>
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-white/10 bg-[#131923]/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-200">
                A. Browser Storage (<span className="font-mono text-[#5FB2F2]">localStorage</span>)
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1.5 text-gray-300">
                <li>
                  <strong className="text-gray-100">Profile & Branding (<span className="font-mono text-xs">rag.profile</span>):</strong>{" "}
                  Display name, uploaded user avatar (stored as a local data URL), custom assistant
                  name, assistant logo, welcome headline, body text, and interface font preference.
                </li>
                <li>
                  <strong className="text-gray-100">Custom Replies (<span className="font-mono text-xs">rag.canned</span>):</strong>{" "}
                  Trigger phrases, match modes (<span className="font-mono text-xs">contains</span> or{" "}
                  <span className="font-mono text-xs">exact</span>), and predefined responses. Custom
                  replies execute 100% locally in your browser without triggering network requests.
                </li>
                <li>
                  <strong className="text-gray-100">Conversation History (<span className="font-mono text-xs">rag.history</span>):</strong>{" "}
                  Your local chat sessions, prompts, retrieved citations, and generated answers.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#131923]/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-200">
                B. Local Backend Filesystem
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1.5 text-gray-300">
                <li>
                  <strong className="text-gray-100">API Credentials (<span className="font-mono text-xs">data/keys.json</span>):</strong>{" "}
                  Provider API keys, custom model overrides, and endpoint URLs saved via{" "}
                  <em>Settings → API Key</em>.
                </li>
                <li>
                  <strong className="text-gray-100">Document & Vector Store (<span className="font-mono text-xs">data/chroma/</span>):</strong>{" "}
                  Parsed text chunks, document metadata, page numbers, and vector embeddings
                  generated from uploaded PDFs or indexed web pages.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="network-transmission" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            3. Data Transmitted to External Services
          </h2>
          <p>
            When you ask a question that does not match a local Custom Reply, the backend transmits
            only the minimum payload needed to fulfill your request:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-gray-100">Selected LLM Provider:</strong> Receives your prompt,
              the top-K most relevant text passages retrieved from your local documents, and your
              configured assistant system persona. Your API key is sent exclusively in the
              authentication header to the specific provider you selected.
            </li>
            <li>
              <strong className="text-gray-100">Optional Web Search Fallback:</strong> If web search
              is enabled in <em>Settings → Parameters</em> and document similarity falls below the
              configured fallback threshold, your query is sent to your configured search provider
              (DuckDuckGo or Tavily) to retrieve supplemental web context.
            </li>
            <li>
              <strong className="text-gray-100">100% Offline Mode (Ollama / Local Endpoints):</strong>{" "}
              If you configure Ollama or a local OpenAI-compatible server with local embeddings and
              disable web search, zero prompt or document data ever leaves your machine.
            </li>
          </ul>
        </section>

        <section id="not-collected" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            4. What Is Never Collected
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>No behavioral analytics, cookies, fingerprinting, or third-party tracking scripts.</li>
            <li>No diagnostic telemetry, error reporting, or usage metrics sent to the developers.</li>
            <li>No registration system, email addresses, passwords, or billing identifiers.</li>
            <li>No centralized server logs or external copies of your uploaded PDFs or chat history.</li>
          </ul>
        </section>

        <section id="security" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            5. Security Safeguards & Credential Handling
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-gray-100">Restricted File Permissions:</strong> Saved API keys
              in <span className="font-mono text-xs text-gray-200">data/keys.json</span> are written
              with POSIX file permissions set to{" "}
              <span className="font-mono text-xs text-gray-200">0600</span> (owner read/write only).
            </li>
            <li>
              <strong className="text-gray-100">Credential Masking:</strong> Once saved, full API
              keys are never returned to the browser interface. The UI displays only a masked
              identifier (first 4 and last 4 characters).
            </li>
            <li>
              <strong className="text-gray-100">Deployment Responsibility:</strong> If you expose
              RAG Assistant over a local network or public internet, you are responsible for
              securing access with TLS/HTTPS and an authentication proxy.
            </li>
          </ul>
        </section>

        <section id="third-parties" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            6. Third-Party Providers & External Policies
          </h2>
          <p>
            When you connect an external AI or search API, data sent in those requests is governed by
            that provider's respective privacy policy and API data-retention terms. Review your
            chosen provider's terms before processing confidential or regulated documents:
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PROVIDERS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#131923] px-3.5 py-2.5 hover:border-[#5FB2F2]/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-100">{p.name} ↗</span>
                <span className="mt-0.5 text-[11px] text-gray-400">{p.role}</span>
              </a>
            ))}
          </div>
        </section>

        <section id="user-controls" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            7. Data Retention & Your Controls
          </h2>
          <p>
            You retain sole custody and lifecycle control over all stored data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-gray-100">Revoke or Delete API Keys:</strong> Remove any
              configured provider key immediately under <em>Settings → API Key → Remove</em>.
            </li>
            <li>
              <strong className="text-gray-100">Clear Browser Data:</strong> Reset your profile,
              avatar, custom replies, and chat history in one action via{" "}
              <em>Settings → Security → Clear local data</em>.
            </li>
            <li>
              <strong className="text-gray-100">Purge Indexed Documents:</strong> Delete individual
              documents inside the app or remove{" "}
              <span className="font-mono text-xs text-gray-200">data/chroma/</span> and{" "}
              <span className="font-mono text-xs text-gray-200">data/keys.json</span> directly from
              your filesystem.
            </li>
          </ul>
        </section>

        <section id="updates" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            8. Changes to This Policy
          </h2>
          <p>
            If future releases introduce new optional integrations or storage mechanisms, this
            Privacy Policy will be updated alongside the release notes with a revised Effective Date
            at the top of this page.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-gray-300 transition-colors">
            Home
          </Link>
          <Link href="/terms" className="hover:text-gray-300 transition-colors">
            Terms of Service
          </Link>
        </div>
        <p>RAG Assistant · Local-First Document Intelligence</p>
      </footer>
    </main>
  );
}
