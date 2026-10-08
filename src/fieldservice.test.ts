import assert from "node:assert/strict";
import { answerWorkOrder } from "./fieldservice.ts";

const calls: string[] = [];
const fake = { post: async (path: string, body: any) => {
  calls.push(path);
  if (path === "/embeddings") return { data: [{ embedding: [1, 0] }, { embedding: [0, 1] }] };
  if (path === "/vector/query") return [{ id: "wo-1042-photo", metadata: { text: "Loose wire found.", status: "on_site" } }];
  if (path === "/ai/rerank") return body.candidates;
  return {};
} } as any;
const result = await answerWorkOrder({ id: "wo-1042", question: "What should I check from the panel photo?", dispatchStatus: "on_site", technician: "Ari" }, fake);
assert.equal(result.followUp, "Capture the after-repair photo and confirm terminal torque.");
assert.equal(result.answer, "Loose wire found.");
assert.deepEqual(calls, ["/vector/collection/create", "/embeddings", "/vector/upsert", "/embeddings", "/vector/query", "/ai/rerank"]);
console.log("field-service decision test passed");
