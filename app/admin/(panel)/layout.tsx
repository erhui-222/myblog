import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { countTrash } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "后台",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const trashCount = await countTrash();

  return (
    <AdminShell username={env.adminUsername} trashCount={trashCount}>
      {children}
    </AdminShell>
  );
}
