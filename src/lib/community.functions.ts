import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  addComment,
  addPost,
  createUploadTicket,
  removeComment,
  removeImage,
  removePost,
  saveProfile,
  setLike,
  signImage,
} from "./community.server";

const auth = z.object({ deviceId: z.string().uuid(), secret: z.string().min(20).max(200) });

export const saveProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    auth
      .extend({
        display_name: z.string().max(200),
        avatar_id: z.number().int(),
        school: z.string().max(200).nullable().optional(),
        course: z.string().max(200).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    saveProfile(data, {
      display_name: data.display_name,
      avatar_id: data.avatar_id,
      school: data.school ?? null,
      course: data.course ?? null,
    }),
  );

export const createPostFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    auth
      .extend({
        content: z.string().max(4000).nullable(),
        image_path: z.string().max(300).nullable(),
        subject_id: z.string().max(60).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    addPost(data, {
      content: data.content,
      image_path: data.image_path,
      subject_id: data.subject_id,
    }),
  );

export const deletePostFn = createServerFn({ method: "POST" })
  .inputValidator((d) => auth.extend({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => removePost(data, data.postId));

export const toggleLikeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => auth.extend({ postId: z.string().uuid(), liked: z.boolean() }).parse(d))
  .handler(async ({ data }) => setLike(data, data.postId, data.liked));

export const createCommentFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    auth.extend({ postId: z.string().uuid(), content: z.string().max(2000) }).parse(d),
  )
  .handler(async ({ data }) => addComment(data, data.postId, data.content));

export const deleteCommentFn = createServerFn({ method: "POST" })
  .inputValidator((d) => auth.extend({ commentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => removeComment(data, data.commentId));

export const createUploadTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d) => auth.parse(d))
  .handler(async ({ data }) => createUploadTicket(data));

export const signImageFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ path: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => signImage(data.path));

export const deleteImageFn = createServerFn({ method: "POST" })
  .inputValidator((d) => auth.extend({ path: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => removeImage(data, data.path));
