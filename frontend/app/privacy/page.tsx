import Link from "next/link";

export const metadata = { title: "Privacy Policy · RAG Assistant" };

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-sm text-gray-300 leading-relaxed">
      <Link href="/" className="text-xs text-[#5FB2F2] hover:underline">← Back to app</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-gray-100">Privacy Policy</h1>
      <p className="mt-1 text-xs text-gray-500">Last updated: {new Date().toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}</p>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">Summary</h2>
        <p>RAG Assistant runs on your machine. It does not send telemetry, analytics, or usage data anywhere. Data only leaves your machine when you send a question, and only the minimum needed to answer it.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">What is stored locally</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Browser localStorage:</strong> display name, avatar, assistant name, custom logo, headline, body text, font choice, and any custom replies you create.</li>
          <li><strong>Backend <span className="font-mono text-gray-200">data/keys.json</span>:</strong> API keys you paste into Settings, with owner-only file permissions.</li>
          <li><strong>Backend <span className="font-mono text-gray-200">data/chroma/</span>:</strong> the vector index built from your PDFs and any URLs you add.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">What is sent over the network</h2>
        <p>When you ask a question, the following is sent to the LLM provider you selected (Groq, Google, OpenAI, OpenRouter, Ollama, or your custom endpoint):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your question.</li>
          <li>The top-matching text chunks retrieved from your PDFs or saved web pages.</li>
          <li>Any custom assistant name you have set, if it is used in the system prompt.</li>
        </ul>
        <p>If web search is enabled and triggered, your question is also sent to DuckDuckGo or Tavily, along with a request to fetch the top result pages.</p>
        <p>Your API key is sent only to the provider it belongs to, as part of the request authentication.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">What is NOT collected</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>No analytics or tracking scripts.</li>
          <li>No third-party telemetry from this application.</li>
          <li>No account system, so no email or password is ever stored.</li>
          <li>No retention of your questions on any server you don't control.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">Your control</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You can remove any saved API key from Settings → API Key.</li>
          <li>You can clear all local data from Settings → Security.</li>
          <li>You can delete <span className="font-mono text-gray-200">data/keys.json</span> and <span className="font-mono text-gray-200">data/chroma/</span> from the backend at any time.</li>
          <li>Because everything is local, uninstalling the app removes all stored data.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">Third-party policies</h2>
        <p>Data you send to an LLM or web-search provider is governed by that provider's privacy policy. Review their terms before using sensitive content.</p>
      </section>

      <div className="mt-10 border-t border-white/10 pt-4 text-xs text-gray-500">
        <Link href="/terms" className="hover:text-gray-300">Terms of Service</Link>
      </div>
    </main>
  );
}
