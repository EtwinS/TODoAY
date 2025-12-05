const modal = document.getElementById('modal');
const openButton = document.getElementById('openModal');
const createButton = document.getElementById('closeModal'); // Это кнопка "Create/Save"
const deleteButton = document.getElementById('deleteTaskBtn');
const addSubtaskBtn = document.getElementById('addSubtaskBtn');
const subtasksWrapper = document.querySelector('.subtasks-wrapper');

let currentEditingTaskId = null;

// Generate unique ID for subtask
function generateSubtaskId() {
    return "subtask_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

// Extract subtasks from DOM
export function extractSubtasks() {
    const subtaskElements = document.querySelectorAll('.subtask-input-item');
    const subtasks = [];

    subtaskElements.forEach(el => {
        const input = el.querySelector('.subtask-input');
        const checkbox = el.querySelector('.subtask-edit-checkbox');
        const idSpan = el.querySelector('[data-subtask-id]');
        
        const title = input ? input.value.trim() : el.querySelector('.subtask-display-title')?.textContent.trim() || '';
        
        if (title) {
            subtasks.push({
                id: idSpan?.dataset.subtaskId || generateSubtaskId(),
                title: title,
                completed: !!(checkbox && checkbox.checked),
                open: true
            });
        }
    });

    return subtasks;
}

// Create subtask element
function createSubtaskElement(subtask = null) {
    const subtaskId = subtask?.id || generateSubtaskId();
    const container = document.createElement('div');
    container.className = 'subtask-input-item';
    container.innerHTML = `
        <div data-subtask-id="${subtaskId}">
            <input 
                type="checkbox" 
                class="subtask-edit-checkbox" 
                ${subtask?.completed ? 'checked' : ''}
            />
            <input 
                type="text" 
                class="subtask-input" 
                placeholder="Add subtask..."
                value="${subtask?.title ? escapeHtml(subtask.title) : ''}"
            />
            <button type="button" class="subtask-delete-btn" aria-label="Delete subtask">✕</button>
        </div>
    `;

    const input = container.querySelector('.subtask-input');
    const deleteBtn = container.querySelector('.subtask-delete-btn');

    input.addEventListener('blur', () => {
        if (input.value.trim()) {
            convertToDisplay(container, input.value.trim(), subtask?.completed || false);
        } else {
            container.remove();
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });

    deleteBtn.addEventListener('click', () => {
        container.remove();
    });

    // autofocus only if element is attached (defensive)
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 0);

    return container;
}

// Convert subtask to display mode
function convertToDisplay(container, title, completed) {
    const idSpan = container.querySelector('[data-subtask-id]');
    const subtaskId = idSpan ? idSpan.dataset.subtaskId : generateSubtaskId();
    
    container.innerHTML = `
        <div data-subtask-id="${subtaskId}">
            <input 
                type="checkbox" 
                class="subtask-edit-checkbox" 
                ${completed ? 'checked' : ''}
            />
            <span class="subtask-display-title">${escapeHtml(title)}</span>
            <button type="button" class="subtask-delete-btn" aria-label="Delete subtask">✕</button>
        </div>
    `;

    const displayTitle = container.querySelector('.subtask-display-title');
    const deleteBtn = container.querySelector('.subtask-delete-btn');
    const checkbox = container.querySelector('.subtask-edit-checkbox');

    displayTitle.addEventListener('click', () => {
        convertToInput(container, title, checkbox.checked);
    });

    deleteBtn.addEventListener('click', () => {
        container.remove();
    });

    checkbox.addEventListener('change', () => {
        // state updated in DOM; when modal saves we will read checkboxes via extractSubtasks()
    });
}

// Convert subtask to input mode
function convertToInput(container, title, completed) {
    const idSpan = container.querySelector('[data-subtask-id]');
    const subtaskId = idSpan ? idSpan.dataset.subtaskId : generateSubtaskId();
    
    container.innerHTML = `
        <div data-subtask-id="${subtaskId}">
            <input 
                type="checkbox" 
                class="subtask-edit-checkbox" 
                ${completed ? 'checked' : ''}
            />
            <input 
                type="text" 
                class="subtask-input" 
                value="${escapeHtml(title)}"
            />
            <button type="button" class="subtask-delete-btn" aria-label="Delete subtask">✕</button>
        </div>
    `;

    const input = container.querySelector('.subtask-input');
    const deleteBtn = container.querySelector('.subtask-delete-btn');

    input.addEventListener('blur', () => {
        if (input.value.trim()) {
            convertToDisplay(container, input.value.trim(), completed);
        } else {
            container.remove();
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });

    deleteBtn.addEventListener('click', () => {
        container.remove();
    });

    setTimeout(() => { try { input.focus(); input.select(); } catch (e) {} }, 0);
}

// Simple HTML escape to avoid injecting markup in values
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Add subtask button handler
if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const subtaskEl = createSubtaskElement();
        subtasksWrapper.appendChild(subtaskEl);
    });
}

