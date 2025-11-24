import { localDB } from "./pouchDB.js";

class NotesSidebar {
    constructor() {
        this.notesTextarea = document.getElementById('notesTextarea');
        this.notesDayHeader = document.getElementById('notesDay');
        this.currentDate = null;
        this.currentNoteId = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.notesTextarea.addEventListener('input', (e) => {
            this.saveNotes(e.target.value);
        });
    }

  // Generate stable ID: note_YYYY-MM-DD
    getNoteId(date) {
        const dateKey = date.toISOString().split("T")[0];
        return `note_${dateKey}`;
    }

    async loadNotesForDay(day, date) {
        this.currentDate = date;
        this.currentNoteId = this.getNoteId(date);
        this.notesDayHeader.textContent = day;

        try {
        const doc = await localDB.get(this.currentNoteId);
        this.notesTextarea.value = doc.content || "";
        console.log("Loaded:", this.currentNoteId);
        } catch (err) {
        if (err.status === 404) {
            // No note for this day yet
            this.notesTextarea.value = "";
            console.log("No note found for this day.");
        } else {
            console.error("Error loading note:", err);
        }
        }
    }

    async saveNotes(content) {
        if (!this.currentDate) return;

        const noteId = this.currentNoteId || this.getNoteId(this.currentDate);

        try {
            let doc;

            try {
                doc = await localDB.get(noteId);
                doc.content = content;
                doc.updatedAt = new Date().toISOString();
            } catch (err) {
                if (err.status === 404) {
                doc = {
                    _id: noteId,
                    type: "note",
                    noteDate: noteId.replace("note_", ""),
                    content: content,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                } else {
                throw err;
                }
        }

            await localDB.put(doc);
            console.log("Saved:", noteId);
        } catch (err) {
            console.error("Error saving note:", err);
        }
    }

    getNotes() {
        return this.notesTextarea.value;
    }
}

const notesSidebar = new NotesSidebar();
export { notesSidebar };