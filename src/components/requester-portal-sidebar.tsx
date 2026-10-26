import Image from "next/image";
import Link from "next/link";

export function RequesterPortalSidebar({ active }: { active: "new" | "requests" }) {
  const items = [
    { id: "new", icon: "+", label: "Nova solicitação", href: "/demo/portal" },
    { id: "requests", icon: "▣", label: "Minhas solicitações", href: "/demo/portal/requests" },
  ] as const;

  return <aside className="oneit-requester-sidebar fixed inset-y-0 left-0 z-20 flex w-64 flex-col px-4 py-0 text-white">
    <Link href="/demo/portal" className="flex h-20 items-center justify-center border-b border-white/15">
      <Image src="/brand/oneit-white.png" alt="OneIT" width={205} height={64} priority className="h-16 w-[205px] object-contain object-center" />
    </Link>
    <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Autoatendimento</p>
    <nav className="space-y-1">{items.map((item) => <Link key={item.id} href={item.href} aria-current={item.id === active ? "page" : undefined} className={"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition " + (item.id === active ? "font-semibold text-white" : "text-slate-100")}><span className="grid h-5 w-5 place-items-center text-center">{item.icon}</span>{item.label}</Link>)}</nav>
    <div className="mt-auto border-t border-white/15 px-3 pb-5 pt-4 text-xs text-white/60"><p className="font-semibold text-white">Portal OneIT</p><p>Área do solicitante</p></div>
  </aside>;
}
