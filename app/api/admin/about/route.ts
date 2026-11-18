import { normalizeAboutContent } from "@/lib/about-content";
import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { readDb, withDb } from "@/lib/store";

export async function GET() {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  return Response.json({ about: normalizeAboutContent(readDb().about) });
}

export async function PUT(request: Request) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const body = await readJson(request);
    const about = await withDb((db) => {
      db.about = normalizeAboutContent(body.about ?? body);
      return db.about;
    });
    return Response.json({ about });
  } catch (error) {
    return fail(error);
  }
}
