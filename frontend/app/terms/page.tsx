import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · RAG Assistant",
  description:
    "Terms of Service, acceptable use rules, Bring-Your-Own-Key responsibilities, AI accuracy disclaimers, and MIT license terms for RAG Assistant.",
};

const EFFECTIVE_DATE = "November 18, 2026";

const SECTIONS = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "service-scope", label: "2. Scope of the Software" },
  { id: "ai-disclaimer", label: "3. AI Output & Accuracy Disclaimer" },
  { id: "user-responsibilities", label: "4. User Responsibilities & Acceptable Use" },
  { id: "api-billing", label: "5. API Keys & Third-Party Billing" },
  { id: "intellectual-property", label: "6. Intellectual Property & MIT License" },
  { id: "third-parties", label: "7. Third-Party Services & Endpoints" },
  { id: "warranties-liability", label: "8. Warranties & Limitation of Liability" },
  { id: "changes-severability", label: "9. Modifications & Severability" },
];

const PROVIDER_TERMS = [
  {
    name: "Groq",
    role: "LLM Inference Terms",
    url: "https://groq.com/terms-of-use/",
  },
  {
    name: "Google Gemini",
    role: "Generative AI API Terms",
    url: "https://ai.google.dev/gemini-api/terms",
  },
  {
    name: "OpenAI",
    role: "API Terms of Use",
    url: "https://openai.com/policies/terms-of-use",
  },
  {
    name: "OpenRouter",
    role: "Platform Terms of Service",
    url: "https://openrouter.ai/terms",
  },
  {
    name: "Tavily",
    role: "Search API Terms",
    url: "https://tavily.com/terms",
  },
  {
    name: "DuckDuckGo",
    role: "Terms of Use",
    url: "https://duckduckgo.com/terms",
  },
];

