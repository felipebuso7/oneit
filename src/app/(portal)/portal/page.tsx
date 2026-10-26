import Link from "next/link";
import { OneitPageHeader, OneitSection } from "@/components/oneit";

export default function PortalPage() {
  return <section className="mx-auto max-w-6xl p-6 sm:p-8"><OneitPageHeader eyebrow="OneIT · Portal de gestão" title="Operação OneIT" description="Acesse rapidamente os pontos de acompanhamento da operação, chamados e atendimentos de campo." actions={<Link href="/portal/dashboard" className="oneit-btn oneit-btn--primary">Abrir Dashboard</Link>} /><div className="mt-7 grid gap-5 md:grid-cols-2"><OneitSection title="Acompanhar operação" description="Indicadores, prazos e backlog das organizações autorizadas."><Link href="/portal/dashboard" className="text-sm font-semibold text-[#0b4a64] hover:underline">Ir para o Dashboard operacional →</Link></OneitSection><OneitSection title="Trabalhar chamados" description="Triagem, acompanhamento e encaminhamento dos atendimentos."><Link href="/portal/tickets" className="text-sm font-semibold text-[#0b4a64] hover:underline">Abrir fila de chamados →</Link></OneitSection></div></section>;
}
