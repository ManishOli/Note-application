import { Router } from "express";
import { createNote, deleteNote, listNotes, updateNote } from "../controllers/note.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { noteSchema, updateNoteSchema } from "../validators/note.validator.js";

const router = Router();
router.use(requireAuth);
router.get("/", listNotes);
router.post("/", validate(noteSchema), createNote);
router.patch("/:id", validate(updateNoteSchema), updateNote);
router.delete("/:id", deleteNote);

export default router;
