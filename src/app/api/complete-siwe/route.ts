import type { MiniAppWalletAuthSuccessPayload } from "@worldcoin/minikit-js/commands";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Body = { payload: MiniAppWalletAuthSuccessPayload; nonce: string };

/** Verify the Sign-In-with-Ethereum message World App returned (backend-side). */
export async function POST(req: Request) {
  const { payload, nonce } = (await req.json()) as Body;
  const stored = (await cookies()).get("siwe")?.value;

  if (!nonce || nonce !== stored) {
    return NextResponse.json({ isValid: false, error: "Invalid or expired nonce" }, { status: 400 });
  }

  try {
    const result = await verifySiweMessage(payload, nonce);
    return NextResponse.json({ isValid: result.isValid, address: payload?.address ?? null });
  } catch (e) {
    return NextResponse.json({ isValid: false, error: String(e) }, { status: 400 });
  }
}
