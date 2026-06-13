import { NextResponse } from "next/server";
import { runAgentTurn, type ApiMessage } from "@/lib/agent";

export async function POST(req: Request) {
  const { history, message, creator } = (await req.json()) as {
    history?: ApiMessage[];
    message: string;
    creator?: string;
  };
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
  try {
    const turn = await runAgentTurn(history ?? [], message.trim(), creator || "a human");
    return NextResponse.json(turn);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
