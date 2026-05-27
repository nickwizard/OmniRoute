import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

const { detectFormatFromEndpoint } = await import("../../open-sse/services/provider.ts");
const { prefixAndValidateProviderModel, getProviderRouteContext } =
  await import("../../src/app/api/v1/providers/[provider]/_utils.ts");

const root = process.cwd();

test("provider-scoped chat endpoints are detected by their public URL suffix", () => {
  assert.equal(detectFormatFromEndpoint({}, "/v1/providers/anthropic/messages"), "claude");
  assert.equal(detectFormatFromEndpoint({}, "/v1/providers/openai/responses"), "openai-responses");
  assert.equal(detectFormatFromEndpoint({}, "/v1/providers/openai/chat/completions"), "openai");
});

test("provider route helper prefixes bare models with the provider alias", () => {
  const context = getProviderRouteContext("openai");
  assert.equal(context.error, undefined);

  const body: Record<string, unknown> = { model: "gpt-4o" };
  const response = prefixAndValidateProviderModel(body, "openai", context.providerEntry);

  assert.equal(response, null);
  assert.equal(body.model, "openai/gpt-4o");
});

test("provider route helper rejects mismatched provider model prefixes", async () => {
  const context = getProviderRouteContext("deepseek");
  assert.equal(context.error, undefined);

  const body: Record<string, unknown> = { model: "openai/gpt-4o" };
  const response = prefixAndValidateProviderModel(body, "deepseek", context.providerEntry);

  assert.equal(response?.status, 400);
  assert.match(await response!.text(), /does not belong to provider/);
});

test("provider-scoped messages, count_tokens, and responses route files exist", () => {
  for (const relativePath of [
    "src/app/api/v1/providers/[provider]/messages/route.ts",
    "src/app/api/v1/providers/[provider]/messages/count_tokens/route.ts",
    "src/app/api/v1/providers/[provider]/responses/route.ts",
  ]) {
    assert.equal(existsSync(join(root, relativePath)), true, relativePath);
  }
});
