import { NextResponse } from "next/server";

// Única rota de /api/** que não exige token — só confirma que a API está no ar.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
