import { createServer } from "node:http";
import { z } from "zod";
import { answerWorkOrder, type WorkOrder } from "./fieldservice.ts";

const workOrderSchema = z.object({
  id: z.string().min(1), question: z.string().min(1), technician: z.string().min(1),
  dispatchStatus: z.enum(["queued", "en_route", "on_site"])
});

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/work-order/answer") { res.writeHead(404).end(); return; }
  let raw = ""; for await (const chunk of req) raw += chunk;
  try {
    const body = workOrderSchema.parse(JSON.parse(raw)) as WorkOrder;
    const result = await answerWorkOrder(body);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
  } catch (error) { res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: (error as Error).message })); }
});
server.listen(3000, () => console.log("field-service QA listening on http://localhost:3000"));
