import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const reportSnapshotSchema = z.object({
  ticketId: z.uuid(), organizationId: z.uuid(), completionId: z.uuid(), ticketVersion: z.number().int(), reportVersion: z.number().int(),
  number: z.string(), title: z.string(), description: z.string(), milldesk: z.string(), servicenow: z.string(),
  organization: z.string(), customer: z.string(), location: z.string(), technician: z.string(), reviewer: z.string(),
  approvedAt: z.string(), completedAt: z.string(), generatedAt: z.string(), diagnosis: z.string(), solution: z.string(), noMaterialReason: z.string(),
  checklist: z.array(z.object({ label: z.string(), completed: z.boolean() })),
  materials: z.array(z.object({ name: z.string(), quantity: z.number(), unit: z.string() })),
  evidences: z.array(z.object({ id: z.uuid(), type: z.string(), size: z.number(), storagePath: z.string().min(1).optional() })),
  checkins: z.array(z.object({ type: z.string(), at: z.string() })),
});
export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
export type ReportEvidenceImage = { mimeType: "image/png" | "image/jpeg"; bytes: Uint8Array };
export const fieldServiceRtoSnapshotSchema = z.object({
  service_order_id: z.uuid(), ticket_id: z.uuid(), order_number: z.string(), status: z.string(),
  ticket_number: z.string().optional(), title: z.string().optional(), customer_name: z.string().optional(),
  location_name: z.string().optional(), location_address: z.string().optional(), technician_name: z.string().optional(), reviewer_name: z.string().optional(),
  local_contact_name: z.string().optional(), local_contact_phone: z.string().optional(),
  ticket_opened_at: z.string().nullable().optional(), ticket_closed_at: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(), checked_in_at: z.string().nullable().optional(), checked_out_at: z.string().nullable().optional(),
  execution_report: z.string().nullable().optional(), customer_signature_name: z.string().nullable().optional(), customer_signature_data_url: z.string().nullable().optional(),
  evidence: z.array(z.unknown()).default([]),
  lpu_lines: z.array(z.object({ code: z.string(), description: z.string(), unit: z.string(), quantity: z.number(), unit_price: z.number(), total: z.number() })).default([]),
});
export type FieldServiceRtoSnapshot = z.infer<typeof fieldServiceRtoSnapshotSchema>;

