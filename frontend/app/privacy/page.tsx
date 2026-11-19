import Link from "next/link";
import { WorkspacePolicy } from "@/components/WorkspacePolicy";

export const metadata = { title: "Privacy Policy · Reso" };

export default function Page() {
  return <main className="mx-auto max-w-prose px-5 py-10">
    <Link href="/" className="mb-8 inline-block text-sm text-gray-400 hover:text-white">Back to workspace</Link>
    <WorkspacePolicy section="privacy" />
  </main>;
}
