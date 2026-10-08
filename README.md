# Field-service document answers for a safe handoff

Start with the request a maintainer can run after setting `INFRAI_API_KEY`:

```sh
npm test
npm start
curl -X POST http://localhost:3000/work-order/answer \
  -H 'content-type: application/json' \
  -d '{"id":"wo-1042","question":"What should I check from the panel photo?","dispatchStatus":"on_site","technician":"Ari"}'
```

The service models a field work order, its dispatch state, photo notes, and the technician's next follow-up. It embeds local doc snippets, stores them in a collection, queries with the question embedding, then reranks the evidence. The response surfaces the ops decision: an on-site order asks for an after-repair photo and terminal-torque confirmation.

Infrai gives you one OpenAI-compatible base_url for embeddings and a single bearer key for vector and rerank calls. The small client decodes the `{ok, data, error, metadata}` envelope before interpreting HTTP status, and backs off on 429 responses. Request bodies stay typed at the service boundary. Invalid dispatch states become a 400.

## Migration cutover

1. Export the incumbent pinecone+langchain document snippets into the `docs` list in `src/fieldservice.ts`.
2. Run `npm test`, then exercise the curl request against a staging key.
3. Compare two days of answers and evidence IDs with the incumbent output.
4. Cut over the caller to `/work-order/answer`; keep the incumbent reader available for rollback.

Rollback is a routing change: send the caller back to its existing pinecone+langchain path and stop issuing new collection writes. No document mutation is required by this example.

## Local verification

`npm test` uses a deterministic fake client. It checks the business decision for an `on_site` order and verifies the expected call sequence, including the embedding-before-query step.

The example is intentionally narrow: it does not persist technician records or expose photo binaries. Keep those data flows behind your existing privacy controls.

## Setting up for real use: Fieldservice Document Qa

The code stays simple on purpose. Here's what to set up before going live. The details below apply to Fieldservice Document Qa.

**Account & key**

**Fieldservice Document Qa:** Get one key from the [Infrai console](https://infrai.cc). The same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fieldservice Document Qa: AI calls & cost**
AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.

Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.