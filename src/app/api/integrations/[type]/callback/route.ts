import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  _context: { params: Promise<{ type: string }> },
) {
  return NextResponse.redirect(new URL("/", "http://localhost"));
}
