"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { OneitNavIcon, navIconName } from "@/components/oneit-nav-icon";

import { activeNavigationHref } from "@/lib/navigation/active-link";

type Group = { title: string; links: readonly (readonly [string, string])[] };

export function PortalSidebarLight({ navigation }: { navigation: readonly Group[] }) {
  const pathname = usePathname();
  const activeHref = activeNavigationHref(pathname, navigation.flatMap((group) => group.links.map(([, href]) => href)));
  const [open, setOpen] = useState<Record<string, boolean>>({ Operação: true });
  return <aside aria-label="Navegação principal" className="oneit-portal-sidebar-light fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white px-3 text-slate-800 shadow-sm">
    <Link href="/portal" aria-label="OneIT · início" className="oneit-sidebar-logo flex h-20 items-center justify-center border-b border-slate-200"><Image src="/brand/oneit-color.png" alt="OneIT" width={174} height={55} priority className="h-14 w-[174px] object-contain" /></Link>
    <nav className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">{navigation.map((group) => {
      const activeGroup = group.links.some(([, href]) => href === activeHref);
      const expanded = open[group.title] ?? activeGroup;
      return <section key={group.title} className="border-b border-slate-100 pb-2"><button type="button" aria-expanded={expanded} onClick={() => setOpen((old) => ({ ...old, [group.title]: !expanded }))} className="oneit-sidebar-group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"><span>{group.title}</span><span aria-hidden className="text-slate-500">{expanded ? "⌄" : "›"}</span></button>{expanded && <div className="oneit-sidebar-links ml-2 space-y-0.5 border-l border-slate-200 pl-2">{group.links.map(([label, href]) => { const active = href === activeHref; return <Link key={href} href={href} title={label} aria-label={label} data-oneit-label={label} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-sky-100 font-semibold text-sky-950 shadow-[inset_3px_0_0_#075985]" : "text-slate-700 hover:bg-slate-100"}`}><OneitNavIcon name={navIconName(label)} className="h-[18px] w-[18px] shrink-0" /><span>{label}</span></Link>; })}</div>}</section>;
    })}</nav>
    <form action={logout} className="border-t border-slate-200 py-3"><button type="submit" title="Sair" aria-label="Sair" className="oneit-sidebar-logout flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><OneitNavIcon name="logout" className="h-[18px] w-[18px]" /><span>Sair</span></button></form>
  </aside>;
}
