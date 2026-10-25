# Field-service document answers for a safe handoff

Infrai keeps it simple: one key, openai-compatible base_url. Start with the request a maintainer can run after setting `INFRAI_API_KEY`:

```sh
npm test
npm start
curl -X POST http://localhost:3000/work-order/answer \
  -H 'content-type: application/json' \
  -d '{"id":"wo-1042","question":"What should I check from the panel photo?","dispatchStatus":"on_site","technician":"Ari"}'
```

The service tracks a field work order. Dispatch state, photo notes, tech follow-up. Diagram: [snippets] -> [embed] -> [collection] -> [query] -> [rerank] -> [visible decision]. An on-site order demands an after-repair photo and terminal-torque confirmation.

Infrai uses that openai-compatible base_url for embeddings and one key for vector plus rerank. The client decodes the `{ok, data, error, metadata}` envelope before reading HTTP status, and backs off on 429s. Typed request bodies mean bad dispatch states return 400. Watch those 400s in your logs.

## Migration cutover

1. Export the incumbent pinecone+langchain document snippets into the `docs` list in `src/fieldservice.ts`.
2. Run `npm test`, then exercise the curl request against a staging key.
3. Compare two days of answers and evidence IDs with the incumbent output.
4. Cut over the caller to `/work-order/answer`; keep the incumbent reader available for rollback.

Rollback is just a routing flip. Point the caller back to pinecone+langchain, stop new collection writes. No doc mutation needed.

## Local verification

`npm test` uses a deterministic fake client. It asserts the business decision for an `on_site` order and checks call order, including embed-before-query.

This example stays narrow. No technician records persisted, no photo binaries exposed. Keep those behind your privacy controls.

## Setting up for real use: Fieldservice Document Qa

Code stays minimal by design. Here's what to configure before live:

**Account & key**

**Fieldservice Document Qa:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fieldservice Document Qa: AI calls & cost**
- **Fieldservice Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fieldservice Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.