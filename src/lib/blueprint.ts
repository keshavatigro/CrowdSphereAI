import blueprint from "@/data/stadium-blueprint.json";

export type BlueprintData = typeof blueprint;

export function getBlueprint(): BlueprintData {
  return blueprint;
}

export function getBlueprintContext(): string {
  return JSON.stringify(blueprint, null, 2);
}

export function findNearestSecureExit(sectorId: string): string | null {
  const sector = blueprint.sectors.find((s) => s.id === sectorId);
  if (!sector) return null;
  const secure = sector.exits.find((e) => e.type === "secure_exit");
  if (!secure) return sector.exits[0]?.name ?? null;
  return `${secure.name} → ${secure.connectsTo} (gate ${secure.gateId})`;
}

export function getSectorForZone(zoneId: string) {
  return blueprint.sectors.find((s) => s.zoneId === zoneId);
}

export function getConcourseByZone(zoneId: string) {
  return blueprint.concourses.find((c) => c.zoneId === zoneId);
}
