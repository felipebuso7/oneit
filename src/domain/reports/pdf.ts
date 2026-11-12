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
  ticket_number: z.string().nullable().optional(), title: z.string().nullable().optional(), customer_name: z.string().nullable().optional(),
  location_name: z.string().nullable().optional(), location_address: z.string().nullable().optional(), technician_name: z.string().nullable().optional(), reviewer_name: z.string().nullable().optional(),
  local_contact_name: z.string().nullable().optional(), local_contact_phone: z.string().nullable().optional(),
  ticket_opened_at: z.string().nullable().optional(), ticket_closed_at: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(), checked_in_at: z.string().nullable().optional(), checked_out_at: z.string().nullable().optional(),
  execution_report: z.string().nullable().optional(), customer_signature_name: z.string().nullable().optional(), customer_signature_data_url: z.string().nullable().optional(),
  evidence: z.array(z.unknown()).default([]),
  materials_used: z.array(z.object({ code: z.string(), name: z.string(), unit: z.string(), quantity: z.number() })).default([]),
  lpu_lines: z.array(z.object({ code: z.string(), description: z.string(), unit: z.string(), quantity: z.number(), unit_price: z.number(), total: z.number() })).default([]),
});
export type FieldServiceRtoSnapshot = z.infer<typeof fieldServiceRtoSnapshotSchema>;

