const policies = {
  overview: {
    title: "Security architecture",
    intro: "Reso separates browser preferences, server-side credentials, model requests, and connected-service access. Security depends on the deployment operator, the providers you choose, and the permissions you grant.",
    sections: [
      ["Workspace access and isolation", "A browser session identifies the workspace that owns its saved provider configuration and connector credentials. Keep access to your browser profile and deployment restricted: another person using the same session may be able to use its connected accounts. Use a separate profile on shared devices, sign out when finished, and operate the backend only on infrastructure you control."],
      ["Credential storage", "Provider keys, connector credentials, and plugin settings are stored by the backend in data/keys.json, data/connectors.json, and data/plugins.json within the applicable workspace. The backend applies owner-only file permissions (chmod 0600) when writing these files. This is filesystem access control, not encryption; the deployment operator remains responsible for host security, backups, and access to the data directory. The shared NVIDIA NIM key is read from the server environment and is not sent to the browser."],
      ["Tool input, output, and consent", "Tool arguments are checked against the tool’s declared JSON schema and are limited to 10 KB. Tool results passed back into the agent are capped at 4,000 characters, and an agent request is bounded to 12 reasoning turns. Tools marked requires_consent=True pause for your approval before execution. Read the proposed action and its arguments before allowing a write or other consequential operation."],
      ["Connected-service permissions", "A connector can access only what its credential and the remote service permit, but Reso cannot reduce permissions already granted to that credential. Prefer narrowly scoped, read-only tokens for search and retrieval. Write-capable actions can create or change data in external services, so verify the account, destination, and requested change before approving them."],
      ["Disconnecting and revoking credentials", "Deleting a saved API key or disconnecting a connector removes its credential from Reso’s active workspace configuration so subsequent requests no longer use it. If you suspect exposure, also revoke or rotate the credential with its issuer; removing a local copy cannot invalidate tokens already issued by an external provider. Clearing browser data does not by itself remove server-side credentials."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "This policy explains what Reso processes when you personalize the workspace, search local documents, use an AI provider, or connect an external service.",
    sections: [
      ["Local documents and retrieval", "Documents added to the knowledge base are processed by the workspace backend and indexed for retrieval using ChromaDB. When you ask a question, Reso searches that index and selects relevant passages; the whole document collection is not automatically sent to a model for each question. Document files, indexes, logs, backups, and retention are controlled by the deployment operator and the storage configuration."],
      ["AI provider transmission", "Chat sends up to six recent conversation turns for continuity. Agent mode uses the same bounded history and can call enabled tools. The backend sends your prompt and the context required to answer it—including relevant document passages and, when used, connector results—to the active inference provider. Hosted NVIDIA chat sends those request contents to NVIDIA using the server-side NVIDIA key. A personal provider key routes requests to that provider, and a custom endpoint sends them to the operator of that endpoint. Providers may process or retain requests under their own terms and policies; review those policies before sending sensitive information."],
      ["Connected services", "A connector request sends the required operation and credential to the service you chose. Only records returned by that operation are available to the assistant as connector context, but the external service handles the request under its own privacy and retention practices. Reso does not control how a provider processes data after it has received it."],
      ["Profile and browser data", "Your browser stores interface preferences such as your name, avatar, assistant identity, selected font, and onboarding status. Uploaded profile images are saved as part of those browser preferences. Plus Jakarta Sans and Google Sans are served with the app. The interface also requests optional typefaces from Google Fonts, which receives ordinary connection information such as your IP address and browser headers."],
      ["Retention, deletion, and revocation", "Provider and connector credentials are stored by the backend for the workspace that configured them. Delete a key or disconnect a connector in Settings to remove it from active use; contact the deployment operator for removal from server backups or other retained storage. Clear browser site data to remove local profile preferences. Revoke a credential with its issuer to stop access outside Reso. Data already transmitted to an AI or connected service is subject to that service’s retention policy."],
    ],
  },
  terms: {
    title: "Terms of service",
    intro: "By using Reso, you agree to use the workspace, AI providers, and connected services lawfully and to review actions and generated material before relying on them.",
    sections: [
      ["Authorized use", "Use only documents, accounts, API credentials, repositories, and other resources you are authorized to access. You are responsible for following applicable law, your organization’s policies, and each provider’s terms. Do not use Reso to bypass access controls or to connect accounts without the owner’s permission."],
      ["API keys, hosted chat, and fees", "The deployment may offer hosted NVIDIA NIM access without a personal key when the operator has configured NVIDIA_API_KEY. The operator controls its availability, limits, and service uptime. When you supply a personal key, requests use your provider account and may consume quota or incur charges under that provider’s plan. Protect credentials and rotate them if exposed."],
      ["Generated code and documents", "AI-generated code, reports, summaries, and citations may be incomplete, inaccurate, insecure, or unsuitable for your purpose. Verify important claims against the original sources, review generated code, test it in a safe environment, and check licenses and other applicable requirements before use or distribution. You are responsible for deciding whether generated material is fit for use."],
      ["Tool execution and external effects", "Review the tool, target service, and arguments before granting consent. Some approved actions can send messages, create records, or change external data; those effects may be visible to others and difficult to reverse. Reso executes tools according to their configured permissions and the credentials you supplied. You remain responsible for the consequences of actions you approve."],
      ["Service availability and third parties", "Reso depends on the deployment operator, model providers, and connected services. Those services may change, impose limits, or become unavailable, and their own terms govern your use of them. Disconnecting an integration prevents future use of its saved credential through Reso, but does not delete records already created in that external service."],
    ],
  },
};

export function WorkspacePolicy({ section }: { section: keyof typeof policies }) {
  const policy = policies[section];
  return <article className="mx-auto max-w-prose space-y-7 break-words text-sm leading-7 text-[#e6e4f0]/80">
    <header>
      <h1 className="text-3xl font-semibold tracking-tight text-[#f4f3f8] sm:text-4xl">{policy.title}</h1>
      <p className="mt-3">{policy.intro}</p>
    </header>
    <nav aria-label="On this page" className="flex flex-wrap gap-x-5 gap-y-1 border-y border-white/10 py-3 text-xs">
      {policy.sections.map(([heading], i) => <a className="underline decoration-white/30 underline-offset-4" key={heading} href={`#${section}-${i}`}>{heading}</a>)}
    </nav>
    {policy.sections.map(([heading, body], i) => <section id={`${section}-${i}`} className="scroll-mt-4" key={heading}>
      <h2 className="mb-1 text-lg font-semibold text-[#f4f3f8]">{heading}</h2>
      <p>{body}</p>
    </section>)}
  </article>;
}

export default WorkspacePolicy;
