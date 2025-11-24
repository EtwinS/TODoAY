import { localDB } from "./pouchDB.js";

class NotesSidebar {
    constructor() {
        this.notesTextarea = document.getElementById('notesTextarea');
        this.currentDate = null;
        this.currentNoteId = null;
        this.saveDebounceTimer = null;
        this.debounceDelay = 500;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.notesTextarea.addEventListener('input', (e) => {
            this.debouncedSave(e.target.value);
        });
    }

    debouncedSave(content) {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }

        this.saveDebounceTimer = setTimeout(() => {
            this.saveNotes(content);
        }, this.debounceDelay);
    }

    // Generate stable ID: note_YYYY-MM-DD
    getNoteId(date) {
        const dateKey = date.toISOString().split("T")[0];
        return `note_${dateKey}`;
    }

    async loadNotesForDay(day, date) {
        this.currentDate = date;
        this.currentNoteId = this.getNoteId(date);

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

    // Метод для немедленного сохранения (например, при закрытии приложения)
    async forceSave() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }
        await this.saveNotes(this.notesTextarea.value);
    }
}

const notesSidebar = new NotesSidebar();
export { notesSidebar };