export default function TermsPage(): JSX.Element {
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
          MIT Licensed · Self-Hosted Software
        </span>
      </div>

      {/* Header */}
      <header className="mt-6 border-b border-white/10 pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-100">
          Terms of Service
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          These Terms of Service govern your installation, deployment, and use of RAG Assistant.
          Please read them carefully before indexing documents or connecting third-party AI APIs.
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

      {/* At-a-Glance Summary Cards */}
      <section aria-label="Key Terms Summary" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Self-Hosted</p>
          <p className="mt-1.5 text-xs text-gray-400">
            You run the software on your own hardware and control network access and backups.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Your Own Keys</p>
          <p className="mt-1.5 text-xs text-gray-400">
            You supply your own API credentials and are responsible for provider usage charges.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">Verify Answers</p>
          <p className="mt-1.5 text-xs text-gray-400">
            AI responses can be inaccurate; always verify critical facts against cited pages.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#131923] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5FB2F2]">MIT License</p>
          <p className="mt-1.5 text-xs text-gray-400">
            Open-source software provided “as is” without warranties of any kind.
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

      {/* Terms Sections */}
      <div className="mt-10 space-y-10">
        <section id="acceptance" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            1. Acceptance of Terms
          </h2>
          <p>
            By downloading, installing, running, or accessing RAG Assistant (“the
            Software” or “the Service”), you agree to be bound by these Terms of
            Service (“Terms”) and our{" "}
            <Link href="/privacy" className="text-[#5FB2F2] hover:underline">
              Privacy Policy
            </Link>
            . If you are deploying the Software on behalf of an organization, you represent that you
            have the authority to bind that organization to these Terms. If you do not agree to
            these Terms, do not install or use the Software.
          </p>
        </section>

        <section id="service-scope" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            2. Scope of the Software & Local Deployment
          </h2>
          <p>
            RAG Assistant is a self-hosted Retrieval-Augmented Generation (RAG) tool that enables
            you to index local documents (such as PDFs) and web pages into a local vector store and
            query them using Large Language Models (LLMs), local custom replies, and optional web
            search fallbacks.
          </p>
          <p>
            Because the Software runs on infrastructure you control, the authors do not operate a
            hosted cloud service, manage user accounts, or guarantee uptime for your local
            deployment.
          </p>
        </section>

        <section id="ai-disclaimer" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            3. AI Output & Accuracy Disclaimer
          </h2>
          <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-200/90 space-y-1.5">
            <p className="font-semibold text-amber-200">Important Notice Regarding AI Responses</p>
            <p>
              Generated answers are produced probabilistically by third-party or local language
              models based on retrieved document chunks and optional web search results. Outputs
              may contain factual errors, omissions, misattributed citations, or outdated
              information.
            </p>
          </div>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-gray-100">Independent Verification:</strong> You are solely
              responsible for reviewing generated responses and verifying page-level citations
              against your original source documents before acting on them.
            </li>
            <li>
              <strong className="text-gray-100">No Professional Advice:</strong> Outputs from RAG
              Assistant do not constitute legal, medical, financial, tax, engineering, or compliance
              advice.
            </li>
          </ul>
        </section>

        <section id="user-responsibilities" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            4. User Responsibilities & Acceptable Use
          </h2>
          <p>When using RAG Assistant, you agree that you will:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-gray-100">Content Rights & Authorization:</strong> Only
              upload, index, or query PDFs, URLs, and datasets that you own or have explicit legal
              permission to process and transmit to your configured LLM provider.
            </li>
            <li>
              <strong className="text-gray-100">Lawful Use:</strong> Comply with all applicable
              local, national, and international laws, including copyright, data protection, and
              export-control regulations.
            </li>
            <li>
              <strong className="text-gray-100">Prohibited Conduct:</strong> Not use the Software to
              infringe intellectual property rights, bypass paywalls or access controls, scrape
              websites in violation of their terms, or generate unlawful, harmful, or abusive
              material.
            </li>
            <li>
              <strong className="text-gray-100">Deployment Security:</strong> Secure your host
              machine and restrict network access (via firewall, VPN, or authenticated reverse
              proxy) if you expose the application beyond <span className="font-mono text-xs text-gray-200">localhost</span>.
            </li>
          </ul>
        </section>

        <section id="api-billing" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            5. API Keys & Third-Party Billing
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-gray-100">Bring-Your-Own-Key (BYOK):</strong> Connecting to
              cloud LLM or web-search providers requires valid API credentials supplied by you in{" "}
              <em>Settings → API Key</em> or environment configuration.
            </li>
            <li>
              <strong className="text-gray-100">Account & Fee Responsibility:</strong> You are
              solely responsible for safeguarding your API keys, configuring usage quotas or spend
              alerts with each provider, and paying all token, embedding, and search fees incurred
              under your credentials.
            </li>
            <li>
              <strong className="text-gray-100">Credential Hygiene:</strong> Never commit{" "}
              <span className="font-mono text-xs text-gray-200">.env</span> or{" "}
              <span className="font-mono text-xs text-gray-200">data/keys.json</span> to version
              control, and rotate keys immediately if you suspect unauthorized access.
            </li>
          </ul>
        </section>

        <section id="intellectual-property" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            6. Intellectual Property & MIT License
          </h2>
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-white/10 bg-[#131923]/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-200">
                A. Your Documents & Outputs
              </h3>
              <p className="mt-1.5 text-gray-300">
                You retain all ownership and intellectual property rights in the PDFs, text, URLs,
                custom replies, and branding assets you add to RAG Assistant, as well as any
                outputs generated from your content (subject to the terms of your chosen LLM
                provider).
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#131923]/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-200">
                B. Software Source Code (MIT License)
              </h3>
              <p className="mt-1.5 text-gray-300">
                The source code of RAG Assistant is released under the{" "}
                <strong className="text-gray-100">MIT License</strong>. Subject to the conditions of
                the MIT License (including preservation of copyright and permission notices), you are
                free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                copies of the Software. Refer to the <span className="font-mono text-xs text-gray-200">LICENSE</span>{" "}
                file in the project repository for the full license text.
              </p>
            </div>
          </div>
        </section>

        <section id="third-parties" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            7. Third-Party Services & Endpoints
          </h2>
          <p>
            RAG Assistant integrates with external model and search providers (including Groq,
            Google Gemini, OpenAI, OpenRouter, Tavily, DuckDuckGo, Ollama, or custom
            OpenAI-compatible endpoints). Your use of those services is governed by their respective
            terms and usage policies. The authors are not responsible for third-party API outages,
            rate limits, model deprecations, or policy changes.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PROVIDER_TERMS.map((p) => (
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

        <section id="warranties-liability" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            8. Disclaimer of Warranties & Limitation of Liability
          </h2>
          <p>
            <strong className="text-gray-100">No Warranty:</strong> TO THE MAXIMUM EXTENT PERMITTED
            BY APPLICABLE LAW, THE SOFTWARE IS PROVIDED “AS IS” AND “AS
            AVAILABLE,” WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            ACCURACY, AND NON-INFRINGEMENT.
          </p>
          <p>
            <strong className="text-gray-100">Limitation of Liability:</strong> IN NO EVENT SHALL
            THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DIRECT, INDIRECT, INCIDENTAL,
            SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF DATA, CORRUPTION OF
            LOCAL VECTOR DATABASES, BUSINESS INTERRUPTION, OR THIRD-PARTY API CHARGES) ARISING OUT
            OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. You
            are encouraged to maintain regular backups of your original source files and{" "}
            <span className="font-mono text-xs text-gray-200">data/</span> directory.
          </p>
        </section>

        <section id="changes-severability" className="scroll-mt-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">
            9. Modifications & Severability
          </h2>
          <p>
            We may update these Terms from time to time in connection with new releases of the
            Software, reflected by an updated Effective Date at the top of this page. Continued use
            of an updated release constitutes acceptance of the revised Terms. If any provision of
            these Terms is held to be unenforceable or invalid, that provision will be enforced to
            the maximum extent permissible and the remaining provisions will remain in full force
            and effect.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-gray-300 transition-colors">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">
            Privacy Policy
          </Link>
        </div>
        <p>RAG Assistant · Local-First Document Intelligence</p>
      </footer>
    </main>
  );
}
