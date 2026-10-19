import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { decryptText, encryptText } from "../utils/encryption.js";
import type { FavouriteInput, NoteInput, UpdateNoteInput } from "../validators/note.validator.js";
import { listNotesQuerySchema } from "../validators/note.validator.js";
import { failure, success } from "../utils/response.js";

export const createNote: RequestHandler = async (req, res, next) => {
  try {
    const { title, body } = req.validatedBody as NoteInput;
    const note = await prisma.note.create({
      data: { title, body: encryptText(body), userId: req.user!.sub },
    });

    success(res, 201, "Note created.", {
      id: note.id,
      title: note.title,
      body,
      isFavourite: note.isFavourite,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const listNotes: RequestHandler = async (req, res, next) => {
  try {
    // Support both ?search= and ?query= as names for the title search term.
    const parsedQuery = listNotesQuerySchema.safeParse({
      search: req.query.search ?? req.query.query,
      page: req.query.page,
      limit: req.query.limit,
    });

    if (!parsedQuery.success) {
      failure(res, 400, "Invalid query parameters.", parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })));
      return;
    }

    const { search, page, limit } = parsedQuery.data;
    const userId = req.user!.sub;
    const where = {
      userId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const skip = (page - 1) * limit;

    const [notes, totalNotes] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: [
          { isFavourite: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    success(res, 200, "Notes retrieved.", {
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        body: decryptText(note.body),
        isFavourite: note.isFavourite,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
      pagination: {
        page,
        limit,
        totalNotes,
        totalPages: Math.ceil(totalNotes / limit),
      },
      search: search ?? "",
    });
  } catch (error) {
    next(error);
  }
};

export const updateNote: RequestHandler = async (req, res, next) => {
  try {
    const noteId = req.params.id;

if (typeof noteId !== "string") {
  failure(res, 400, "Invalid note ID.");
  return;
}

const userId = req.user!.sub;
    const input = req.validatedBody as UpdateNoteInput;
    const existing = await prisma.note.findFirst({ where: { id: noteId, userId } });

    if (!existing) {
      failure(res, 404, "Note not found.");
      return;
    }

    const data: { title?: string; body?: string } = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.body !== undefined) data.body = encryptText(input.body);

    const note = await prisma.note.update({ where: { id: existing.id }, data });
    success(res, 200, "Note updated.", {
      id: note.id,
      title: note.title,
      body: decryptText(note.body),
      isFavourite: note.isFavourite,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const setNoteFavourite: RequestHandler = async (req, res, next) => {
  try {
    const { isFavourite } = req.validatedBody as FavouriteInput;
    
    const noteId = req.params.id;

    if (typeof noteId !== "string") {
    failure(res, 400, "Invalid note ID.");
    return;
  }

const existing = await prisma.note.findFirst({
  where: { id: noteId, userId: req.user!.sub },
});

    if (!existing) {
      failure(res, 404, "Note not found.");
      return;
    }

    const note = await prisma.note.update({
      where: { id: existing.id },
      data: { isFavourite },
    });

    success(res, 200, isFavourite ? "Note marked as favourite." : "Note removed from favourites.", {
      id: note.id,
      title: note.title,
      isFavourite: note.isFavourite,
      updatedAt: note.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote: RequestHandler = async (req, res, next) => {
  try {
    const noteId = req.params.id;

    if (typeof noteId !== "string") {
    failure(res, 400, "Invalid note ID.");
    return;
   }

const note = await prisma.note.findFirst({
  where: { id: noteId, userId: req.user!.sub },
});
    

    if (!note) {
      failure(res, 404, "Note not found.");
      return;
    }

    await prisma.note.delete({ where: { id: note.id } });
    success(res, 200, "Note deleted.");
  } catch (error) {
    next(error);
  }
};
