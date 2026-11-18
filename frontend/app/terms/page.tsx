import Link from "next/link";

export const metadata = { title: "Terms of Service · RAG Assistant" };

export default function TermsPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-sm text-gray-300 leading-relaxed">
      <Link href="/" className="text-xs text-[#5FB2F2] hover:underline">← Back to app</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-gray-100">Terms of Service</h1>
      <p className="mt-1 text-xs text-gray-500">Last updated: {new Date().toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}</p>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">1. Acceptance</h2>
        <p>By using RAG Assistant ("the Service"), you agree to these terms. If you do not agree, do not use the Service.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">2. Description</h2>
        <p>The Service is a retrieval-augmented question-answering tool that reads documents you provide and answers using a large language model of your choosing. Answers may be inaccurate, incomplete, or outdated. You are responsible for verifying any information before relying on it.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">3. Your responsibilities</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must own or have permission to use any document or URL you upload.</li>
          <li>You are responsible for the API keys you provide and for any charges incurred with those providers.</li>
          <li>You must not use the Service to break the law, infringe intellectual property, or process data you are not authorized to process.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">4. Third-party services</h2>
        <p>The Service connects to third-party LLM providers (Groq, Google, OpenAI, OpenRouter, Ollama, or a custom endpoint) and web-search providers. Their terms and privacy policies apply to the requests you send through them.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">5. No warranty</h2>
        <p>The Service is provided "as is" without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">6. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, the authors are not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">7. Changes</h2>
        <p>These terms may change. Continued use after a change constitutes acceptance of the new terms.</p>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-100">8. License</h2>
        <p>The source code of this project is released under the MIT License. See the LICENSE file in the repository.</p>
      </section>

      <div className="mt-10 border-t border-white/10 pt-4 text-xs text-gray-500">
        <Link href="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
      </div>
    </main>
  );
}
