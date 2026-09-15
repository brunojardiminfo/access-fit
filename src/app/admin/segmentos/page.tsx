import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SegmentosClient from "./SegmentosClient";

export const dynamic = "force-dynamic";

export default async function SegmentosPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");
  return <SegmentosClient />;
}