export async function renderFieldServiceRtoPdf(snapshot: FieldServiceRtoSnapshot, evidenceImages: ReportEvidenceImage[] = []): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica); const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28, height = 841.89, margin = 42; let page = document.addPage([width, height]); let y = height - 88;
  const [oneitLogo, serviciaLogo] = await Promise.all([readBrandLogo(document, "oneit-logo-rto.png"), readBrandLogo(document, "servicia-logo-rto.png")]);
  const header = () => { if (oneitLogo) page.drawImage(oneitLogo, { x: margin, y: height - 58, width: 70, height: 22 }); if (serviciaLogo) page.drawImage(serviciaLogo, { x: width - margin - 92, y: height - 58, width: 92, height: 22 }); page.drawText("RELATÓRIO TÉCNICO OPERACIONAL · FIELD SERVICE", { x: margin, y: height - 78, size: 10, font: bold, color: rgb(0.02, 0.17, 0.35) }); };
  header();
  const text = (value: string, size = 9, strong = false) => { if (y < 62) { page = document.addPage([width, height]); y = height - 88; header(); } page.drawText(value.slice(0, 140), { x: margin, y, size, font: strong ? bold : font, color: rgb(0.12, 0.15, 0.2) }); y -= size + 6; };
  const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
  const duration = (from: string | null | undefined, to: string | null | undefined) => {
    if (!from || !to) return "Não calculado";
    const seconds = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
    if (!Number.isFinite(seconds)) return "Não calculado";
    const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return `${days ? `${days}d ` : ""}${hours}h ${minutes}min`;
  };
  text(`OS ${snapshot.order_number}`, 15, true); text(`Status: ${snapshot.status}`); text(`Chamado: ${snapshot.ticket_number ?? snapshot.ticket_id}`); if (snapshot.title) text(`Título: ${snapshot.title}`); y -= 8;
  text("DADOS DO ATENDIMENTO", 11, true); text(`Cliente: ${snapshot.customer_name ?? "Não informado"}`); text(`Local: ${snapshot.location_name ?? "Não informado"}`); text(`Endereço: ${snapshot.location_address ?? "Não informado"}`); text(`Técnico: ${snapshot.technician_name ?? "Não informado"}`); text(`Validador: ${snapshot.reviewer_name ?? "Não informado"}`); if (snapshot.local_contact_name || snapshot.local_contact_phone) text(`Contato local: ${snapshot.local_contact_name ?? "Não informado"}${snapshot.local_contact_phone ? ` · ${snapshot.local_contact_phone}` : ""}`); y -= 8;
  text("LINHA DO TEMPO", 11, true); text(`Abertura do chamado: ${snapshot.ticket_opened_at ?? "Não informado"}`); text(`Agendamento: ${snapshot.scheduled_at ?? "Não informado"}`); text(`Check-in: ${snapshot.checked_in_at ?? "Não informado"}`); text(`Checkout: ${snapshot.checked_out_at ?? "Não informado"}`); text(`Fechamento do chamado: ${snapshot.ticket_closed_at ?? "Não informado"}`); text(`Tempo total do chamado: ${duration(snapshot.ticket_opened_at, snapshot.ticket_closed_at)}`); text(`Tempo em atendimento: ${duration(snapshot.checked_in_at, snapshot.checked_out_at)}`); y -= 8;
  text("RELATO TÉCNICO", 11, true); text(snapshot.execution_report ?? "Não informado"); y -= 8;
  text("COMPOSIÇÃO LPU", 11, true);
  let total = 0; for (const line of snapshot.lpu_lines) { total += line.total; text(`${line.code} · ${line.description} · ${line.quantity} ${line.unit} · ${money(line.unit_price)} · Total ${money(line.total)}`); }
  text(`TOTAL DA OS: ${money(total)}`, 10, true); y -= 8;
  text(`ASSINATURA DO RESPONSÁVEL: ${snapshot.customer_signature_name ?? "Não informada"}`, 10, true);
  if (snapshot.customer_signature_data_url?.startsWith("data:image/png;base64,")) { try { const bytes = Uint8Array.from(atob(snapshot.customer_signature_data_url.split(",")[1]), (c) => c.charCodeAt(0)); const image = await document.embedPng(bytes); const scale = Math.min(150 / image.width, 55 / image.height); page.drawImage(image, { x: margin, y: y - image.height * scale, width: image.width * scale, height: image.height * scale }); y -= image.height * scale + 12; } catch { text("Imagem da assinatura não pôde ser incorporada."); } }
  text("RELATÓRIO FOTOGRÁFICO", 11, true);
  text(`${snapshot.evidence.length} evidência(s) registrada(s); ${Math.min(evidenceImages.length, 8)} incorporada(s) ao PDF.`);
  for (const evidence of evidenceImages.slice(0, 8)) { try { const image = evidence.mimeType === "image/png" ? await document.embedPng(evidence.bytes) : await document.embedJpg(evidence.bytes); if (y < 180) { page = document.addPage([width, height]); y = height - 88; header(); } const scale = Math.min((width - 2 * margin) / image.width, 180 / image.height); page.drawImage(image, { x: margin, y: y - image.height * scale, width: image.width * scale, height: image.height * scale }); y -= image.height * scale + 14; } catch { text("Evidência inválida ignorada."); } }
  document.getPages().forEach((item, index, pages) => item.drawText(`RTO Field Service · ${index + 1}/${pages.length}`, { x: margin, y: 28, size: 8, font, color: rgb(0.4, 0.4, 0.4) }));
  document.setTitle(`RTO ${snapshot.order_number}`); return document.save();
}