export async function renderFieldServiceRtoPdf(snapshot: FieldServiceRtoSnapshot, evidenceImages: ReportEvidenceImage[] = []): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica); const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28, height = 841.89, margin = 42; let page = document.addPage([width, height]); let y = height - 116;
  // Standard PDF fonts use WinAnsi. Technician-entered text may contain
  // symbols outside that encoding; replace only those characters so a single
  // unsupported glyph cannot abort PDF generation after the RTO was created.
  const safeText = (value: string) => Array.from(value.replace(/[\r\n\t]+/g, " ")).map((character) => {
    try { font.encodeText(character); return character; } catch { return "?"; }
  }).join("");
  const [oneitLogo, serviciaLogo] = await Promise.all([readBrandLogo(document, "oneit-logo-rto.png"), readBrandLogo(document, "servicia-logo-rto.png")]);
  const drawLogoContain = (image: NonNullable<typeof oneitLogo>, x: number, top: number, maxWidth: number, maxHeight: number) => {
    const scaled = image.scaleToFit(maxWidth, maxHeight);
    page.drawImage(image, { x, y: top - scaled.height, width: scaled.width, height: scaled.height });
  };
  const header = () => {
    if (oneitLogo) drawLogoContain(oneitLogo, margin, height - 24, 112, 34);
    if (serviciaLogo) drawLogoContain(serviciaLogo, width - margin - 154, height - 24, 154, 34);
    page.drawLine({ start: { x: margin, y: height - 70 }, end: { x: width - margin, y: height - 70 }, thickness: 1.4, color: rgb(0.02, 0.17, 0.35) });
    page.drawText(safeText("RELATÓRIO TÉCNICO OPERACIONAL · FIELD SERVICE"), { x: margin, y: height - 86, size: 9, font: bold, color: rgb(0.02, 0.17, 0.35) });
  };
  header();
  const ensureSpace = (required: number) => { if (y < 62 + required) { page = document.addPage([width, height]); y = height - 116; header(); } };
  const text = (value: string, size = 9, strong = false) => { ensureSpace(size + 8); page.drawText(safeText(value).slice(0, 140), { x: margin, y, size, font: strong ? bold : font, color: rgb(0.12, 0.15, 0.2) }); y -= size + 6; };
  const section = (value: string) => { ensureSpace(30); page.drawRectangle({ x: margin, y: y - 6, width: width - (2 * margin), height: 22, color: rgb(0.02, 0.17, 0.35) }); page.drawText(safeText(value), { x: margin + 8, y, size: 10, font: bold, color: rgb(1, 1, 1) }); y -= 32; };
  const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
  const duration = (from: string | null | undefined, to: string | null | undefined) => {
    if (!from || !to) return "Não calculado";
    const seconds = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
    if (!Number.isFinite(seconds)) return "Não calculado";
    const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return `${days ? `${days}d ` : ""}${hours}h ${minutes}min`;
  };
  text(`OS ${snapshot.order_number}`, 15, true); text(`Status: ${snapshot.status}`); text(`Chamado: ${snapshot.ticket_number ?? snapshot.ticket_id}`); if (snapshot.title) text(`Título: ${snapshot.title}`); y -= 8;
  section("DADOS DO ATENDIMENTO"); text(`Cliente: ${snapshot.customer_name ?? "Não informado"}`); text(`Local: ${snapshot.location_name ?? "Não informado"}`); text(`Endereço: ${snapshot.location_address ?? "Não informado"}`); text(`Técnico: ${snapshot.technician_name ?? "Não informado"}`); text(`Validador: ${snapshot.reviewer_name ?? "Não informado"}`); if (snapshot.local_contact_name || snapshot.local_contact_phone) text(`Contato local: ${snapshot.local_contact_name ?? "Não informado"}${snapshot.local_contact_phone ? ` · ${snapshot.local_contact_phone}` : ""}`); y -= 8;
  section("LINHA DO TEMPO"); text(`Abertura do chamado: ${snapshot.ticket_opened_at ?? "Não informado"}`); text(`Agendamento: ${snapshot.scheduled_at ?? "Não informado"}`); text(`Check-in: ${snapshot.checked_in_at ?? "Não informado"}`); text(`Checkout: ${snapshot.checked_out_at ?? "Não informado"}`); text(`Fechamento do chamado: ${snapshot.ticket_closed_at ?? "Não informado"}`); text(`Tempo total do chamado: ${duration(snapshot.ticket_opened_at, snapshot.ticket_closed_at)}`); text(`Tempo em atendimento: ${duration(snapshot.checked_in_at, snapshot.checked_out_at)}`); y -= 8;
  section("RELATO TÉCNICO"); text(snapshot.execution_report ?? "Não informado"); y -= 8;
  section("MATERIAIS UTILIZADOS");
  if (!snapshot.materials_used.length) text("Nenhum material registrado pelo técnico.");
  for (const material of snapshot.materials_used) text(`${material.code} · ${material.name}: ${material.quantity} ${material.unit}`);
  y -= 8;
  section("COMPOSIÇÃO LPU / PRECIFICAÇÃO");
  const contentWidth = width - (2 * margin);
  const tableColumns = [
    { label: "Item", width: 200 },
    { label: "Quantidade", width: 78 },
    { label: "Valor unitário", width: 105 },
    { label: "Total", width: contentWidth - 383 },
  ];
  const drawTableRow = (values: string[], headerRow = false) => {
    const rowHeight = 22;
    ensureSpace(rowHeight + 8);
    let x = margin;
    page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: rowHeight, borderColor: rgb(0.72, 0.78, 0.84), borderWidth: 0.6, color: headerRow ? rgb(0.92, 0.95, 0.98) : rgb(1, 1, 1) });
    values.forEach((value, index) => {
      const column = tableColumns[index];
      const maxChars = Math.max(8, Math.floor(column.width / (headerRow ? 5.3 : 5.1)));
      page.drawText(safeText(value).slice(0, maxChars), { x: x + 6, y: y + 2, size: 8, font: headerRow ? bold : font, color: headerRow ? rgb(0.02, 0.17, 0.35) : rgb(0.12, 0.15, 0.2) });
      x += column.width;
    });
    y -= rowHeight;
  };
  drawTableRow(tableColumns.map((column) => column.label), true);
  let total = 0;
  if (!snapshot.lpu_lines.length) drawTableRow(["Nenhum item LPU lançado", "-", "-", money(0)]);
  for (const line of snapshot.lpu_lines) { total += line.total; drawTableRow([`${line.code} · ${line.description}`, `${line.quantity} ${line.unit}`, money(line.unit_price), money(line.total)]); }
  y -= 5;
  text(`VALOR TOTAL DA OS: ${money(total)}`, 10, true); y -= 8;
  section("RELATÓRIO FOTOGRÁFICO");
  text(`${snapshot.evidence.length} evidência(s) registrada(s); ${Math.min(evidenceImages.length, 9)} incorporada(s) ao PDF.`);
  const photoImages = evidenceImages.slice(0, 9);
  const photoGap = 8;
  const photoWidth = (contentWidth - (photoGap * 2)) / 3;
  const photoHeight = 122;
  let photoIndex = 0;
  for (const evidence of photoImages) {
    try {
      const image = evidence.mimeType === "image/png" ? await document.embedPng(evidence.bytes) : await document.embedJpg(evidence.bytes);
      if (photoIndex % 3 === 0) ensureSpace(photoHeight + 26);
      const column = photoIndex % 3;
      const x = margin + column * (photoWidth + photoGap);
      const rowTop = y;
      page.drawRectangle({ x, y: rowTop - photoHeight, width: photoWidth, height: photoHeight, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.72, 0.78, 0.84), borderWidth: 0.7 });
      const scale = Math.min((photoWidth - 10) / image.width, (photoHeight - 24) / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      page.drawImage(image, { x: x + (photoWidth - drawWidth) / 2, y: rowTop - 5 - drawHeight, width: drawWidth, height: drawHeight });
      page.drawText(`Foto ${photoIndex + 1}`, { x: x + 6, y: rowTop - photoHeight + 7, size: 7, font, color: rgb(0.35, 0.4, 0.45) });
      photoIndex += 1;
      if (photoIndex % 3 === 0) y -= photoHeight + photoGap;
    } catch { text("Evidência inválida ignorada."); }
  }
  if (photoIndex % 3 !== 0) y -= photoHeight + photoGap;
  y -= 18;
  section("ASSINATURA DO RESPONSÁVEL");
  text(snapshot.customer_signature_name ?? "Não informada", 10, true);
  if (snapshot.customer_signature_data_url?.startsWith("data:image/png;base64,")) { try { const bytes = Uint8Array.from(atob(snapshot.customer_signature_data_url.split(",")[1]), (c) => c.charCodeAt(0)); const image = await document.embedPng(bytes); ensureSpace(80); const scale = Math.min(190 / image.width, 58 / image.height); page.drawImage(image, { x: margin, y: y - image.height * scale, width: image.width * scale, height: image.height * scale }); y -= image.height * scale + 14; } catch { text("Imagem da assinatura não pôde ser incorporada."); } }
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
    if (oneitLogo) {
      const scaled = oneitLogo.scaleToFit(92, 28);
      page.drawImage(oneitLogo, { x: margin, y: height - 66 + (28 - scaled.height) / 2, width: scaled.width, height: scaled.height });
    }
    if (serviciaLogo) {
      const scaled = serviciaLogo.scaleToFit(112, 28);
      page.drawImage(serviciaLogo, { x: width - margin - scaled.width, y: height - 66 + (28 - scaled.height) / 2, width: scaled.width, height: scaled.height });
    }
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
