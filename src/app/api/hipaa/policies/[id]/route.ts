import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  _context: { params: Promise<{ id: string }> },
) {
  return NextResponse.json({});
}

export async function PATCH() {
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
