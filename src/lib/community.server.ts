import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireDevice } from "./guest.server";

const BUCKET = "chat-images";

export interface Auth {
  deviceId: string;
  secret: string;
}

export async function saveProfile(auth: Auth, input: {
  display_name: string;
  avatar_id: number;
  school?: string | null;
  course?: string | null;
}) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  const row = {
    id,
    display_name: (input.display_name || "").trim().slice(0, 40) || "Scholar",
    avatar_id: Math.max(1, Math.min(500, Math.floor(input.avatar_id || 1))),
    school: input.school?.trim().slice(0, 80) || null,
    course: input.course?.trim().slice(0, 80) || null,
  };
  const { error } = await supabaseAdmin.from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw new Error("Could not save profile");
  return row;
}

export async function addPost(auth: Auth, input: {
  content: string | null;
  image_path: string | null;
  subject_id: string | null;
}) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  if (input.image_path && !input.image_path.startsWith(`${id}/`)) {
    throw new Error("Invalid image");
  }
  const { error } = await supabaseAdmin.from("posts").insert({
    author_id: id,
    content: input.content ? input.content.slice(0, 2000) : null,
    image_path: input.image_path,
    subject_id: input.subject_id ? input.subject_id.slice(0, 60) : null,
  });
  if (error) throw new Error("Could not create post");
  return { ok: true };
}

export async function removePost(auth: Auth, postId: string) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, author_id, image_path")
    .eq("id", postId)
    .maybeSingle();
  if (!data || data.author_id !== id) throw new Error("Not allowed");
  if (data.image_path) await supabaseAdmin.storage.from(BUCKET).remove([data.image_path]);
  await supabaseAdmin.from("posts").delete().eq("id", postId).eq("author_id", id);
  return { ok: true };
}

export async function setLike(auth: Auth, postId: string, liked: boolean) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  if (liked) {
    await supabaseAdmin.from("post_likes").upsert(
      { post_id: postId, user_id: id },
      { onConflict: "post_id,user_id", ignoreDuplicates: true },
    );
  } else {
    await supabaseAdmin.from("post_likes").delete().eq("post_id", postId).eq("user_id", id);
  }
  return { ok: true };
}

export async function addComment(auth: Auth, postId: string, content: string) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  const body = (content || "").trim().slice(0, 1000);
  if (!body) throw new Error("Empty comment");
  const { error } = await supabaseAdmin
    .from("post_comments")
    .insert({ post_id: postId, author_id: id, content: body });
  if (error) throw new Error("Could not comment");
  return { ok: true };
}

export async function removeComment(auth: Auth, commentId: string) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  const { error } = await supabaseAdmin
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", id);
  if (error) throw new Error("Could not delete comment");
  return { ok: true };
}

export async function createUploadTicket(auth: Auth) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  const path = `${id}/${crypto.randomUUID()}.webp`;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error("Could not prepare upload");
  return { path, token: data.token, signedUrl: data.signedUrl };
}

export async function signImage(path: string) {
  if (!path || path.includes("..")) throw new Error("Invalid path");
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return { url: data?.signedUrl ?? null };
}

export async function removeImage(auth: Auth, path: string) {
  const id = await requireDevice(auth.deviceId, auth.secret);
  if (!path.startsWith(`${id}/`)) throw new Error("Not allowed");
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
  return { ok: true };
}
