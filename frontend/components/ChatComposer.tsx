// ... (baaki imports same rahenge)

export default function ChatComposer({
  onSubmit,
  disabled = false,
  prompts = DEFAULT_PROMPTS,
  placeholder = "Ask about your documents...",
  models = ["Turbo", "Studio", "Deep"],
  modelNotes,
  hint = false, // <--- Yahan default false kar diya
  accent = "ice",
  className,
}: ChatComposerProps): JSX.Element {
  // ... (baaki code same rahega)
