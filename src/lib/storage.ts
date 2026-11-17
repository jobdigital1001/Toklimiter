import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { CV_EXTENSIONS, CV_MAX_BYTES, CV_MIME_TYPES } from "@/lib/constants";

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export type StoredFile = { key: string; fileName: string };

export function validateCv(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (!(CV_EXTENSIONS as readonly string[]).includes(ext)) return "Upload a PDF, DOC, or DOCX file.";
  if (file.type && !(CV_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Upload a PDF, DOC, or DOCX file.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > CV_MAX_BYTES) return "Your CV must be 4 MB or smaller.";
  return null;
}

function safeFileName(name: string): string {
  const cleaned = path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(-100);
  return cleaned || "cv.pdf";
}

/**
 * Stores a CV and returns an opaque key. Keys are never exposed to browsers;
 * downloads go through authorised route handlers.
 */
export async function saveCv(file: File, folder: string): Promise<StoredFile> {
  const ext = path.extname(file.name).toLowerCase();
  const fileName = safeFileName(file.name);
  const objectName = `${folder}/${randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`cvs/${objectName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: CONTENT_TYPES[ext],
    });
    return { key: `blob:${blob.url}`, fileName };
  }

  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for file uploads on Vercel.");
  }
  const target = path.join(LOCAL_ROOT, objectName);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return { key: `local:${objectName}`, fileName };
}

function localPath(key: string): string | null {
  const resolved = path.resolve(LOCAL_ROOT, key.slice("local:".length));
  return resolved.startsWith(LOCAL_ROOT + path.sep) ? resolved : null;
}

export async function readStoredFile(key: string): Promise<{ body: BodyInit; contentType: string } | null> {
  try {
    if (key.startsWith("blob:")) {
      const res = await fetch(key.slice("blob:".length));
      if (!res.ok || !res.body) return null;
      return { body: res.body, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
    }
    if (key.startsWith("local:")) {
      const file = localPath(key);
      if (!file) return null;
      const data = await readFile(file);
      return {
        body: new Uint8Array(data),
        contentType: CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      };
    }
  } catch (error) {
    console.error("[storage] read failed", error);
  }
  return null;
}

export async function deleteStoredFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (key.startsWith("blob:")) await del(key.slice("blob:".length));
    else if (key.startsWith("local:")) {
      const file = localPath(key);
      if (file) await unlink(file);
    }
  } catch (error) {
    console.error("[storage] delete failed", error);
  }
}

export function downloadResponse(file: { body: BodyInit; contentType: string }, fileName: string): Response {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
