import { handleAiReviewRequest } from "@/lib/ai/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  const { cmid } = await context.params;
  return handleAiReviewRequest(request, cmid);
}
