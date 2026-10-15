/**
 * Share links hold the whole form in the URL's hash, so that opening the link loads the same
 * mechanism. To keep the link short, only the fields that differ from the defaults are kept, then
 * they are compressed and base64url encoded. The compression is raw DEFLATE: gzip's compression
 * without gzip's 18 byte header and checksum, which a short form cannot spare. The hash never
 * reaches the server, so this works on a static site.
 */

/** The hash parameter that holds the form, as in `#config=...`. */
export const SHARE_PARAM = "config";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The parts of `values` that differ from `defaults`, or undefined when nothing does. */
export function diffFromDefaults(values: unknown, defaults: unknown): Json | undefined {
  if (isObject(values) && isObject(defaults)) {
    const diff: Record<string, Json> = {};
    for (const [key, value] of Object.entries(values)) {
      const changed = diffFromDefaults(value, defaults[key]);
      if (changed !== undefined) {
        diff[key] = changed;
      }
    }
    return Object.keys(diff).length > 0 ? diff : undefined;
  }
  return JSON.stringify(values) === JSON.stringify(defaults) ? undefined : (values as Json);
}

/** `diff` laid over `defaults`, the reverse of {@link diffFromDefaults}. */
export function mergeOntoDefaults(diff: unknown, defaults: unknown): unknown {
  if (isObject(diff) && isObject(defaults)) {
    const merged: Record<string, unknown> = { ...defaults };
    for (const [key, value] of Object.entries(diff)) {
      merged[key] = mergeOntoDefaults(value, defaults[key]);
    }
    return merged;
  }
  return diff === undefined ? defaults : diff;
}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const output = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** The form as share link text: its changes from the defaults, compressed and base64url encoded. */
export async function encodeForm(values: unknown, defaults: unknown): Promise<string> {
  const json = JSON.stringify(diffFromDefaults(values, defaults) ?? {});
  return toBase64Url(await transform(new TextEncoder().encode(json), new CompressionStream("deflate-raw")));
}

/** The form from share link text, laid over the defaults. Throws if the text is not a share link. */
export async function decodeForm(text: string, defaults: unknown): Promise<unknown> {
  const json = new TextDecoder().decode(await transform(fromBase64Url(text), new DecompressionStream("deflate-raw")));
  return mergeOntoDefaults(JSON.parse(json), defaults);
}

/** The share link text in a URL hash, or undefined when there is none. */
export function shareParam(hash: string): string | undefined {
  return new URLSearchParams(hash.replace(/^#/, "")).get(SHARE_PARAM) ?? undefined;
}
