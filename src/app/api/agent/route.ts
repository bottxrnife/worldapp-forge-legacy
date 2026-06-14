import { NextResponse } from "next/server";
import { runAgentTurn, type ApiMessage } from "@/lib/agent";
import type { DappManifest } from "@/lib/types";

export async function POST(req: Request) {
  const { history, message, creator, draft } = (await req.json()) as {
    history?: ApiMessage[];
    message: string;
    creator?: string;
    draft?: DappManifest | null;
  };
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
  try {
    const turn = await runAgentTurn(history ?? [], message.trim(), creator || "a human", draft ?? null);
    return NextResponse.json(turn);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
