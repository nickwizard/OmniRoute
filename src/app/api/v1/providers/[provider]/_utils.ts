import { HTTP_STATUS } from "@omniroute/open-sse/config/constants.ts";
import { getRegistryEntry } from "@omniroute/open-sse/config/providerRegistry.ts";
import { errorResponse } from "@omniroute/open-sse/utils/error.ts";

export function buildProviderCorsOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export function getProviderRouteContext(rawProvider: string) {
  const providerEntry = getRegistryEntry(rawProvider);

  if (!providerEntry) {
    return {
      error: errorResponse(HTTP_STATUS.BAD_REQUEST, `Unknown provider: ${rawProvider}`),
    };
  }

  return {
    providerEntry,
    providerAlias: providerEntry.alias || providerEntry.id,
  };
}

export async function readProviderJsonBody(request: Request) {
  try {
    return { body: await request.json() };
  } catch {
    return { error: errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body") };
  }
}

export function prefixAndValidateProviderModel(
  body: Record<string, unknown>,
  rawProvider: string,
  providerEntry: { id: string; alias?: string | null }
) {
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!model) return null;

  const providerAlias = providerEntry.alias || providerEntry.id;
  const modelParts = model.split("/");
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
      `Model "${model}" does not belong to provider "${rawProvider}". Expected prefix: ${providerAlias}/`
    );
  }

  body.model = hasProviderPrefix ? model : `${providerAlias}/${model}`;
  return null;
}

export function buildProviderForwardRequest(request: Request, body: unknown) {
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });
}

export function buildProviderClientRawRequest(request: Request, body: unknown) {
  const url = new URL(request.url);
  return {
    endpoint: url.pathname,
    body,
    headers: Object.fromEntries(request.headers.entries()),
  };
}
