import { InfraiClient } from "./infrai-client.ts";

export type WorkOrder = { id: string; question: string; dispatchStatus: "queued" | "en_route" | "on_site"; technician: string };
type Hit = { id: string; score?: number; metadata?: { text?: string; photoNote?: string; status?: string } };

const docs = [
  { id: "wo-1042-photo", text: "Compressor panel shows a loose red wire; isolate power before opening.", photoNote: "panel photo", status: "on_site" },
  { id: "wo-1042-followup", text: "Technician follow-up: verify terminal torque and attach an after-repair photo.", photoNote: "follow-up", status: "on_site" }
];

export async function answerWorkOrder(order: WorkOrder, client = new InfraiClient()): Promise<{ answer: string; evidence: Hit[]; followUp: string }> {
  const collection = `fieldservice-${order.id}`;
  await client.post("/vector/collection/create", { collection, dimension: 1536, metric: "cosine", metadata: { team: "field-service", orderId: order.id } });
  const embedding = await client.post<{ data: Array<{ embedding: number[] }> }>("/embeddings", { input: docs.map((d) => d.text), model: "text-embedding-3-small" });
  await client.post("/vector/upsert", { collection, vectors: docs.map((d, i) => ({ id: d.id, values: embedding.data[i].embedding, metadata: d })) });
  const queryEmbedding = await client.post<{ data: Array<{ embedding: number[] }> }>("/embeddings", { input: order.question, model: "text-embedding-3-small" });
  const hits = await client.post<Hit[]>("/vector/query", { collection, embedding: queryEmbedding.data[0].embedding, top_k: 4, filter: { status: order.dispatchStatus }, include_metadata: true });
  const ranked = await client.post<Hit[]>("/ai/rerank", { query: order.question, candidates: hits, top_k: 2, model: "auto", vendor: "infrai" });
  const evidence = ranked.length ? ranked : hits;
  const followUp = order.dispatchStatus === "on_site" ? "Capture the after-repair photo and confirm terminal torque." : "Keep the work order queued until dispatch confirms travel.";
  return { answer: evidence.map((h) => h.metadata?.text).filter(Boolean).join(" "), evidence, followUp };
}
