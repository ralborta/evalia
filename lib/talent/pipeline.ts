export const DEFAULT_PIPELINE_STAGES = [
  { key: "applied", name: "Aplicado", sortOrder: 0, isTerminal: false, isRejected: false },
  { key: "screen", name: "Screening", sortOrder: 1, isTerminal: false, isRejected: false },
  { key: "interview", name: "Entrevista", sortOrder: 2, isTerminal: false, isRejected: false },
  { key: "offer", name: "Oferta", sortOrder: 3, isTerminal: false, isRejected: false },
  { key: "hired", name: "Contratado", sortOrder: 4, isTerminal: true, isRejected: false },
  { key: "rejected", name: "Descartado", sortOrder: 5, isTerminal: true, isRejected: true },
] as const;

export function defaultPipelineCreateData(organizationId: string) {
  return DEFAULT_PIPELINE_STAGES.map((s) => ({
    organizationId,
    key: s.key,
    name: s.name,
    sortOrder: s.sortOrder,
    isTerminal: s.isTerminal,
    isRejected: s.isRejected,
  }));
}
