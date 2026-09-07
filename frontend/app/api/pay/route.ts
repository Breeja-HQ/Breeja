import { NextResponse } from "next/server";

const RELAYER_API_URL = process.env.RELAYER_API_URL ?? "http://localhost:3001";
const RELAYER_API_KEY = process.env.BREEJA_API_KEY ?? "";

// Proxies to the relayer's authenticated POST /pay, holding the real
// x-api-key server-side so the browser never sees it. See docs/SDK.md /
// docs/FRONTEND.md — the widget calls this same-origin route instead.
export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();

  const response = await fetch(`${RELAYER_API_URL}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": RELAYER_API_KEY,
    },
    body,
  });

  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
