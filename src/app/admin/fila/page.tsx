import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FilaClient from "./FilaClient";

export const dynamic = "force-dynamic";

export default async function FilaPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");
  return <FilaClient />;
}
