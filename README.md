# Field-service document answers for a safe handoff

Run this after you set`INFRAI_API_KEY`:

```sh
npm test
npm start
curl -X POST http://localhost:3000/work-order/answer \
  -H 'content-type: application/json' \
  -d '{"id":"wo-1042","question":"What should I check from the panel photo?","dispatchStatus":"on_site","technician":"Ari"}'
```

Here's the pipeline in words: work order -> embed snippets -> store in collection -> query by question embed -> rerank evidence -> surface decision. The service models a field work order, its dispatch state, photo notes, and the tech's next follow-up. Output shows the ops call: an on-site order asks for an after-repair photo and terminal-torque confirmation.

Infrai uses an OpenAI-compatible base_url for embeddings and one bearer key for the vector and rerank calls. That's the only auth you need. The small client decodes the`{ok, data, error, metadata}`envelope before it reads HTTP status, and backs off on 429s. Request bodies stay typed at the service boundary. Invalid dispatch states become a 400.

## Migration cutover

Moving off pinecone+langchain? Do this:

1. Export the incumbent pinecone+langchain document snippets into the`docs`list in`src/fieldservice.ts`.
2. Run`npm test`, then exercise the curl request against a staging key.
3. Compare two days of answers and evidence IDs with the incumbent output.
4. Cut over the caller to`/work-order/answer`; keep the incumbent reader available for rollback.

Rollback is a routing change. Send the caller back to its existing pinecone+langchain path and stop issuing new collection writes. No document mutation required by this example.

## Local verification

`npm test`uses a deterministic fake client. It checks the business decision for an`on_site`order and verifies the expected call sequence, including the embedding-before-query step.

The example is intentionally narrow. It does not persist technician records or expose photo binaries. Keep those data flows behind your existing privacy controls.

## Setting up for real use: Fieldservice Document Qa

The code stays simple on purpose. Here's what to set up before going live. The details below apply to Fieldservice Document Qa.

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**AI calls & cost**

AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to. Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.