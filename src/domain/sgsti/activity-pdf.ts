import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type SgstiActivityPdf = { organization: string; title: string; activityType: string; competence: string; plannedAt: string; dueAt: string; status: string; requirement: string; meetingStartedAt: string; meetingEndedAt: string; meetingLocation: string; facilitator: string; attendees: string; attendeeRoles: string; minutes: string; decisions: string; actions: string; result: string; evidences: Array<{ title: string; kind: string; reference: string }>; submittedAt: string; reviewedAt: string; reviewerComment: string; approvedAt: string; generatedAt: string };

export async function renderSgstiActivityPdf(data: SgstiActivityPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Dossiê SGSTI - ${data.title}`); pdf.setAuthor(data.organization);
  const width=595.28,height=841.89,margin=48; let page=pdf.addPage([width,height]),y=height-96;
  const safe=(text:string)=>Array.from(text.replace(/[\r\t]/g," ")).map(ch=>{try{font.encodeText(ch);return ch;}catch{return "?";}}).join("");
  const header=()=>{page.drawText("ONEIT | DOSSIÊ DE ATIVIDADE SGSTI",{x:margin,y:height-48,size:13,font:bold,color:rgb(.02,.17,.35)});page.drawText(data.organization,{x:margin,y:height-68,size:9,font,color:rgb(.3,.35,.4)});}; header();
  const write=(text:string,heading=false)=>{if(y<(heading?110:66)){page=pdf.addPage([width,height]);y=height-96;header();}page.drawText(text,{x:margin,y,size:heading?11:9.5,font:heading?bold:font,color:rgb(.1,.13,.18)});y-=heading?20:14;};
  const paragraph=(text:string,heading=false)=>{const active=heading?bold:font,size=heading?11:9.5;for(const raw of safe(text||"Não informado.").split("\n")){let current="";for(const word of raw.split(/\s+/)){const candidate=current?`${current} ${word}`:word;if(active.widthOfTextAtSize(candidate,size)<=width-margin*2){current=candidate;continue;}if(current)write(current,heading);current=word;}if(current)write(current,heading);}y-=5;};
  const date=(value:string)=>value?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:value.includes("T")?"short":undefined,timeZone:"America/Sao_Paulo"}).format(new Date(value)):"Não informado";
  paragraph(data.title,true); paragraph(`Tipo: ${data.activityType}\nCompetência: ${date(data.competence)}\nPlanejada: ${date(data.plannedAt)}\nPrazo: ${date(data.dueAt)}\nStatus: ${data.status}\nRequisito: ${data.requirement||"Não informado"}`);
  paragraph("Identificação do rito",true); paragraph(`Início: ${date(data.meetingStartedAt)}\nEncerramento: ${date(data.meetingEndedAt)}\nLocal/plataforma: ${data.meetingLocation||"Não informado"}\nCondutor: ${data.facilitator||"Não informado"}\nParticipantes: ${data.attendees||"Não informado"}\nCargos/presenças: ${data.attendeeRoles||"Não informado"}`);
  paragraph("Ata e deliberações",true); paragraph(data.minutes); paragraph("Decisões",true); paragraph(data.decisions); paragraph("Ações",true); paragraph(data.actions); paragraph("Resultado",true); paragraph(data.result);
  paragraph("Evidências",true); data.evidences.length?data.evidences.forEach(e=>paragraph(`${e.kind}: ${e.title}${e.reference?` — ${e.reference}`:""}`)):paragraph("Nenhuma evidência vinculada.");
  paragraph("Trilha de aprovação",true); paragraph(`Enviado: ${date(data.submittedAt)}\nRevisado: ${date(data.reviewedAt)}\nParecer do revisor: ${data.reviewerComment||"Não informado"}\nAprovado: ${date(data.approvedAt)}\nGerado em: ${date(data.generatedAt)}`);
  paragraph("Este documento é uma representação do registro preservado no OneIT. A aprovação registrada não constitui assinatura digital certificada.");
  pdf.getPages().forEach((p,i,pages)=>p.drawText(`Dossiê SGSTI | ${i+1}/${pages.length}`,{x:margin,y:35,size:8,font,color:rgb(.4,.4,.4)})); return pdf.save();
}
