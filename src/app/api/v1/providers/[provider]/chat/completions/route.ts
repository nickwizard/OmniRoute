import { buildClientRawRequest, handleChat } from "@/sse/handlers/chat";
import { initTranslators } from "@omniroute/open-sse/translator/index.ts";
import { errorResponse } from "@omniroute/open-sse/utils/error.ts";
import { HTTP_STATUS } from "@omniroute/open-sse/config/constants.ts";
import { getRegistryEntry } from "@omniroute/open-sse/config/providerRegistry.ts";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * POST /v1/providers/{provider}/chat/completions
 * Routes to the specified provider, validating model/provider match.
 * Body format is not pre-validated — delegates to handleChat (matching /v1/chat/completions).
 */
export async function POST(request, { params }) {
  const { provider: rawProvider } = await params;

  const providerEntry = getRegistryEntry(rawProvider);

  if (!providerEntry) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, `Unknown provider: ${rawProvider}`);
  }

  // Resolve provider alias/id for model prefix checks
  const providerAlias = providerEntry.alias || providerEntry.id;

  await ensureInitialized();

  // Clone request with provider-prefixed model
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }
  const modelStr: string | undefined =
    typeof rawBody?.model === "string" && rawBody.model.trim().length > 0
      ? rawBody.model.trim()
      : undefined;

  // Validate model belongs to this provider
  if (modelStr) {
    const modelParts = modelStr.split("/");
    const hasProviderPrefix = modelParts.length >= 2;
    const modelProvider = hasProviderPrefix ? modelParts[0] : null;

    if (
      hasProviderPrefix &&
      modelProvider !== providerAlias &&
      modelProvider !== rawProvider &&
      modelProvider !== providerEntry.id
    ) {
      return errorResponse(
        HTTP_STATUS.BAD_REQUEST,
        `Model "${modelStr}" does not belong to provider "${rawProvider}". Expected prefix: ${providerAlias}/`
      );
    }

    // Add provider prefix if missing
    if (!hasProviderPrefix) {
      rawBody.model = `${providerAlias}/${modelStr}`;
    }
  }

  // Create a new request with the modified body
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(rawBody),
  });

  return await handleChat(newRequest, buildClientRawRequest(request, rawBody));
}
