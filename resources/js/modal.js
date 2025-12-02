import { createTask, editTask, loadTasks, deleteTask } from "./task.js";

const modal = document.getElementById('modal');
const openButton = document.getElementById('openModal');
const createButton = document.getElementById('closeModal');
const deleteButton = document.getElementById('deleteTaskBtn');
const addSubtaskBtn = document.getElementById('addSubtaskBtn');
const subtasksWrapper = document.querySelector('.subtasks-wrapper');

// Store current editing task ID
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
        
        const title = input ? input.value.trim() : el.querySelector('.subtask-display-title')?.textContent || '';
        
        if (title) {
            subtasks.push({
                id: idSpan?.dataset.subtaskId || generateSubtaskId(),
                title: title,
                completed: checkbox ? checkbox.checked : false,
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
                value="${subtask?.title || ''}"
            />
            <button class="subtask-delete-btn">✕</button>
        </div>
    `;

    const input = container.querySelector('.subtask-input');
    const deleteBtn = container.querySelector('.subtask-delete-btn');

    // On blur - convert to display mode
    input.addEventListener('blur', () => {
        if (input.value.trim()) {
            convertToDisplay(container, input.value.trim(), subtask?.completed || false);
        } else {
            container.remove();
        }
    });

    // On enter - blur to trigger conversion
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });

    // Delete button
    deleteBtn.addEventListener('click', () => {
        container.remove();
    });

    // Focus on input
    input.focus();

    return container;
}

// Convert subtask to display mode
function convertToDisplay(container, title, completed) {
    const idSpan = container.querySelector('[data-subtask-id]');
    const subtaskId = idSpan.dataset.subtaskId;
    
    container.innerHTML = `
        <div data-subtask-id="${subtaskId}">
            <input 
                type="checkbox" 
                class="subtask-edit-checkbox" 
                ${completed ? 'checked' : ''}
            />
            <span class="subtask-display-title">${title}</span>
            <button class="subtask-delete-btn">✕</button>
        </div>
    `;

    const displayTitle = container.querySelector('.subtask-display-title');
    const deleteBtn = container.querySelector('.subtask-delete-btn');
    const checkbox = container.querySelector('.subtask-edit-checkbox');

    // Click on title to edit
    displayTitle.addEventListener('click', () => {
        convertToInput(container, title, completed);
    });

    // Delete button
    deleteBtn.addEventListener('click', () => {
        container.remove();
    });

    // Checkbox toggle
    checkbox.addEventListener('change', () => {
        // Checkbox state is already changed
    });
}

// Convert subtask to input mode
function convertToInput(container, title, completed) {
    const idSpan = container.querySelector('[data-subtask-id]');
    const subtaskId = idSpan.dataset.subtaskId;
    
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
                value="${title}"
            />
            <button class="subtask-delete-btn">✕</button>
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

    input.focus();
    input.select();
}

// Add subtask button handler
addSubtaskBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const subtaskEl = createSubtaskElement();
    subtasksWrapper.appendChild(subtaskEl);
});

openButton.addEventListener('click', () => {
    if (modal.open) {
        // Close modal if it's already open
        modal.close();
        openButton.classList.remove('active');
    } else {
        // Open modal if it's closed
        currentEditingTaskId = null;
        deleteButton.style.display = "none";
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDescription").value = "";
        subtasksWrapper.innerHTML = "";
        modal.showModal();
        openButton.classList.add('active');
    }
});

createButton.addEventListener('click', async () => {
    if (currentEditingTaskId) {
        await editTask(currentEditingTaskId);
    } else {
        await createTask();
    }
});

deleteButton.addEventListener("click", async () => {
    if (!currentEditingTaskId) {
        alert("Cannot delete: task is not selected");
        return;
    }

    await deleteTask(currentEditingTaskId);
});

// Close modal on background click
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.close();
        openButton.classList.remove('active');
    }
});

// Export for task.js to use
export function openModalForEdit(taskId, title, description, subtasks = []) {
    currentEditingTaskId = taskId;
    deleteButton.style.display = "block";
    document.getElementById("taskTitle").value = title;
    document.getElementById("taskDescription").value = description;
    
    // Clear and populate subtasks
    subtasksWrapper.innerHTML = "";
    subtasks.forEach(subtask => {
        const el = createSubtaskElement(subtask);
        convertToDisplay(el, subtask.title, subtask.completed);
        subtasksWrapper.appendChild(el);
    });

    modal.showModal();
    openButton.classList.add('active');
}

export function closeModal() {
    modal.close();
    openButton.classList.remove('active');
}