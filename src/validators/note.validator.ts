import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(5000),
}).strict();

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
}).strict().refine((value) => value.title !== undefined || value.body !== undefined, {
  message: "Provide a title or body to update.",
});

export type NoteInput = z.infer<typeof noteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