// open button - create new task
if (openButton) {
    openButton.addEventListener('click', () => {
        if (modal.open) {
            modal.close();
            openButton.classList.remove('active');
            // reset state
            currentEditingTaskId = null;
            if (createButton) createButton.textContent = "Create";
            if (deleteButton) deleteButton.style.display = "none";
        } else {
            currentEditingTaskId = null;
            if (deleteButton) deleteButton.style.display = "none";
            const titleEl = document.getElementById("taskTitle");
            const descEl = document.getElementById("taskDescription");
            if (titleEl) titleEl.value = "";
            if (descEl) descEl.value = "";
            if (subtasksWrapper) subtasksWrapper.innerHTML = "";
            if (createButton) createButton.textContent = "Create";
            modal.showModal();
            openButton.classList.add('active');
        }
    });
}

// When user clicks Save/Create in modal — dispatch event with data for task.js
if (createButton) {
    createButton.addEventListener('click', async () => {
        const titleEl = document.getElementById("taskTitle");
        const descEl = document.getElementById("taskDescription");
        const title = titleEl ? titleEl.value.trim() : "";
        const description = descEl ? descEl.value.trim() : "";
        const subtasks = extractSubtasks();
        const taskDate = window.getSelectedDate ? window.getSelectedDate() : new Date();

        if (!title) {
            alert("Please enter task title");
            return;
        }

        if (currentEditingTaskId) {
            // update
            const detail = {
                id: currentEditingTaskId,
                title,
                description,
                subtasks,
                taskDate: taskDate
            };
            document.dispatchEvent(new CustomEvent('task:update', { detail }));
            // keep modal open until task.js closes it via closeModal()
        } else {
            // create
            const detail = {
                title,
                description,
                subtasks,
                taskDate: taskDate
            };
            document.dispatchEvent(new CustomEvent('task:save', { detail }));
            // keep modal open until task.js closes it
        }
    });
}

// Delete button dispatches delete event
if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
        if (!currentEditingTaskId) {
            alert("Cannot delete: task is not selected");
            return;
        }

        if (!confirm("Delete this task?")) return;

        document.dispatchEvent(new CustomEvent('task:delete', { detail: { id: currentEditingTaskId } }));
    });
}

// Close modal on background click
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.close();
            openButton.classList.remove('active');
            // reset UI state
            currentEditingTaskId = null;
            if (createButton) createButton.textContent = "Create";
            if (deleteButton) deleteButton.style.display = "none";
        }
    });
}

// Export for task.js to use
export function openModalForEdit(taskId, title, description, subtasks = []) {
    currentEditingTaskId = taskId;
    if (deleteButton) deleteButton.style.display = "block";
    const titleEl = document.getElementById("taskTitle");
    const descEl = document.getElementById("taskDescription");
    if (titleEl) titleEl.value = title || "";
    if (descEl) descEl.value = description || "";
    
    if (subtasksWrapper) subtasksWrapper.innerHTML = "";
    subtasks.forEach(subtask => {
        const el = createSubtaskElement(subtask);
        // Show in display mode
        convertToDisplay(el, subtask.title, !!subtask.completed);
        subtasksWrapper.appendChild(el);
    });

    if (createButton) createButton.textContent = "Save";
    modal.showModal();
    openButton.classList.add('active');
}

export function closeModal() {
    try {
        modal.close();
    } catch (e) {
        // ignore if already closed
    }
    openButton.classList.remove('active');
    currentEditingTaskId = null;
    if (createButton) createButton.textContent = "Create";
    if (deleteButton) deleteButton.style.display = "none";
}