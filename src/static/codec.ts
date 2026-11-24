import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { canonicalDeckText } from "@/lib/deck/parser";

/** Lista do deck → texto curto para pôr no link (deflate + base64url). */
export function encodeDeck(text: string): string {
  const bytes = deflateSync(strToU8(canonicalDeckText(text)), { level: 9 });
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDeck(code: string): string | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return strFromU8(inflateSync(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

/** Chave estável do deck (16 hex, como o id do servidor). */
export async function deckKey(text: string): Promise<string> {
  const data = new TextEncoder().encode(canonicalDeckText(text));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...hash].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
