import type { SVGProps } from "react";

type IconName = "ticket" | "field" | "calendar" | "review" | "document" | "audit" | "alert" | "settings" | "report" | "catalog" | "logout" | "default";

const paths: Record<IconName, string> = {
  ticket: "M4 5h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V5Zm4 4h8m-8 4h5",
  field: "M12 3a7 7 0 1 0 7 7c0-3.9-3.1-7-7-7Zm0 3v4l3 2",
  calendar: "M5 4h14v16H5zM8 2v4m8-4v4M5 9h14",
  review: "M12 3l2.3 4.7L19 9l-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8L5 9l4.7-1.3L12 3Z",
  document: "M6 3h9l3 3v15H6zM15 3v4h3M9 11h6m-6 4h6",
  audit: "M4 5h16v14H4zM8 9h8M8 13h5M8 17h3",
  alert: "M12 4 3 20h18L12 4Zm0 5v5m0 3v.1",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4",
  report: "M5 4h14v16H5zM8 16v-4m4 4V8m4 8v-6",
  catalog: "M4 5h16v14H4zM8 9h8m-8 4h5",
  logout: "M10 5H5v14h5m5-4 4-3-4-3m4 3H9",
  default: "M5 12h14M12 5l7 7-7 7",
};

export function OneitNavIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name]} /></svg>;
}

export function navIconName(label: string): IconName {
  const value = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("chamado")) return "ticket";
  if (value.includes("field") || value.includes("rota")) return "field";
  if (value.includes("agenda") || value.includes("calend")) return "calendar";
  if (value.includes("analise") || value.includes("validacao") || value.includes("aprova")) return "review";
  if (value.includes("document")) return "document";
  if (value.includes("auditor")) return "audit";
  if (value.includes("nc") || value.includes("alert")) return "alert";
  if (value.includes("config") || value.includes("cadastro") || value.includes("usuario")) return "settings";
  if (value.includes("relatorio") || value.includes("dashboard") || value.includes("visao geral") || value.includes("faturamento")) return "report";
  if (value.includes("catalog")) return "catalog";
  return "default";
}
