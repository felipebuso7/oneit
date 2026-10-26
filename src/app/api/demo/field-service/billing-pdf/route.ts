import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: Request) {
  const body = await request.json() as { competence?: string; total?: number; serviceTotal?: number; materialTotal?: number; orders?: number; macro?: Array<{ description: string; quantity: number; total: number }>; lines?: Array<{ ticket: string; externalOs?: string; description: string; quantity: number; unitPrice: number; total: number; technician?: string }> };
  const competence = body.competence || new Date().toISOString().slice(0, 7);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.035, 0.184, 0.251);
  page.drawRectangle({ x: 0, y: 555, width: 842, height: 40, color: navy });
  page.drawText("ONEIT · BOLETIM DE MEDIÇÃO", { x: 32, y: 570, size: 15, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Competência ${competence}`, { x: 650, y: 571, size: 10, font: regular, color: rgb(1, 1, 1) });
  page.drawText("Consolidado financeiro de ordens de serviço encerradas", { x: 32, y: 525, size: 12, font: regular, color: navy });
  const cards = [["OS fechadas", String(body.orders ?? 0)], ["Serviços", `R$ ${(body.serviceTotal ?? 0).toFixed(2)}`], ["Materiais", `R$ ${(body.materialTotal ?? 0).toFixed(2)}`], ["Total BM", `R$ ${(body.total ?? 0).toFixed(2)}`]];
  cards.forEach(([label, value], index) => { const x = 32 + index * 195; page.drawRectangle({ x, y: 460, width: 178, height: 42, color: rgb(0.95, 0.97, 0.98), borderColor: index === 3 ? rgb(0.96, 0.42, 0.05) : rgb(0.8, 0.85, 0.88), borderWidth: 1 }); page.drawText(label, { x: x + 10, y: 485, size: 9, font: regular, color: rgb(0.25, 0.32, 0.36) }); page.drawText(value, { x: x + 10, y: 470, size: 13, font: bold, color: index === 3 ? rgb(0.78, 0.25, 0.02) : navy }); });
  let y = 425;
  page.drawText("Resumo macro por serviço/material", { x: 32, y, size: 11, font: bold, color: navy }); y -= 22;
  page.drawText("Item", { x: 38, y, size: 9, font: bold, color: navy }); page.drawText("Quantidade", { x: 480, y, size: 9, font: bold, color: navy }); page.drawText("Total", { x: 680, y, size: 9, font: bold, color: navy }); y -= 6; page.drawLine({ start: { x: 32, y }, end: { x: 810, y }, thickness: 1, color: rgb(0.8, 0.85, 0.88) }); y -= 17;
  for (const item of body.macro ?? []) { if (y < 48) break; page.drawText(item.description.slice(0, 66), { x: 38, y, size: 9, font: regular, color: rgb(0.12, 0.16, 0.18) }); page.drawText(String(item.quantity), { x: 480, y, size: 9, font: regular, color: rgb(0.12, 0.16, 0.18) }); page.drawText(`R$ ${Number(item.total).toFixed(2)}`, { x: 680, y, size: 9, font: regular, color: rgb(0.12, 0.16, 0.18) }); y -= 18; }
  page.drawLine({ start: { x: 32, y: 32 }, end: { x: 810, y: 32 }, thickness: 1, color: navy }); page.drawText("Documento demonstrativo · valores devem ser homologados antes do envio fiscal.", { x: 32, y: 18, size: 8, font: regular, color: rgb(0.35, 0.4, 0.43) });
  const detail = pdf.addPage([842, 595]);
  detail.drawRectangle({ x: 0, y: 555, width: 842, height: 40, color: navy });
  detail.drawText("ONEIT · DETALHAMENTO MICRO DO BM", { x: 32, y: 570, size: 15, font: bold, color: rgb(1, 1, 1) });
  detail.drawText(`Competência ${competence}`, { x: 650, y: 571, size: 10, font: regular, color: rgb(1, 1, 1) });
  let detailY = 525;
  detail.drawText("OS / chamado", { x: 32, y: detailY, size: 9, font: bold, color: navy }); detail.drawText("Item", { x: 220, y: detailY, size: 9, font: bold, color: navy }); detail.drawText("Técnico", { x: 470, y: detailY, size: 9, font: bold, color: navy }); detail.drawText("Qtd.", { x: 650, y: detailY, size: 9, font: bold, color: navy }); detail.drawText("Total", { x: 730, y: detailY, size: 9, font: bold, color: navy }); detailY -= 8; detail.drawLine({ start: { x: 32, y: detailY }, end: { x: 810, y: detailY }, thickness: 1, color: rgb(0.8, 0.85, 0.88) }); detailY -= 18;
  for (const line of body.lines ?? []) { if (detailY < 42) break; detail.drawText((line.externalOs || line.ticket).slice(0, 24), { x: 32, y: detailY, size: 8, font: regular, color: rgb(0.12, 0.16, 0.18) }); detail.drawText(line.description.slice(0, 38), { x: 220, y: detailY, size: 8, font: regular, color: rgb(0.12, 0.16, 0.18) }); detail.drawText((line.technician || "-").slice(0, 22), { x: 470, y: detailY, size: 8, font: regular, color: rgb(0.12, 0.16, 0.18) }); detail.drawText(String(line.quantity), { x: 650, y: detailY, size: 8, font: regular, color: rgb(0.12, 0.16, 0.18) }); detail.drawText(`R$ ${Number(line.total).toFixed(2)}`, { x: 730, y: detailY, size: 8, font: regular, color: rgb(0.12, 0.16, 0.18) }); detailY -= 16; }
  detail.drawLine({ start: { x: 32, y: 32 }, end: { x: 810, y: 32 }, thickness: 1, color: navy }); detail.drawText("Detalhamento gerado a partir das linhas calculadas do BM.", { x: 32, y: 18, size: 8, font: regular, color: rgb(0.35, 0.4, 0.43) });
  const bytes = await pdf.save();
  return new NextResponse(bytes as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="BM-${competence}.pdf"` } });
}
