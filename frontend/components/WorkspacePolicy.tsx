const policies = {
  overview: {
    title: "Workspace security",
    intro: "Your browser, the workspace server, and the services you connect each handle a different part of a conversation.",
    sections: [
      ["Access to your workspace", "The browser uses an HTTP-only session cookie to identify its saved provider settings and connectors. Anyone using the same browser profile can open that workspace. On a shared computer, use a separate browser profile and disconnect accounts when you finish."],
      ["Where credentials are kept", "The server saves personal keys and connector tokens in session-specific files with owner-only permissions. The deployment operator controls the server and its backups. The hosted NVIDIA key comes from the server environment and is used only with the NVIDIA endpoint."],
      ["Tool permissions", "Connected services receive requests using the permissions granted to the supplied token. Choose read-only scopes when you only need search or retrieval. For tools that request approval, review the destination and arguments before allowing the action."],
      ["Removing access", "Delete a personal key in API Keys or disconnect a service in Connectors. To invalidate a credential everywhere it has been used, revoke it with the issuing provider. Clearing browser data alone does not delete the server’s copy."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "This policy describes the information used when you personalize Reso, ask a question, or connect an external account.",
    sections: [
      ["Profile and conversations", "Your browser stores your chosen name, avatar, assistant identity, font, and onboarding preferences. Uploaded profile images are stored with those preferences. The chat interface keeps the current conversation in page memory. Clearing site data removes locally saved preferences."],
      ["What leaves the browser", "The workspace backend receives your question. It sends the prompt and any passages or tool results needed for the answer to the selected inference provider. Hosted chat uses NVIDIA. A personal key routes requests to the provider you configure. For a custom endpoint, its operator receives the request and supplied credential."],
      ["Connected services", "When a connector runs, the server sends a request to that service using your token. Returned records may become part of the model’s context. The site also requests interface fonts from Google Fonts, which receives ordinary web request information."],
      ["Storage and deletion", "The backend stores provider and connector settings under the browser session. Indexed documents live on the workspace server. Remove credentials before clearing your session cookie, or contact the deployment operator for server-side removal. External providers apply their own retention policies to requests they have already received."],
    ],
  },
  terms: {
    title: "Terms of service",
    intro: "These terms cover use of the Reso workspace, hosted chat, personal API credentials, and connected tools.",
    sections: [
      ["Using the workspace", "Use accounts, documents, and services you have permission to access. When connecting an organization’s account, follow its access policies and grant only the permissions needed for your task."],
      ["Hosted chat and personal keys", "When enabled by the operator, hosted NVIDIA chat is available without supplying a personal key. Availability depends on the host’s credentials, provider limits, and service uptime. Requests made with a personal key use that provider account’s quota and may incur charges under its plan."],
      ["Generated material", "Review generated code, reports, and citations before relying on or sharing them. Test code in an appropriate environment and check factual claims against the source documents. You decide whether generated material is suitable for its intended use."],
      ["Connected actions", "Read the tool name, arguments, and destination when approving an action. Sending a message or creating an external record can affect other people and may be difficult to reverse. Disconnecting a service stops subsequent access through that connection. Existing external records remain subject to that service’s controls."],
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
    {policy.sections.map(([heading, body]) => <section key={heading}>
      <h2 className="mb-1 text-lg font-semibold text-[#f4f3f8]">{heading}</h2>
      <p>{body}</p>
    </section>)}
  </article>;
}
