import { DeliveryError, suggestAddresses } from "@/lib/delivery";
import { errorMessage, fail } from "@/lib/http";
import { readDb } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const suggestions = await suggestAddresses(query, readDb().settings);
    return Response.json({ suggestions });
  } catch (error) {
    if (error instanceof DeliveryError) return errorMessage(error.message);
    return fail(error);
  }
}
