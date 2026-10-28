import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { billingTotalsMatch } from "@/lib/field-service/billing-total";
import { validateBillingLineReadiness } from "@/lib/field-service/billing-readiness";

const money = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_MEASUREMENT_ID" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: sheet, error: sheetError } = await supabase
    .from("measurement_sheets")
    .select("id,organization_id,sheet_number,total_orders,total_amount,billing_period_id,billing_periods!inner(competence,status)")
    .eq("id", id)
    .maybeSingle();
  if (sheetError) return Response.json({ code: "MEASUREMENT_UNAVAILABLE" }, { status: 503 });
  if (!sheet) return Response.json({ code: "MEASUREMENT_NOT_FOUND" }, { status: 404 });
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .eq("organization_id", sheet.organization_id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"])
    .limit(1)
    .maybeSingle();
  if (roleError) return Response.json({ code: "MEASUREMENT_AUTHORIZATION_UNAVAILABLE" }, { status: 503 });
  if (!role) return Response.json({ code: "MEASUREMENT_NOT_AUTHORIZED" }, { status: 403 });
  const { data: lines, error: linesError } = await supabase
    .from("measurement_sheet_lines")
    .select("ticket_number,lpu_code,description,quantity,unit_price,total_price,line_kind,service_date,service_location,order_reference")
    .eq("measurement_sheet_id", sheet.id)
    .order("ticket_number")
    .order("service_date");
  if (linesError) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  const incomplete = (lines ?? []).map((line) => ({ ticket: line.ticket_number, missing: validateBillingLineReadiness(line).missing })).filter((item) => item.missing.length);
  if (incomplete.length) return Response.json({ code: "MEASUREMENT_DOCUMENT_INCOMPLETE", incomplete }, { status: 422 });
  if (!billingTotalsMatch(Number(sheet.total_amount), (lines ?? []).map((line) => Number(line.total_price)))) return Response.json({ code: "MEASUREMENT_TOTAL_MISMATCH" }, { status: 422 });

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.035, 0.184, 0.251);
  const blue = rgb(0.08, 0.31, 0.58);
  const light = rgb(0.94, 0.96, 0.98);
  const size: [number, number] = [595, 842];
  const [oneitLogo, serviciaLogo] = await Promise.all([readLogo(pdf, "oneit-logo-rto.png"), readLogo(pdf, "servicia-logo-rto.png")]);
  const period = Array.isArray(sheet.billing_periods) ? sheet.billing_periods[0] : sheet.billing_periods;
  const header = (page: ReturnType<typeof pdf.addPage>, title: string) => {
    page.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: navy });
    if (oneitLogo) page.drawImage(oneitLogo, { x: 28, y: 808, width: 70, height: 22 });
    if (serviciaLogo) page.drawImage(serviciaLogo, { x: 470, y: 808, width: 92, height: 22 });
    page.drawText(title, { x: 32, y: 758, size: 19, font: bold, color: navy });
  };
  const cover = pdf.addPage(size);
  header(cover, "BOLETIM DE MEDIÇÃO");
  cover.drawText(sheet.sheet_number, { x: 32, y: 728, size: 11, font: regular, color: blue });
  cover.drawText("COMPETÊNCIA", { x: 32, y: 682, size: 8, font: bold, color: blue });
  cover.drawText(String(period?.competence ?? "Não informada"), { x: 150, y: 682, size: 11, font: regular, color: navy });
  cover.drawText("OS CONSOLIDADAS", { x: 32, y: 654, size: 8, font: bold, color: blue });
  cover.drawText(String(sheet.total_orders), { x: 150, y: 654, size: 11, font: regular, color: navy });
  cover.drawText("STATUS", { x: 32, y: 626, size: 8, font: bold, color: blue });
  cover.drawText(String(period?.status ?? "DRAFT"), { x: 150, y: 626, size: 11, font: regular, color: navy });
  cover.drawRectangle({ x: 32, y: 540, width: 531, height: 28, color: navy });
  cover.drawText("RESUMO CONSOLIDADO", { x: 44, y: 550, size: 9, font: bold, color: rgb(1, 1, 1) });
  const groups = new Map<string, { quantity: number; total: number }>();
  for (const line of lines ?? []) {
    const key = line.line_kind === "EXTRA" ? "EXTRAS" : line.lpu_code || line.description;
    const current = groups.get(key) ?? { quantity: 0, total: 0 };
    current.quantity += Number(line.quantity);
    current.total += Number(line.total_price);
    groups.set(key, current);
  }
  let summaryY = 514;
  for (const [key, value] of groups) {
    cover.drawText(key.slice(0, 56), { x: 44, y: summaryY, size: 9, font: regular, color: navy });
    cover.drawText(String(value.quantity), { x: 390, y: summaryY, size: 9, font: regular, color: navy });
    cover.drawText(money(value.total), { x: 470, y: summaryY, size: 9, font: regular, color: navy });
    summaryY -= 20;
  }
  cover.drawRectangle({ x: 340, y: 125, width: 223, height: 90, color: light });
  cover.drawText("VALOR TOTAL", { x: 355, y: 185, size: 9, font: bold, color: navy });
  cover.drawText(money(Number(sheet.total_amount)), { x: 400, y: 150, size: 15, font: bold, color: blue });
  cover.drawText("Documento gerado a partir dos dados persistidos do BM.", { x: 32, y: 48, size: 8, font: regular, color: rgb(0.35, 0.4, 0.43) });

  let page = pdf.addPage(size);
  header(page, "DETALHAMENTO DAS OS");
  let y = 716;
  for (const line of lines ?? []) {
    if (y < 110) { page = pdf.addPage(size); header(page, "DETALHAMENTO DAS OS"); y = 716; }
    page.drawRectangle({ x: 32, y: y - 7, width: 531, height: 21, color: light });
    page.drawText(`OS / CHAMADO: ${line.ticket_number}`, { x: 42, y, size: 8, font: bold, color: navy });
    page.drawText(money(Number(line.total_price)), { x: 480, y, size: 8, font: bold, color: navy });
    y -= 18;
    page.drawText(`Data: ${line.service_date ?? "Não informada"} · Local: ${(line.service_location ?? "Não informado").slice(0, 76)}`, { x: 42, y, size: 7, font: regular, color: rgb(0.35, 0.4, 0.43) });
    y -= 18;
    page.drawText(`${line.line_kind === "EXTRA" ? "EXTRA" : line.lpu_code || "LPU"} · ${line.description}`.slice(0, 78), { x: 42, y, size: 8, font: regular, color: navy });
    page.drawText(`Qtd. ${line.quantity}`, { x: 390, y, size: 8, font: regular, color: navy });
    page.drawText(money(Number(line.unit_price)), { x: 465, y, size: 8, font: regular, color: navy });
    y -= 28;
  }
  page.drawText(`TOTAL GERAL: ${money(Number(sheet.total_amount))}`, { x: 350, y: 45, size: 10, font: bold, color: blue });
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${sheet.sheet_number}.pdf"`, "Cache-Control": "private, no-store" } });
}

async function readLogo(document: PDFDocument, filename: string) {
  try { return await document.embedPng(await readFile(path.join(process.cwd(), "public", filename))); } catch { return null; }
}
