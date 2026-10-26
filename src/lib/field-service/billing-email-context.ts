export function measurementEmailAllowed(periodStatus: string, versionStatus: string): boolean {
  return ["READY_FOR_REVIEW", "SENT_FOR_CONTESTATION", "APPROVED"].includes(periodStatus)
    && ["DRAFT", "ISSUED", "APPROVED"].includes(versionStatus);
}

export function fiscalEmailAllowed(batchStatus: string): boolean {
  return batchStatus === "READY" || batchStatus === "SENT";
}

export function billingEmailIdempotencyKey(target:
  | { emailType: "MEASUREMENT"; measurementSheetId: string; versionId: string }
  | { emailType: "FISCAL"; fiscalBatchId: string },
): string {
  return target.emailType === "MEASUREMENT"
    ? `MEASUREMENT:sheet:${target.measurementSheetId}:version:${target.versionId}`
    : `FISCAL:batch:${target.fiscalBatchId}`;
}
