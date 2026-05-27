import { CORS_HEADERS } from "@/shared/utils/cors";
import { handleCountTokensRequest } from "./handler";

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * POST /v1/messages/count_tokens - Hybrid token count response.
 * Uses real provider-side count when supported, falling back to estimation.
 */
export async function POST(request: Request) {
  return handleCountTokensRequest(request);
}
