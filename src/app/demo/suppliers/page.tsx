"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Criticality = "Baixa" | "Média" | "Alta" | "Crítica";
type Supplier = { id: string; name: string; category: string; criticality: Criticality; contact: string; email: string; sla: string; owner: string; active: boolean };
type SupplierRecord = { id: string; supplierId: string; ticket: string; measured: string; compliant: boolean; action: string; owner: string; dueDate: string; status: "Sem ação" | "Em tratamento" | "Concluída" };

const initialSuppliers: Supplier[] = [
  { id: "sup-1", name: "Conecta Telecom", category: "Conectividade", criticality: "Crítica", contact: "Ana Martins", email: "noc@conecta.example", sla: "Resposta em 30 min", owner: "Felipe Buso", active: true },
  { id: "sup-2", name: "Print Solutions", category: "Impressão", criticality: "Alta", contact: "Ricardo Nunes", email: "suporte@print.example", sla: "Resolução em 8h", owner: "Camila Souza", active: true },
];
const initialRecords: SupplierRecord[] = [{ id: "rec-1", supplierId: "sup-1", ticket: "INC-0142", measured: "52 min", compliant: false, action: "Escalonamento ao gestor do contrato e solicitação de RCA.", owner: "Felipe Buso", dueDate: "2026-10-15", status: "Em tratamento" }];
const storageKey = "oneit.demo.suppliers.v1";
const criticalityTone = (value: Criticality) => value === "Crítica" ? "bg-red-50 text-red-700" : value === "Alta" ? "bg-orange-50 text-orange-700" : value === "Média" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700";

