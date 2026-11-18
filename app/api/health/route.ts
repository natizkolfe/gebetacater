/** Railway / Docker health probe — always 200 when the process is up. */
export function GET() {
  return Response.json({ ok: true }, { status: 200 });
}
