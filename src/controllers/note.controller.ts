import type { RequestHandler } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../config/database.js";
import { decryptText, encryptText } from "../utils/encryption.js";
import type {
  FavouriteInput,
  NoteInput,
  UpdateNoteInput,
} from "../validators/note.validator.js";
import { listNotesQuerySchema } from "../validators/note.validator.js";
import { failure, success } from "../utils/response.js";

type NoteCursor = {
  id: string;
  isFavourite: boolean;
  createdAt: Date;
};

type NoteRecord = {
  id: string;
  title: string;
  body: string;
  isFavourite: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const NOTES_BATCH_SIZE = 100;

const cursorSchema = z.object({
  id: z.string().min(1),
  isFavourite: z.boolean(),
  createdAt: z.string().datetime(),
}).strict();

// Convert cursor information into a Base64URL string.
function encodeCursor(note: NoteCursor): string {
  return Buffer.from(
    JSON.stringify({
      id: note.id,
      isFavourite: note.isFavourite,
      createdAt: note.createdAt.toISOString(),
    }),
  ).toString("base64url");
}

// Decode and validate the cursor received from the frontend.
function decodeCursor(value: string): NoteCursor | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = cursorSchema.safeParse(JSON.parse(decoded));

    if (!parsed.success) {
      return null;
    }

    return {
      id: parsed.data.id,
      isFavourite: parsed.data.isFavourite,
      createdAt: new Date(parsed.data.createdAt),
    };
  } catch {
    return null;
  }
}

// Find records appearing after the current cursor.
function getAfterCursorConditions(
  cursor: NoteCursor,
): Prisma.NoteWhereInput[] {
  const conditions: Prisma.NoteWhereInput[] = [
    {
      isFavourite: cursor.isFavourite,
      createdAt: { lt: cursor.createdAt },
    },
    {
      isFavourite: cursor.isFavourite,
      createdAt: cursor.createdAt,
      id: { lt: cursor.id },
    },
  ];

  // Non-favourite notes come after favourite notes.
  if (cursor.isFavourite) {
    conditions.unshift({
      isFavourite: false,
    });
  }

  return conditions;
}

function toCursor(note: NoteRecord): NoteCursor {
  return {
    id: note.id,
    isFavourite: note.isFavourite,
    createdAt: note.createdAt,
  };
}

// CREATE NOTE
export const createNote: RequestHandler = async (req, res, next) => {
  try {
    const { title, body } = req.validatedBody as NoteInput;

    const note = await prisma.note.create({
      data: {
        title,
        body: encryptText(body),
        userId: req.user!.sub,
      },
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

// LIST NOTES WITH CURSOR PAGINATION AND SEARCH
export const listNotes: RequestHandler = async (req, res, next) => {
  try {
    const parsedQuery = listNotesQuerySchema.safeParse({
      search: req.query.search ?? req.query.query,
      cursor: req.query.cursor,
      limit: req.query.limit,
    });

    if (!parsedQuery.success) {
      failure(
        res,
        400,
        "Invalid query parameters.",
        parsedQuery.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      );
      return;
    }

    const { search, cursor: cursorValue, limit } = parsedQuery.data;
    const userId = req.user!.sub;

    const startingCursor = cursorValue
      ? decodeCursor(cursorValue)
      : null;

    if (cursorValue && !startingCursor) {
      failure(res, 400, "Invalid pagination cursor.");
      return;
    }

    const searchTerm = search?.toLowerCase();

    const matchingNotes: Array<{
      note: NoteRecord;
      body: string;
    }> = [];

    let scanCursor = startingCursor;
    let hasMore = false;
    let reachedEnd = false;

    // Read notes in batches instead of loading every note at once.
    while (matchingNotes.length <= limit && !reachedEnd) {
      const where: Prisma.NoteWhereInput = {
        userId,
        ...(scanCursor
          ? { OR: getAfterCursorConditions(scanCursor) }
          : {}),
      };

      const batch = await prisma.note.findMany({
        where,
        orderBy: [
          { isFavourite: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: NOTES_BATCH_SIZE,
      });

      if (batch.length === 0) {
        reachedEnd = true;
        break;
      }

      for (const note of batch) {
        scanCursor = toCursor(note);

        // Decrypt body before searching.
        const body = decryptText(note.body);

        const matchesSearch =
          !searchTerm ||
          note.title.toLowerCase().includes(searchTerm) ||
          body.toLowerCase().includes(searchTerm);

        if (matchesSearch) {
          matchingNotes.push({
            note,
            body,
          });

          // An extra matching note means another page exists.
          if (matchingNotes.length > limit) {
            hasMore = true;
            break;
          }
        }
      }

      if (!hasMore && batch.length < NOTES_BATCH_SIZE) {
        reachedEnd = true;
      }
    }

    const pageNotes = matchingNotes.slice(0, limit);

    const lastNote = pageNotes[pageNotes.length - 1]?.note;

    success(res, 200, "Notes retrieved.", {
      notes: pageNotes.map(({ note, body }) => ({
        id: note.id,
        title: note.title,
        body,
        isFavourite: note.isFavourite,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),

      pagination: {
        limit,
        hasMore,
        nextCursor:
          hasMore && lastNote
            ? encodeCursor(toCursor(lastNote))
            : null,
      },

      search: search ?? "",
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE NOTE
export const updateNote: RequestHandler = async (req, res, next) => {
  try {
    const noteId = req.params.id;
    const userId = req.user!.sub;
    const input = req.validatedBody as UpdateNoteInput;

    const existing = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!existing) {
      failure(res, 404, "Note not found.");
      return;
    }

    const data: {
      title?: string;
      body?: string;
    } = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.body !== undefined) {
      data.body = encryptText(input.body);
    }

    const note = await prisma.note.update({
      where: { id: existing.id },
      data,
    });

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

// MARK OR UNMARK FAVOURITE
export const setNoteFavourite: RequestHandler = async (req, res, next) => {
  try {
    const { isFavourite } = req.validatedBody as FavouriteInput;

    const existing = await prisma.note.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!existing) {
      failure(res, 404, "Note not found.");
      return;
    }

    const note = await prisma.note.update({
      where: { id: existing.id },
      data: { isFavourite },
    });

    success(
      res,
      200,
      isFavourite
        ? "Note marked as favourite."
        : "Note removed from favourites.",
      {
        id: note.id,
        title: note.title,
        isFavourite: note.isFavourite,
        updatedAt: note.updatedAt,
      },
    );
  } catch (error) {
    next(error);
  }
};

// DELETE NOTE
export const deleteNote: RequestHandler = async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!note) {
      failure(res, 404, "Note not found.");
      return;
    }

    await prisma.note.delete({
      where: { id: note.id },
    });

    success(res, 200, "Note deleted.");
  } catch (error) {
    next(error);
  }
};