export default function SupplierDemoPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [records, setRecords] = useState<SupplierRecord[]>(initialRecords);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("Registre o contrato, quem atende, o resultado medido e a ação tomada.");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as { suppliers?: Supplier[]; records?: SupplierRecord[] };
      if (Array.isArray(saved.suppliers)) setSuppliers(saved.suppliers);
      if (Array.isArray(saved.records)) setRecords(saved.records);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify({ suppliers, records }));
  }, [hydrated, records, suppliers]);

  const latestBySupplier = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, records.find((record) => record.supplierId === supplier.id)])), [records, suppliers]);
  const addSupplier = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    if (!name || !contact) return;
    setSuppliers((current) => [...current, { id: "sup-" + Date.now().toString(36), name, category: String(form.get("category") ?? ""), criticality: String(form.get("criticality") ?? "Média") as Criticality, contact, email: String(form.get("email") ?? "").trim(), sla: String(form.get("sla") ?? "").trim(), owner: String(form.get("owner") ?? "").trim(), active: true }]);
    event.currentTarget.reset();
    setNotice("Fornecedor cadastrado com contato, SLA contratado e responsável interno.");
  };
  const addRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplierId = String(form.get("supplierId") ?? "");
    const compliant = String(form.get("compliant") ?? "") === "true";
    if (!supplierId) return;
    const action = String(form.get("action") ?? "").trim();
    const record: SupplierRecord = { id: "rec-" + Date.now().toString(36), supplierId, ticket: String(form.get("ticket") ?? "").trim() || "Sem chamado", measured: String(form.get("measured") ?? "").trim(), compliant, action, owner: String(form.get("owner") ?? "").trim(), dueDate: String(form.get("dueDate") ?? ""), status: compliant ? "Sem ação" : action ? "Em tratamento" : "Sem ação" };
    setRecords((current) => [record, ...current]);
    event.currentTarget.reset();
    setNotice(compliant ? "Cumprimento de SLA registrado." : "Descumprimento registrado. Acompanhe a ação de tratamento.");
  };
  const completeAction = (id: string) => { setRecords((current) => current.map((record) => record.id === id ? { ...record, status: "Concluída" } : record)); setNotice("Ação de tratamento concluída e preservada no histórico do fornecedor."); };

  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="suppliers" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · GOVERNANÇA</p><h1 className="mt-1 text-xl font-semibold">Gestão de fornecedores</h1></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Rastreabilidade ativa</span></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">CONTROLE DE TERCEIROS</p><h2 className="mt-2 text-2xl font-semibold">Contrato, atendimento, medição e ação</h2><p className="mt-1 text-sm text-slate-300">Mantenha o responsável, prazo contratado, evidência de atendimento e tratamento de qualquer desvio.</p></div><p role="status" className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{notice}</p><div className="mt-5 grid gap-5 xl:grid-cols-2"><form onSubmit={addSupplier} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Cadastrar fornecedor</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input name="name" required placeholder="Fornecedor" className="rounded-lg border p-2.5" /><input name="category" required placeholder="Categoria" className="rounded-lg border p-2.5" /><select name="criticality" className="rounded-lg border p-2.5"><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select><input name="sla" required placeholder="SLA contratado, ex.: resposta 30 min" className="rounded-lg border p-2.5" /><input name="contact" required placeholder="Contato de atendimento" className="rounded-lg border p-2.5" /><input name="email" type="email" placeholder="E-mail de atendimento" className="rounded-lg border p-2.5" /><input name="owner" required placeholder="Responsável interno" className="rounded-lg border p-2.5 sm:col-span-2" /></div><button className="mt-4 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Salvar fornecedor</button></form><form onSubmit={addRecord} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Medição de SLA e tratamento</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select name="supplierId" required className="rounded-lg border p-2.5"><option value="">Fornecedor</option>{suppliers.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="ticket" placeholder="Chamado / ocorrência" className="rounded-lg border p-2.5" /><input name="measured" required placeholder="Resultado medido, ex.: 52 min" className="rounded-lg border p-2.5" /><select name="compliant" className="rounded-lg border p-2.5"><option value="true">Cumpriu SLA</option><option value="false">Descumpriu SLA</option></select><textarea name="action" placeholder="Ação da TI em caso de descumprimento" className="min-h-20 rounded-lg border p-2.5 sm:col-span-2" /><input name="owner" placeholder="Responsável pela ação" className="rounded-lg border p-2.5" /><input name="dueDate" type="date" className="rounded-lg border p-2.5" /></div><button className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Registrar resultado</button></form></div><section className="mt-6 overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Acompanhamento dos fornecedores</h2><p className="mt-1 text-sm text-slate-500">Contato de atendimento, obrigação contratual, último resultado e tratamento registrado.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Fornecedor e contato</th><th className="p-4">SLA contratado</th><th className="p-4">Última medição</th><th className="p-4">Ação da TI</th></tr></thead><tbody>{suppliers.map((supplier) => { const record = latestBySupplier.get(supplier.id); return <tr key={supplier.id} className="border-t align-top"><td className="p-4"><p className="font-semibold">{supplier.name}</p><p className="mt-1 text-xs text-slate-500">{supplier.category} · {supplier.contact} · {supplier.email || "sem e-mail"}</p><span className={"mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold " + criticalityTone(supplier.criticality)}>{supplier.criticality}</span></td><td className="p-4">{supplier.sla}<p className="mt-1 text-xs text-slate-500">Gestor: {supplier.owner}</p></td><td className="p-4">{record ? <><p className={record.compliant ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{record.compliant ? "Cumpriu" : "Descumpriu"} · {record.measured}</p><p className="mt-1 text-xs text-slate-500">{record.ticket}</p></> : "Sem medição"}</td><td className="p-4">{record && !record.compliant ? <><p>{record.action || "Ação ainda não registrada"}</p><p className="mt-1 text-xs text-slate-500">{record.owner || "Sem responsável"} · prazo {record.dueDate || "não definido"} · {record.status}</p>{record.status !== "Concluída" && <button type="button" onClick={() => completeAction(record.id)} className="mt-2 rounded border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800">Concluir ação</button>}</> : "Sem ação pendente"}</td></tr>; })}</tbody></table></div></section></section></div></main>;
}
