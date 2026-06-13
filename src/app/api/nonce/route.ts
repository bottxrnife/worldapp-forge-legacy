import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Issue a SIWE nonce for walletAuth. Must be alphanumeric and >= 8 chars.
 * Stored in an httpOnly cookie so the verify step can confirm it.
 */
export async function GET() {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const jar = await cookies();
  jar.set("siwe", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.json({ nonce });
}
