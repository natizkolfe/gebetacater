import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { OrderError, saveFeedback, toCustomerOrder } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function POST(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.user) return errorMessage("Sign in to leave feedback.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    const order = await withDb((db) => {
      const found = db.orders.find((entry) => entry.id === id && entry.userId === auth.user?.id);
      if (!found) throw new OrderError("Order not found.", 404);
      saveFeedback(found, {
        rating: Number(body.rating),
        comment: String(body.comment ?? ""),
        foodRating: body.foodRating == null || body.foodRating === "" ? null : Number(body.foodRating),
        deliveryRating: body.deliveryRating == null || body.deliveryRating === "" ? null : Number(body.deliveryRating),
        websiteRating: body.websiteRating == null || body.websiteRating === "" ? null : Number(body.websiteRating),
      });
      return found;
    });
    return Response.json({ order: toCustomerOrder(order) });
  } catch (error) {
    return fail(error);
  }
}
