"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfSection = { heading: string; lines: string[]; signatureDataUrl?: string; imageDataUrls?: string[] };

export function decodeImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { type: match[1].toLowerCase() === "png" ? "png" as const : "jpg" as const, bytes };
}

function wrap(text: string, maxLength = 92) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > maxLength && current) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["—"];
}

export async function openGeneratedPdf(input: { fileName: string; title: string; subtitle: string; sections: PdfSection[]; oneitLogoUrl?: string; serviciaLogoUrl?: string }) {
  const pdfDocument = await PDFDocument.create();
  const regular = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28;
  const height = 841.89;
  const margin = 46;
  let page = pdfDocument.addPage([width, height]);
  let cursor = height - margin;
  const addPage = () => { page = pdfDocument.addPage([width, height]); cursor = height - margin; };
  const embedLogo = async (url?: string) => {
    if (!url) return null;
    try { const response = await fetch(url); if (!response.ok) return null; const bytes = await response.arrayBuffer(); return await pdfDocument.embedPng(bytes); } catch { return null; }
  };
  const oneitLogo = await embedLogo(input.oneitLogoUrl);
  const serviciaLogo = await embedLogo(input.serviciaLogoUrl);
  if (oneitLogo || serviciaLogo) {
    const logoY = cursor - 24;
    if (oneitLogo) { const scale = Math.min(56 / oneitLogo.width, 19 / oneitLogo.height); page.drawImage(oneitLogo, { x: margin, y: logoY, width: oneitLogo.width * scale, height: oneitLogo.height * scale }); }
    if (serviciaLogo) { const scale = Math.min(95 / serviciaLogo.width, 25 / serviciaLogo.height); page.drawImage(serviciaLogo, { x: width - margin - serviciaLogo.width * scale, y: logoY, width: serviciaLogo.width * scale, height: serviciaLogo.height * scale }); }
    cursor -= 40;
  }
  const line = (text: string, size = 10, font = regular, color = rgb(0.12, 0.18, 0.28)) => {
    if (cursor < margin + size + 12) addPage();
    page.drawText(text, { x: margin, y: cursor - size, size, font, color });
    cursor -= size + 5;
  };

  line("ONEIT · SERVICIA", 10, bold, rgb(0.02, 0.23, 0.56));
  cursor -= 8;
  line(input.title, 19, bold, rgb(0.06, 0.14, 0.25));
  line(input.subtitle, 10, regular, rgb(0.32, 0.39, 0.48));
  cursor -= 10;
  for (const section of input.sections) {
    if (cursor < margin + 58) addPage();
    line(section.heading, 11, bold, rgb(0.02, 0.23, 0.56));
    for (const item of section.lines) for (const wrapped of wrap(item)) line(wrapped, 9.5);
    if (section.signatureDataUrl?.startsWith("data:image/")) {
      try {
        const image = await pdfDocument.embedPng(section.signatureDataUrl);
        if (cursor < margin + 90) addPage();
        page.drawText("Assinatura digital do responsável", { x: margin, y: cursor - 10, size: 9, font: bold, color: rgb(0.12, 0.18, 0.28) });
        cursor -= 18;
        const scale = Math.min(180 / image.width, 70 / image.height);
        page.drawImage(image, { x: margin, y: cursor - image.height * scale, width: image.width * scale, height: image.height * scale });
        cursor -= image.height * scale + 12;
      } catch { /* Imagem inválida não impede a geração textual do RTO. */ }
    }
    if (section.imageDataUrls?.length) {
      const images = [];
      for (const dataUrl of section.imageDataUrls.slice(0, 8)) {
        if (!dataUrl.startsWith("data:image/")) continue;
        try {
          const decoded = decodeImageDataUrl(dataUrl);
          if (!decoded) continue;
          images.push(decoded.type === "png" ? await pdfDocument.embedPng(decoded.bytes) : await pdfDocument.embedJpg(decoded.bytes));
        } catch { /* Evidência inválida é ignorada sem bloquear o RTO. */ }
      }
      if (images.length) {
        if (cursor < margin + 105) addPage();
        page.drawText("Evidências fotográficas", { x: margin, y: cursor - 10, size: 9, font: bold, color: rgb(0.12, 0.18, 0.28) });
        cursor -= 20;
        let x = margin;
        for (const image of images) {
          const scale = Math.min(112 / image.width, 78 / image.height);
          if (x + image.width * scale > width - margin) { x = margin; cursor -= 88; }
          if (cursor < margin + 82) addPage();
          page.drawImage(image, { x, y: cursor - image.height * scale, width: image.width * scale, height: image.height * scale });
          x += image.width * scale + 10;
        }
        cursor -= 88;
      }
    }
    cursor -= 6;
  }
  const pages = pdfDocument.getPages();
  pages.forEach((pdfPage, index) => pdfPage.drawText("Gerado em " + new Date().toLocaleString("pt-BR") + " · Página " + (index + 1) + " de " + pages.length, { x: margin, y: 22, size: 8, font: regular, color: rgb(0.38, 0.44, 0.52) }));
  const bytes = await pdfDocument.save();
  const copy = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: "application/pdf" }));
  const preview = window.open(url, "_blank", "noopener,noreferrer");
  if (!preview) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = input.fileName;
    anchor.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
