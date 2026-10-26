import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = process.cwd();
const outputDir = path.join(root, "output", "pdf");
fs.mkdirSync(outputDir, { recursive: true });
const pdf = await PDFDocument.create();
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const oneit = await pdf.embedPng(fs.readFileSync(path.join(root, "public", "oneit-logo.png")));
const servicia = await pdf.embedPng(fs.readFileSync(path.join(root, "public", "servicia-logo-cropped.png")));
const W = 595, H = 842, M = 42, navy = rgb(0.04, 0.17, 0.24), blue = rgb(0.08, 0.31, 0.60), muted = rgb(0.36, 0.42, 0.49), pale = rgb(0.94, 0.97, 0.99);
let page = pdf.addPage([W, H]); let y = H - M;
const text = (value, x = M, size = 9, font = regular, color = navy) => { page.drawText(String(value), { x, y: y - size, size, font, color }); y -= size + 5; };
const wrap = (value, max = 86) => { const words = String(value).split(/\s+/); const lines = []; let line = ""; for (const word of words) { const next = line ? line + " " + word : word; if (next.length > max && line) { lines.push(line); line = word; } else line = next; } if (line) lines.push(line); return lines; };
const paragraph = (value) => wrap(value).forEach((line) => text(line, M, 9, regular, muted));
const section = (title, rows) => { if (y < 125) { page = pdf.addPage([W, H]); y = H - M; header(false); } page.drawRectangle({ x: M, y: y - 20, width: W - M * 2, height: 22, color: pale }); page.drawText(title, { x: M + 8, y: y - 14, size: 10, font: bold, color: blue }); y -= 32; rows.forEach(([label, value]) => { page.drawText(label, { x: M + 4, y: y - 9, size: 8, font: bold, color: muted }); for (const line of wrap(value, 68)) { page.drawText(line, { x: M + 122, y: y - 9, size: 8.5, font: regular, color: navy }); y -= 13; } y -= 2; }); y -= 8; };
const header = (first = true) => { const s1 = Math.min(80 / oneit.width, 24 / oneit.height); const s2 = Math.min(102 / servicia.width, 29 / servicia.height); page.drawImage(oneit, { x: M, y: y - oneit.height * s1, width: oneit.width * s1, height: oneit.height * s1 }); page.drawImage(servicia, { x: W - M - servicia.width * s2, y: y - servicia.height * s2, width: servicia.width * s2, height: servicia.height * s2 }); y -= 40; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.5, color: blue }); y -= 18; if (first) { text("RELATÓRIO TÉCNICO OPERACIONAL", M, 18, bold, navy); text("RTO · Ordem de Serviço OS-2026-000184", M, 10, regular, muted); paragraph("Documento de encerramento técnico do atendimento de campo, emitido para validação do gestor e baixa no sistema do cliente."); } };
const footer = () => { page.drawText("ONEIT Field Service · Servicia Facilities Services", { x: M, y: 22, size: 7.5, font: regular, color: muted }); page.drawText("Documento de teste · Página " + (pdf.getPages().indexOf(page) + 1), { x: W - 180, y: 22, size: 7.5, font: regular, color: muted }); };
header();
section("1. Identificação do chamado", [["Chamado", "INC-2026-00481 · Falha de conectividade no ponto de atendimento"], ["Cliente / polo", "SABESP · Polo Centro Operacional São Paulo"], ["Endereço", "Av. Paulista, 1000 · Bela Vista · São Paulo/SP"], ["Solicitante", "Rafael Bonato · (11) 3333-1000"], ["Técnico / equipe", "Felipe Buso · Equipe interna SP · Servicia"], ["Prioridade / SLA", "P1 · 4 horas · atendimento em campo"]]);
section("2. Cronologia e tempos", [["Abertura", "23/10/2026 08:12"], ["Despacho", "23/10/2026 08:26 · Gestor de Field Service"], ["Início do deslocamento", "23/10/2026 08:34"], ["Chegada / check-in", "23/10/2026 09:06"], ["Início do atendimento", "23/10/2026 09:10"], ["Check-out", "23/10/2026 10:18"], ["Fechamento gestor", "23/10/2026 10:42"], ["Tempo total do chamado", "2h30min desde a abertura até o fechamento"], ["Tempo total em atendimento", "1h08min no local"]]);
section("3. Execução técnica", [["Diagnóstico", "Falha intermitente no enlace do ponto de atendimento, causada por conectorização degradada e perda de sinal."], ["Serviço executado", "Substituição do patch cord, reterminação do ponto e teste de continuidade e conectividade."], ["Resultado", "Resolvido. Ponto validado com o responsável local e operação restabelecida."], ["Observações", "Acesso ao rack liberado pela recepção. Não houve impacto em outros pontos do polo."]]);
section("4. Evidências e materiais", [["Evidências", "Foto 01 - antes da intervenção; Foto 02 - conector substituído; Foto 03 - teste de conectividade aprovado."], ["Materiais", "RJ45 Cat6 (2 un.) · R$ 4,50/un; Patch cord Cat6 3m (1 un.) · R$ 28,00/un; Etiqueta de identificação (2 un.) · R$ 1,50/un."], ["Medição LPU", "LPU-RED-001 · Visita técnica de rede · R$ 220,00"], ["Total medido", "R$ 259,00"], ["OS externa", "SABESP-OS-77821"]]);
if (y < 250) { footer(); page = pdf.addPage([W, H]); y = H - M; header(false); }
page.drawRectangle({ x: M, y: y - 20, width: W - M * 2, height: 22, color: pale }); page.drawText("Relatório fotográfico", { x: M + 8, y: y - 14, size: 10, font: bold, color: blue }); y -= 38;
for (const [index, caption] of ["Antes da intervenção", "Conector substituído", "Teste de conectividade"].entries()) { const x = M + (index % 3) * 171; const top = y - Math.floor(index / 3) * 145; page.drawRectangle({ x, y: top - 105, width: 150, height: 105, color: rgb(0.9, 0.94, 0.96), borderColor: blue, borderWidth: 1 }); page.drawText("EVIDÊNCIA " + String(index + 1).padStart(2, "0"), { x: x + 10, y: top - 48, size: 10, font: bold, color: blue }); page.drawText(caption, { x: x + 10, y: top - 68, size: 8, font: regular, color: muted }); }
y -= 145;
if (y < 170) { footer(); page = pdf.addPage([W, H]); y = H - M; header(false); }
section("5. Aceite e encerramento", [["Responsável no local", "Mariana Lopes · Supervisora operacional"], ["Aceite", "Execução conferida e serviço considerado concluído no local."], ["Assinatura", "Assinatura digital capturada no dispositivo do técnico e vinculada ao atendimento."], ["Validação do gestor", "Camila Souza · 23/10/2026 10:42 · RTO, fotos, materiais e valores conferidos."], ["Referência externa", "Relatório pronto para anexação na OS do cliente e encerramento externo."]]);
page.drawLine({ start: { x: M + 20, y: y - 18 }, end: { x: M + 210, y: y - 18 }, thickness: 1, color: muted }); page.drawLine({ start: { x: M + 300, y: y - 18 }, end: { x: M + 510, y: y - 18 }, thickness: 1, color: muted }); y -= 30; page.drawText("Assinatura do responsável no local", { x: M + 20, y, size: 8, font: regular, color: muted }); page.drawText("Validação do gestor", { x: M + 300, y, size: 8, font: regular, color: muted });
for (const p of pdf.getPages()) { page = p; footer(); }
const bytes = await pdf.save();
const output = path.join(outputDir, "RTO-teste-OS-2026-000184.pdf");
fs.writeFileSync(output, bytes);
console.log(output);
