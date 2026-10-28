export type OperationalTechnician = {
  id: string;
  organization_id: string;
  full_name: string;
  phone?: string | null;
  mobile?: string | null;
  status: string;
  base_city: string | null;
  active: boolean;
};

export type FieldServiceTechnicianMapping = {
  organization_id: string;
  operational_technician_id: string | null;
  active: boolean;
};

/**
 * Resolves the technicians that can be dispatched by the operational OS flow.
 *
 * `field_service_technicians` is the administrative/master record, while
 * `technicians` is the identity consumed by the dispatch RPC and service order.
 * A record is eligible only when both records are active, belong to the same
 * organization and are explicitly linked. This avoids presenting a person in
 * the dispatch UI whose assignment cannot be persisted by the backend.
 */
export function resolveDispatchTechnicians(
  mappings: FieldServiceTechnicianMapping[],
  operational: OperationalTechnician[],
): OperationalTechnician[] {
  const linkedByOrganization = new Set(
    mappings
      .filter((mapping) => mapping.active && mapping.operational_technician_id)
      .map((mapping) => `${mapping.organization_id}:${mapping.operational_technician_id}`),
  );

  return operational.filter(
    (technician) =>
      technician.active &&
      technician.status !== "OFFLINE" &&
      technician.status !== "UNAVAILABLE" &&
      technician.status !== "VACATION" &&
      linkedByOrganization.has(`${technician.organization_id}:${technician.id}`),
  );
}

export function countUnlinkedActiveTechnicians(
  mappings: FieldServiceTechnicianMapping[],
): number {
  return mappings.filter((mapping) => mapping.active && !mapping.operational_technician_id).length;
}
