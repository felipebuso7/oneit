import { readFile, mkdir, writeFile } from "node:fs/promises";
import { renderTicketPdf, reportSnapshotSchema } from "../src/domain/reports/pdf.ts";

const fixture = JSON.parse(await readFile(new URL("../tests/fixtures/report.json", import.meta.url), "utf8"));
fixture.description = (fixture.description + " ").repeat(25);
await mkdir(new URL("../tmp/pdfs/", import.meta.url), { recursive: true });
const bytes = await renderTicketPdf(reportSnapshotSchema.parse(fixture));
await writeFile(new URL("../tmp/pdfs/report-smoke.pdf", import.meta.url), bytes);
console.log("PDF de teste gerado com dados fictícios: tmp/pdfs/report-smoke.pdf");
