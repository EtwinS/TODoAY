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
            const result = await db.getTask(this.currentNoteId);
            
            if (result.success && result.task) {
                this.notesTextarea.value = result.task.content || "";
                console.log("Loaded:", this.currentNoteId);
            } else {
                // No note for this day yet
                this.notesTextarea.value = "";
                console.log("No note found for this day.");
            }
        } catch (err) {
            console.error("Error loading note:", err);
            this.notesTextarea.value = "";
        }
    }

    async saveNotes(content) {
        if (!this.currentDate) return;

        const noteId = this.currentNoteId || this.getNoteId(this.currentDate);

        try {
            // Пытаемся получить существующую заметку
            const getResult = await db.getTask(noteId);
            
            if (getResult.success && getResult.task) {
                // Заметка существует, обновляем
                const updateResult = await db.updateTask(noteId, {
                    content: content,
                    updatedAt: new Date().toISOString()
                });
                
                if (updateResult.success) {
                    console.log("Saved:", noteId);
                } else {
                    console.error("Error updating note:", updateResult.error);
                }
            } else {
                // Заметка не существует, создаём новую
                const addResult = await db.addTask(
                    `Note for ${this.getNoteId(this.currentDate).replace("note_", "")}`,
                    content
                );
                
                if (addResult.success) {
                    console.log("Created and saved:", noteId);
                    // Обновляем id если изменился
                    this.currentNoteId = addResult.id;
                } else {
                    console.error("Error creating note:", addResult.error);
                }
            }
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