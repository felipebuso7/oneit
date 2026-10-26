import { ImageResponse } from "next/og";

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size: value } = await context.params;
  if (!["180", "192", "512"].includes(value)) return new Response(null, { status: 404 });
  const size = Number(value);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e7490", color: "#ffffff", fontSize: size * 0.58, fontWeight: 700 }}>S</div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
