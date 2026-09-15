export type AdminRole = "admin" | "vendedor";

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
};

// Páginas que cada perfil pode acessar
export const ALLOWED_PATHS: Record<AdminRole, string[]> = {
  admin: ["*"], // tudo
  vendedor: [
    "/admin",
    "/admin/pedidos",
    "/admin/pedidos/novo",
    "/admin/produtos",
    "/admin/produtos/novo",
    "/admin/caderno",
    "/admin/clientes",
    "/admin/fila",
    "/admin/followup",
  ],
};

// Links do nav que cada perfil vê
export const NAV_LINKS: Record<AdminRole, string[]> = {
  admin: ["*"],
  vendedor: [
    "/admin",
    "/admin/pedidos",
    "/admin/produtos",
    "/admin/caderno",
    "/admin/clientes",
    "/admin/fila",
    "/admin/followup",
  ],
};

export function canAccess(adminRole: string | null | undefined, path: string): boolean {
  const role = (adminRole || "admin") as AdminRole;
  const allowed = ALLOWED_PATHS[role] || ALLOWED_PATHS.admin;
  if (allowed.includes("*")) return true;
  return allowed.some(p => path === p || path.startsWith(p + "/"));
}

export function getNavLinks(adminRole: string | null | undefined): string[] {
  const role = (adminRole || "admin") as AdminRole;
  return NAV_LINKS[role] || ["*"];
}
