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


export const favouriteSchema = z.object({
  isFavourite: z.boolean(),
}).strict();

export const listNotesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type FavouriteInput = z.infer<typeof favouriteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
