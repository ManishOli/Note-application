import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { decryptText, encryptText } from "../utils/encryption.js";
import type { NoteInput, UpdateNoteInput } from "../validators/note.validator.js";
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
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const listNotes: RequestHandler = async (req, res, next) => {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
    });

    success(res, 200, "Notes retrieved.", {
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        body: decryptText(note.body),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const updateNote: RequestHandler = async (req, res, next) => {
  try {
    const noteId = req.params.id;
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
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote: RequestHandler = async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
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
