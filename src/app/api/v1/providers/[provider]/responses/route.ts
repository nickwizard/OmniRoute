import { handleChat } from "@/sse/handlers/chat";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { providerChatCompletionSchema } from "@/shared/validation/schemas";
import { HTTP_STATUS } from "@omniroute/open-sse/config/constants.ts";
import { errorResponse } from "@omniroute/open-sse/utils/error.ts";
import { withEarlyStreamKeepalive } from "@omniroute/open-sse/utils/earlyStreamKeepalive";
import {
  buildProviderClientRawRequest,
  buildProviderCorsOptions,
  buildProviderForwardRequest,
  getProviderRouteContext,
  prefixAndValidateProviderModel,
  readProviderJsonBody,
} from "../_utils";

export async function OPTIONS() {
  return buildProviderCorsOptions();
}

/**
 * POST /v1/providers/{provider}/responses
 * Routes OpenAI Responses-format requests to the specified provider.
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

  const validation = validateBody(providerChatCompletionSchema, parsed.body);
  if (isValidationFailure(validation)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, validation.error.message);
  }

  const body = validation.data;
  const modelError = prefixAndValidateProviderModel(body, rawProvider, context.providerEntry);
  if (modelError) return modelError;

  const forwardRequest = buildProviderForwardRequest(request, body);
  const responsePromise = handleChat(
    forwardRequest,
    buildProviderClientRawRequest(request, parsed.body)
  );
  const accept = String(request.headers?.get?.("accept") || "").toLowerCase();
  if (accept.includes("text/event-stream")) {
    return withEarlyStreamKeepalive(responsePromise, { signal: request.signal });
  }
  return responsePromise;
}