export async function renderTicketPdf(snapshot: ReportSnapshot, evidenceImages: ReportEvidenceImage[] = []): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  document.setTitle(`Relatório ${snapshot.number} v${snapshot.reportVersion}`);
  document.setAuthor(snapshot.organization);
  const width = 595.28, height = 841.89, margin = 48;
  const [oneitLogo, serviciaLogo] = await Promise.all([
    readBrandLogo(document, "oneit-logo-rto.png"),
    readBrandLogo(document, "servicia-logo-rto.png"),
  ]);
  let page = document.addPage([width, height]), y = height - 105;
  function header() {
    if (oneitLogo) page.drawImage(oneitLogo, { x: margin, y: height - 66, width: 92, height: 28 });
    if (serviciaLogo) page.drawImage(serviciaLogo, { x: width - margin - 112, y: height - 66, width: 112, height: 28 });
    page.drawText("RELATÓRIO TÉCNICO OPERACIONAL", { x: margin, y: height - 84, size: 11, font: bold, color: rgb(0.02, 0.17, 0.35) });
    page.drawText(`${snapshot.number} / v${snapshot.reportVersion}`, { x: margin, y: height - 72, size: 10, font });
  }
  header();
  function safeText(value: string): string {
    return Array.from(value.replace(/[\r\t]/g, " ")).map((character) => {
      if (character === "\n") return character;
      try { font.encodeText(character); return character; } catch { return "?"; }
    }).join("");
  }
  function line(text: string, heading = false) {
    if (y < (heading ? 110 : 70)) { page = document.addPage([width, height]); y = height - 105; header(); }
    page.drawText(text, { x: margin, y, size: heading ? 11 : 10, font: heading ? bold : font, color: rgb(0.12, 0.15, 0.2) });
    y -= heading ? 22 : 15;
  }
  function paragraph(value: string, heading = false) {
    const activeFont = heading ? bold : font;
    const size = heading ? 11 : 10;
    for (const raw of safeText(value).split("\n")) {
      let current = "";
      for (const word of raw.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (activeFont.widthOfTextAtSize(candidate, size) <= width - 2 * margin) { current = candidate; continue; }
        if (current) { line(current, heading); current = ""; }
        for (const character of word) {
          if (activeFont.widthOfTextAtSize(current + character, size) > width - 2 * margin) { line(current, heading); current = ""; }
          current += character;
        }
      }
      line(current, heading);
    }
    y -= 6;
  }
  const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  paragraph(snapshot.title, true);
  paragraph(`Organização: ${snapshot.organization}\nCliente: ${snapshot.customer}\nLocalidade: ${snapshot.location}\nTécnico: ${snapshot.technician}`);
  paragraph(`Milldesk: ${snapshot.milldesk || "Não informado"}\nServiceNow: ${snapshot.servicenow || "Não informado"}`);
  paragraph("Solicitação", true); paragraph(snapshot.description);
  paragraph("Diagnóstico", true); paragraph(snapshot.diagnosis);
  paragraph("Serviço realizado", true); paragraph(snapshot.solution);
  paragraph("Checklist", true);
  snapshot.checklist.forEach((item) => paragraph(`${item.completed ? "Concluído" : "Pendente"}: ${item.label}`));
  paragraph("Materiais utilizados", true);
  if (!snapshot.materials.length) paragraph(`Sem consumo: ${snapshot.noMaterialReason}`);
  snapshot.materials.forEach((item) => paragraph(`${item.name}: ${item.quantity} ${item.unit}`));
  paragraph("Evidências registradas (fotos disponíveis no portal autorizado)", true);
  snapshot.evidences.forEach((item) => paragraph(`${item.type} / ${item.id} / ${Math.ceil(item.size / 1024)} KB`));
  if (evidenceImages.length) {
    paragraph(`Apêndice fotográfico (${Math.min(evidenceImages.length, 8)} de ${snapshot.evidences.length} evidência(s) incorporada(s))`, true);
    for (const evidence of evidenceImages.slice(0, 8)) {
      try {
        const image = evidence.mimeType === "image/png" ? await document.embedPng(evidence.bytes) : await document.embedJpg(evidence.bytes);
        if (y < 150) { page = document.addPage([width, height]); y = height - 105; header(); }
        const scale = Math.min((width - 2 * margin) / image.width, 210 / image.height);
        page.drawImage(image, { x: margin, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
        y -= image.height * scale + 18;
      } catch { /* Evidência inválida não impede a emissão textual do relatório. */ }
    }
  }
  paragraph("Linha do tempo (America/Sao_Paulo)", true);
  snapshot.checkins.forEach((item) => paragraph(`${item.type}: ${date(item.at)}`));
  paragraph(`Conclusão: ${date(snapshot.completedAt)}\nAprovado por: ${snapshot.reviewer}, em ${date(snapshot.approvedAt)}\nGerado em: ${date(snapshot.generatedAt)}`);
  paragraph("A aprovação registrada no sistema não constitui assinatura digital certificada.");
  document.getPages().forEach((item, index, pages) => item.drawText(`Documento operacional | ${index + 1}/${pages.length}`, { x: margin, y: 35, size: 8, font, color: rgb(0.4, 0.4, 0.4) }));
  return document.save();
}

async function readBrandLogo(document: PDFDocument, filename: string) {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", filename));
    return await document.embedPng(bytes);
  } catch {
    return null;
  }
}
