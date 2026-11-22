import ChatWorkspace from "../../../components/ChatWorkspace";
import { notFound } from "next/navigation";

const sections = new Set(["appearance", "haptics", "notifications", "widget", "action", "language", "customize", "tools", "behavior", "privacy", "memory", "premium", "profile", "connectors", "keys", "model", "security"]);

export const metadata = { title: "Workspace settings · Reso Agent" };

export default function SettingsPage({ params }: { params: { section?: string[] } }) {
  const path = params.section ?? [];
  if (path.length > 1 || (path[0] && !sections.has(path[0]))) notFound();
  return <ChatWorkspace initialSettings />;
}
