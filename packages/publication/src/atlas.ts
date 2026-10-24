export const ATLAS_SCHEMA = "bip-atlas.atlas.v1";
export const CAPABILITIES_SCHEMA = "bip-atlas.capabilities.v1";

export interface AtlasTrail {
  id: string;
  title: string;
  dek: string;
  chapters: string[];
}

export interface AtlasNode {
  chapter: string;
  label: string;
  aliases: string[];
  x: number;
  y: number;
}

export interface AtlasRelationship {
  from: string;
  to: string;
  kind: "dependency" | "related";
  label: string;
  reason: string;
  path?: string;
}

export interface AtlasData {
  schemaVersion: typeof ATLAS_SCHEMA;
  map: { width: number; height: number; nodeWidth: number; nodeHeight: number };
  trails: AtlasTrail[];
  nodes: AtlasNode[];
  relationships: AtlasRelationship[];
}

export interface CapabilitySource {
  chapter: string;
  section: string;
  label: string;
}

export interface CapabilityArtifact {
  id: string;
  label: string;
  marker: string;
  classification: "secret" | "watch" | "public" | "variable" | "coordination" | "proof";
  madeFor: string;
  canDo: string;
  cannotEstablish: string;
  sharing: string;
  sources: CapabilitySource[];
}

export interface CapabilityData {
  schemaVersion: typeof CAPABILITIES_SCHEMA;
  artifacts: CapabilityArtifact[];
}

const duplicates = (values: string[]): string[] => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const blank = (value: string): boolean => !value.trim();

export function validateAtlasExperience(
  atlas: AtlasData,
  capabilities: CapabilityData,
  chapters: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const problems: string[] = [];
  if (atlas.schemaVersion !== ATLAS_SCHEMA) problems.push(`atlas schemaVersion must be ${ATLAS_SCHEMA}`);
  if (capabilities.schemaVersion !== CAPABILITIES_SCHEMA) problems.push(`capability schemaVersion must be ${CAPABILITIES_SCHEMA}`);

  const chapterIds = [...chapters.keys()];
  const trailIds = atlas.trails.map((trail) => trail.id);
  for (const id of duplicates(trailIds)) problems.push(`duplicate trail ${id}`);
  const trailed = atlas.trails.flatMap((trail) => trail.chapters);
  for (const id of duplicates(trailed)) problems.push(`chapter ${id} appears in more than one trail`);
  for (const id of chapterIds.filter((id) => !trailed.includes(id))) problems.push(`chapter ${id} has no trail`);
  for (const id of trailed.filter((id) => !chapters.has(id))) problems.push(`trail names unknown chapter ${id}`);
  for (const trail of atlas.trails) {
    for (const value of [trail.id, trail.title, trail.dek]) if (blank(value)) problems.push(`trail ${trail.id || "(unknown)"} has blank text`);
    if (!trail.chapters.length) problems.push(`trail ${trail.id} has no chapters`);
  }

  const { width, height, nodeWidth, nodeHeight } = atlas.map;
  for (const value of [width, height, nodeWidth, nodeHeight]) if (!Number.isFinite(value) || value <= 0) problems.push("map dimensions must be positive numbers");
  const nodeIds = atlas.nodes.map((node) => node.chapter);
  for (const id of duplicates(nodeIds)) problems.push(`duplicate map node ${id}`);
  for (const id of chapterIds.filter((id) => !nodeIds.includes(id))) problems.push(`chapter ${id} has no map node`);
  for (const node of atlas.nodes) {
    if (!chapters.has(node.chapter)) problems.push(`map node names unknown chapter ${node.chapter}`);
    if (blank(node.label)) problems.push(`map node ${node.chapter} has no label`);
    if (![node.x, node.y].every(Number.isFinite) || node.x < 0 || node.y < 0 || node.x + nodeWidth > width || node.y + nodeHeight > height) {
      problems.push(`map node ${node.chapter} lies outside the map`);
    }
    if (node.aliases.some(blank)) problems.push(`map node ${node.chapter} has a blank alias`);
  }

  const edgeIds = atlas.relationships.map((edge) => `${edge.from}->${edge.to}`);
  for (const id of duplicates(edgeIds)) problems.push(`duplicate relationship ${id}`);
  for (const edge of atlas.relationships) {
    if (!chapters.has(edge.from) || !chapters.has(edge.to)) problems.push(`relationship ${edge.from}->${edge.to} has an unknown endpoint`);
    if (edge.from === edge.to) problems.push(`relationship ${edge.from}->${edge.to} is a self-loop`);
    if (!["dependency", "related"].includes(edge.kind)) problems.push(`relationship ${edge.from}->${edge.to} has an unknown kind`);
    if (blank(edge.label) || blank(edge.reason)) problems.push(`relationship ${edge.from}->${edge.to} needs a label and reason`);
  }

  const artifactIds = capabilities.artifacts.map((artifact) => artifact.id);
  for (const id of duplicates(artifactIds)) problems.push(`duplicate capability artifact ${id}`);
  for (const artifact of capabilities.artifacts) {
    for (const value of [artifact.id, artifact.label, artifact.marker, artifact.madeFor, artifact.canDo, artifact.cannotEstablish, artifact.sharing]) {
      if (blank(value)) problems.push(`capability artifact ${artifact.id || "(unknown)"} has blank text`);
    }
    if (!["secret", "watch", "public", "variable", "coordination", "proof"].includes(artifact.classification)) {
      problems.push(`capability artifact ${artifact.id} has an unknown classification`);
    }
    if (!artifact.sources.length) problems.push(`capability artifact ${artifact.id} has no source sections`);
    for (const source of artifact.sources) {
      if (!chapters.get(source.chapter)?.has(source.section)) problems.push(`capability artifact ${artifact.id} links unknown section ${source.chapter}#${source.section}`);
      if (blank(source.label)) problems.push(`capability artifact ${artifact.id} has a blank source label`);
    }
  }
  return problems;
}
