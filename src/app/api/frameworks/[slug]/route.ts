import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  _context: { params: Promise<{ slug: string }> },
) {
  return NextResponse.json({});
}
