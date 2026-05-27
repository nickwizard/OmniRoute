import { handleCountTokensBody } from "@/app/api/v1/messages/count_tokens/handler";
import {
  buildProviderCorsOptions,
  getProviderRouteContext,
  prefixAndValidateProviderModel,
  readProviderJsonBody,
} from "../../_utils";

export async function OPTIONS() {
  return buildProviderCorsOptions();
}

/**
 * POST /v1/providers/{provider}/messages/count_tokens
 * Counts tokens for Claude Messages-format requests scoped to one provider.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  const context = getProviderRouteContext(rawProvider);
  if (context.error) return context.error;

  const parsed = await readProviderJsonBody(request);
  if (parsed.error) return parsed.error;

  if (parsed.body && typeof parsed.body === "object" && !Array.isArray(parsed.body)) {
    const modelError = prefixAndValidateProviderModel(
      parsed.body as Record<string, unknown>,
      rawProvider,
      context.providerEntry
    );
    if (modelError) return modelError;
  }

  return handleCountTokensBody(parsed.body);
}
