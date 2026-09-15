import { auth } from "@/lib/auth";

export type Sessao = { ok: true; nome: string | null } | { ok: false };

/** Todas as rotas do CRM passam por aqui: dado de cliente nao sai sem admin. */
export async function exigirAdmin(): Promise<Sessao> {
  const session = await auth();
  const user = session?.user as { role?: string; name?: string | null } | undefined;
  if (!session || user?.role !== "admin") return { ok: false };
  return { ok: true, nome: user?.name || null };
}
