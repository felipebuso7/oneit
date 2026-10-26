import { addMaterial, uploadEvidence } from "@/app/(portal)/portal/field/attachments-actions";
import { evidenceTypes } from "@/lib/validation/evidence";
import { OfflineMaterialForm } from "@/components/field/offline-material-form";

const labels: Record<(typeof evidenceTypes)[number], string> = {
  ARRIVAL: "Chegada", BEFORE: "Antes", DURING: "Durante", AFTER: "Depois", TEST_RESULT: "Resultado do teste",
  MATERIAL: "Material", ACCESS_EXCEPTION: "Exceção de acesso", SAFETY: "Segurança", OTHER: "Outra",
};

export function Attachments({ ownerId, ticketId, version, canAddMaterial, materials, usages, evidences }: {
  ownerId: string; ticketId: string; version: number; canAddMaterial: boolean;
  materials: { id: string; name: string; unit: string }[];
  usages: { id: string; material_name: string; unit: string; quantity: number }[];
  evidences: { id: string; evidence_type: string; size_bytes: number }[];
}) {
  return <div className="mt-6 space-y-6 border-t pt-5">
    {canAddMaterial ? <section><h3 className="font-semibold">Materiais utilizados</h3>
      <form action={addMaterial} className="mt-3 space-y-3">
        <input type="hidden" name="ticketId" value={ticketId} />
        <label className="block text-sm">Material<select required name="materialId" defaultValue="" className="mt-1 block w-full rounded border p-2"><option disabled value="">Selecione</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
        <label className="block text-sm">Quantidade<input required name="quantity" type="number" min="0.001" max="100000" step="0.001" className="mt-1 block w-full rounded border p-2" /></label>
        <button type="submit" className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Registrar material</button>
      </form>
      <OfflineMaterialForm ownerId={ownerId} ticketId={ticketId} version={version} materials={materials} />
      <ul className="mt-3 space-y-2 text-sm">{usages.map((item) => <li key={item.id}>{item.material_name}: {item.quantity} {item.unit}</li>)}</ul>
    </section> : null}
    <section><h3 className="font-semibold">Evidências</h3><p className="mt-1 text-sm text-slate-600">Fotos JPEG, PNG ou WebP, até 4 MB por arquivo. Fotos exigem conexão; não são armazenadas nesta fila.</p>
      <form action={uploadEvidence} className="mt-3 space-y-3">
        <input type="hidden" name="ticketId" value={ticketId} />
        <label className="block text-sm">Tipo<select name="evidenceType" defaultValue="BEFORE" className="mt-1 block w-full rounded border p-2">{evidenceTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select></label>
        <label className="block text-sm">Foto<input type="file" name="file" required accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded border p-2" /></label>
        <button type="submit" className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Enviar foto</button>
      </form>
      <ul className="mt-3 space-y-2 text-sm">{evidences.map((item) => <li key={item.id}><a href={`/portal/field/evidence/${item.id}`} target="_blank" rel="noreferrer" className="text-cyan-700 underline">{labels[item.evidence_type as keyof typeof labels] ?? item.evidence_type} · {Math.ceil(item.size_bytes / 1024)} KB</a></li>)}</ul>
    </section>
  </div>;
}
