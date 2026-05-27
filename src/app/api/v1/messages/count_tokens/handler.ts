import { getProviderCredentials } from "@/sse/services/auth";
import { getModelInfo } from "@/sse/services/model";
import * as log from "@/sse/utils/logger";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { v1CountTokensSchema } from "@/shared/validation/schemas";
import { estimateTokens } from "@/shared/utils/costEstimator";
import { CORS_HEADERS } from "@/shared/utils/cors";
import { getExecutor } from "@omniroute/open-sse/executors/index.ts";

export async function handleCountTokensRequest(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  return handleCountTokensBody(rawBody);
}

export async function handleCountTokensBody(rawBody: unknown) {
  const validation = validateBody(v1CountTokensSchema, rawBody);
  if (isValidationFailure(validation)) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
  const body = validation.data;

  const estimated = buildEstimatedCountResponse(body);
  const requestedModel = typeof body.model === "string" ? body.model : "";
  if (!requestedModel) {
    return estimated;
  }

  try {
    const modelInfo = await getModelInfo(requestedModel);
    if (!modelInfo?.provider || !modelInfo?.model) {
      return estimated;
    }

    const credentials = await getProviderCredentials(
      modelInfo.provider,
      null,
      null,
      modelInfo.model
    );
    if (!credentials || credentials.allRateLimited) {
      return estimated;
    }

    const executor = getExecutor(modelInfo.provider);
    const counted = await executor?.countTokens?.({
      model: modelInfo.model,
      body,
      credentials,
      log,
    });

    if (!counted || !Number.isFinite(counted.input_tokens)) {
      return estimated;
    }

    return new Response(
      JSON.stringify({
        input_tokens: counted.input_tokens,
        model: modelInfo.model,
        provider: modelInfo.provider,
        source: counted.source || "provider",
      }),
      {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  } catch (error) {
    log.debug(
      "COUNT_TOKENS",
      `Falling back to estimate for ${requestedModel}: ${error instanceof Error ? error.message : String(error)}`
    );
    return estimated;
  }
}

function buildEstimatedCountResponse(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  let totalChars = 0;

  for (const msg of messages) {
    if (typeof msg?.content === "string") {
      totalChars += msg.content.length;
      continue;
    }

    if (Array.isArray(msg?.content)) {
      for (const part of msg.content) {
        if (part?.type === "text" && typeof part.text === "string") {
          totalChars += part.text.length;
        }
      }
    }
  }

  if (typeof body?.system === "string") {
    totalChars += body.system.length;
  }

  return new Response(
    JSON.stringify({
      input_tokens: totalChars > 0 ? Math.ceil(totalChars / 4) : estimateTokens(""),
      source: "estimated",
    }),
    {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
}
