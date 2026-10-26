"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";
import { LPU_UNITS } from "@/lib/field-service/lpu-units";
import { formatLpuLabel } from "@/lib/field-service/lpu-label";

type Item = { id: string; code: string; description: string; unit: string; price: number; kind: "material" | "mao_de_obra" | "deslocamento"; active: boolean };
const key = "oneit.demo.field-lpu.v1";

export default function LpuCadastroPage() {
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
      return Array.isArray(saved) ? (saved as Item[]) : [];
    } catch {
      return [];
    }
  });
  const [notice, setNotice] = useState("Cadastre materiais e serviços com unidade padronizada.");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remoteMode, setRemoteMode] = useState(false);
  const organizationIdKey = "oneit.demo.organization-id.v1";
  useEffect(() => {
    const organizationId = window.localStorage.getItem(organizationIdKey);
    if (!organizationId) return;
    fetch(`/api/field-service/lpu?organizationId=${encodeURIComponent(organizationId)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { items?: Array<{ id: string; code: string; description: string; unit: string; unit_price: number; kind: Item["kind"]; active: boolean }> } | null) => {
        if (!payload?.items?.length) return;
        setItems(payload.items.map((item) => ({ id: item.id, code: item.code, description: item.description, unit: item.unit, price: item.unit_price, kind: item.kind, active: item.active })));
        setRemoteMode(true);
        setNotice("Itens LPU carregados do cadastro persistente.");
      })
      .catch(() => undefined);
  }, []);
  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item: Item = {
      id: editingId ?? `lpu-${Date.now()}`,
      code: String(data.get("code") ?? "").trim().toUpperCase(),
      description: String(data.get("description") ?? "").trim(),
      unit: String(data.get("unit") ?? "unidade"),
      price: Number(data.get("price") ?? 0),
      kind: (String(data.get("kind") ?? "material") as Item["kind"]),
      active: true,
    };
    if (!item.code || !item.description || !Number.isFinite(item.price) || item.price < 0) {
      setNotice("Informe código, descrição e valor válido.");
      return;
    }
    if (items.some((current) => current.code === item.code && current.id !== editingId)) {
      setNotice(`O código ${item.code} já está cadastrado. Use um código único.`);
      return;
    }
    const organizationId = localStorage.getItem(organizationIdKey);
    if (organizationId) {
      const response = await fetch(editingId ? `/api/field-service/lpu/${editingId}` : "/api/field-service/lpu", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, code: item.code, description: item.description, kind: item.kind, unit: item.unit, unitPrice: item.price, active: true }) });
      if (response.ok) {
        const payload = await response.json() as { item?: { id: string; code: string; description: string; unit: string; unit_price: number; kind: Item["kind"]; active: boolean } };
        const saved = payload.item;
        const persisted = saved ? { id: saved.id, code: saved.code, description: saved.description, unit: saved.unit, price: saved.unit_price, kind: saved.kind, active: saved.active } : item;
        const next = editingId ? items.map((current) => current.id === editingId ? persisted : current) : [...items, persisted];
        setItems(next); setRemoteMode(true); setEditingId(null); event.currentTarget.reset(); setNotice(editingId ? "Item LPU atualizado no cadastro persistente." : "Item LPU salvo no cadastro persistente."); return;
      }
    }
    const next = editingId ? items.map((current) => current.id === editingId ? item : current) : [...items, item];
    localStorage.setItem(key, JSON.stringify(next));
    setItems(next);
    event.currentTarget.reset();
    setEditingId(null);
    setNotice(editingId ? "Item LPU atualizado com sucesso." : "Item LPU salvo com sucesso.");
  };
  const startEdit = (item: Item) => {
    setEditingId(item.id);
    const form = document.querySelector<HTMLFormElement>("form[data-lpu-form]");
    if (!form) return;
    for (const [name, value] of Object.entries({ code: item.code, description: item.description, kind: item.kind, unit: item.unit, price: String(item.price) })) {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (field) field.value = value;
    }
  };
  const deactivate = (id: string) => {
    const next = items.map((item) => item.id === id ? { ...item, active: false } : item);
    const organizationId = localStorage.getItem(organizationIdKey);
    if (organizationId && remoteMode) void fetch(`/api/field-service/lpu/${id}?organizationId=${encodeURIComponent(organizationId)}`, { method: "DELETE" }).catch(() => undefined);
    localStorage.setItem(key, JSON.stringify(next));
    setItems(next);
    setNotice("Item LPU desativado.");
  };
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="field-service-settings" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES · FIELD SERVICE</p><h1 className="mt-1 text-xl font-semibold">Cadastro LPU</h1></div><Link href="/demo/settings/field-service/units" className="rounded-lg border px-4 py-2 text-sm font-semibold">Unidades de medida</Link></header><section className="p-8"><p role="status" className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">{notice}</p><div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]"><form data-lpu-form onSubmit={add} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{editingId ? "Editar item" : "Novo item"}</h2><div className="mt-4 grid gap-3"><input name="code" required placeholder="Código LPU" className="rounded-lg border p-2.5" /><input name="description" required placeholder="Descrição" className="rounded-lg border p-2.5" /><select name="kind" className="rounded-lg border p-2.5" defaultValue="material"><option value="material">Material</option><option value="mao_de_obra">Mão de obra</option><option value="deslocamento">Deslocamento</option></select><select name="unit" className="rounded-lg border p-2.5">{LPU_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select><input name="price" required type="number" min="0" step="0.01" placeholder="Valor unitário" className="rounded-lg border p-2.5" /></div><div className="mt-4 flex gap-2"><button className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">{editingId ? "Atualizar item" : "Salvar item"}</button>{editingId && <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>}</div></form><section className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Itens cadastrados nesta sessão</h2><span className="text-xs text-slate-500">{items.filter((item) => item.active).length} ativo(s)</span></div><div className="mt-4 divide-y">{items.map((item) => <div key={item.id} className={`flex items-center justify-between gap-3 py-3 ${!item.active ? "opacity-50" : ""}`}><span><strong>{formatLpuLabel(item)}</strong><small className="ml-2 text-slate-500">{item.kind === "mao_de_obra" ? "mão de obra" : item.kind}{!item.active && " · inativo"}</small></span><span className="flex items-center gap-2"><strong>R$ {item.price.toFixed(2)}</strong>{item.active && <><button type="button" onClick={() => startEdit(item)} className="rounded border px-2 py-1 text-xs">Editar</button><button type="button" onClick={() => deactivate(item.id)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">Desativar</button></>}</span></div>)}{!items.length && <p className="py-6 text-sm text-slate-500">Nenhum item cadastrado nesta tela.</p>}</div></section></div></section></div></main>;
}
