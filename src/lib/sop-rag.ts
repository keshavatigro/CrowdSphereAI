import OpenAI from "openai";
import sops from "@/data/emergency-sops.json";

interface SopChunk {
  id: string;
  title: string;
  text: string;
  embedding?: number[];
}

const globalRag = globalThis as unknown as {
  __sopChunks?: SopChunk[];
  __sopReady?: boolean;
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function ensureEmbeddings(): Promise<SopChunk[]> {
  if (globalRag.__sopReady && globalRag.__sopChunks) {
    return globalRag.__sopChunks;
  }

  const chunks: SopChunk[] = sops.map((s) => ({
    id: s.id,
    title: s.title,
    text: `${s.title}\n${s.steps.join("\n")}`,
  }));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    globalRag.__sopChunks = chunks;
    globalRag.__sopReady = true;
    return chunks;
  }

  const openai = new OpenAI({ apiKey });
  const input = chunks.map((c) => c.text);
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  for (let i = 0; i < chunks.length; i++) {
    chunks[i]!.embedding = res.data[i]?.embedding;
  }

  globalRag.__sopChunks = chunks;
  globalRag.__sopReady = true;
  return chunks;
}

export async function searchSops(query: string, topK = 2): Promise<string> {
  const chunks = await ensureEmbeddings();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !chunks[0]?.embedding) {
    const q = query.toLowerCase();
    const matched = sops.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => q.includes(t) || t.includes(q)),
    );
    const pick = matched.length ? matched : [sops[0]!];
    return pick
      .slice(0, topK)
      .map(
        (s) =>
          `### ${s.title}\n${s.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
      )
      .join("\n\n");
  }

  const openai = new OpenAI({ apiKey });
  const qEmb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const qVec = qEmb.data[0]?.embedding;
  if (!qVec) return "No SOP results.";

  const ranked = chunks
    .filter((c) => c.embedding)
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(qVec, c.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked
    .map(
      ({ chunk }) =>
        `### ${chunk.title}\n${chunk.text.split("\n").slice(1).join("\n")}`,
    )
    .join("\n\n");
}
