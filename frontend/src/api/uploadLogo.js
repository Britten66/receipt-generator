/*
  uploadLogo.js: handles logo upload with optional background removal.

  Steps:
    1. If a remove.bg API key is set, send the image to remove.bg first.
       The API returns a PNG with the background removed.
    2. Upload the result (or original if removal fails/is skipped) to Supabase Storage.
    3. Return the public URL with a cache-buster so the browser fetches fresh.

  The storage path is always `{safeEmail}/avatar`: no extension: so every
  upload overwrites the exact same file and old files never pile up.
*/

import { supabase } from "../lib/supabase";

const REMOVEBG_KEY = import.meta.env.VITE_REMOVEBG_API_KEY;

/*
  removeBackground(file): sends the image to remove.bg and returns a File with
  the background stripped. Returns the original file if anything goes wrong so
  the upload always continues.
*/
async function removeBackground(file) {
  if (!REMOVEBG_KEY || REMOVEBG_KEY === "your_api_key_here") return file;

  try {
    const body = new FormData();
    body.append("image_file", file);
    body.append("size", "preview"); // free tier: low-res but fine for logos on a PDF

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": REMOVEBG_KEY },
      body,
    });

    if (!res.ok) return file; // API error: fall back to original

    const blob = await res.blob();
    return new File([blob], "avatar.png", { type: "image/png" });
  } catch {
    return file; // network error: fall back to original
  }
}

/*
  uploadLogo({ file, userEmail, type }): removes background then uploads to Supabase.
  type: "logo"   → business logo on PDFs  → stored at {email}/logo
  type: "avatar" → profile picture in app → stored at {email}/avatar
  Returns the fresh public URL on success, or null on failure.
*/
export async function uploadLogo({ file, userEmail, type = "logo" }) {
  const processed = type === "logo" ? await removeBackground(file) : file;

  let safeEmail = "";
  if (userEmail) {
    safeEmail = userEmail.replace(/[^a-z0-9]/gi, "_");
  }
  const storagePath = `${safeEmail}/${type}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(storagePath, processed, { upsert: true, contentType: processed.type });

  if (error) return null;

  const { data: urlData } = supabase.storage.from("logos").getPublicUrl(storagePath);
  return `${urlData.publicUrl}?v=${Date.now()}`;
}
