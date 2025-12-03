import { localDB } from "./pouchDB.js";
import { openModalForEdit, closeModal } from "./modal.js"; // modal.js теперь только экспортирует UI функции, не вызывает DB funcs

// Generate unique ID for subtask
function generateSubtaskId() {
    return "subtask_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

// Save a new task given data (used by event listener)
export async function saveNewTask(data) {
    const title = data.title?.trim();
    const description = data.description?.trim() || "";
    const taskDate = data.taskDate instanceof Date ? data.taskDate : new Date(data.taskDate || Date.now());
    const subtasks = data.subtasks || [];

    if (!title) {
        console.warn("saveNewTask: empty title");
        return;
    }

    const task = {
        _id: "task_" + new Date().getTime() + "_" + Math.random().toString(36).substring(2, 8),
        title,
        description,
        createdAt: taskDate.toISOString(),
        updatedAt: new Date().toISOString(),
        completed: false,
        deleted: false,
        subtasks: subtasks
    };

    try {
        await localDB.put(task);
        console.log("Task saved:", task);
        // Ask UI to reload tasks for that date
        loadTasks(taskDate);
        // ask modal to close (UI)
        closeModal();
    } catch (err) {
        console.error("Error saving task:", err);
    }
}

// Update existing task
export async function updateTaskById(taskId, data) {
    try {
        const task = await localDB.get(taskId);
        task.title = data.title?.trim() || task.title;
        task.description = data.description?.trim() ?? task.description;
        task.subtasks = data.subtasks ?? task.subtasks;
        task.updatedAt = new Date().toISOString();
        await localDB.put(task);
        console.log("Task updated:", task);

        loadTasks(new Date(task.createdAt));
        closeModal();
    } catch (err) {
        console.error("Error updating task:", err);
    }
}

// Soft-delete task
export async function markTaskDeleted(taskId) {
    try {
        const task = await localDB.get(taskId);
        task.deleted = true;
        task.updatedAt = new Date().toISOString();
        await localDB.put(task);
        console.log("Task deleted:", task);
        loadTasks(new Date(task.createdAt));
        closeModal();
    } catch (err) {
        console.error("Error deleting task:", err);
    }
}

// Calculate subtask completion percentage
function getSubtaskProgress(subtasks) {
    if (!subtasks || subtasks.length === 0) return 0;
    const completed = subtasks.filter(st => st.completed).length;
    return Math.round((completed / subtasks.length) * 100);
}

// Update progress bar visual
function updateTaskProgress(taskItemElement, progress) {
    const fill = taskItemElement.querySelector('.task-progress-fill');
    if (!fill) return;
    
    fill.style.width = progress + "%";
    
    if (progress === 100) {
        fill.style.backgroundColor = "#bbbbbbff";
    } else if (progress > 0) {
        fill.style.backgroundColor = "#A2A59D";
    } else {
        fill.style.backgroundColor = "";
    }

    const txt = taskItemElement.querySelector('.progress-text');
    if (txt) txt.textContent = progress + "%";
}

function renderSimpleTask(task) {
    const item = document.createElement("div");
    item.className = "simple-task";

    item.innerHTML = `
        <div class="task-status">
            <input type="checkbox" class="task-main-checkbox" ${task.completed ? "checked" : ""} />
        </div>

        <div class="task-text">
            <p>${task.title}</p>
        </div>
    `;

    const checkbox = item.querySelector(".task-main-checkbox");
    checkbox.addEventListener("change", async (e) => {
        try {
            const fresh = await localDB.get(task._id);
            fresh.completed = e.target.checked;
            fresh.updatedAt = new Date().toISOString();
            await localDB.put(fresh);

            loadTasks(new Date(task.createdAt));
        } catch (err) {
            console.error("Error updating simple task:", err);
        }
    });

    item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            openModalForEdit(task._id, task.title, task.description, task.subtasks || []);
        }
    });

    return item;
}

function renderTaskWithSubtasks(task) {
    const item = document.createElement("div");
    item.className = "task-with-subtasks";

    const progress = getSubtaskProgress(task.subtasks);

    item.innerHTML = `
        <div class="task-text">
            <p>${task.title}</p>
        </div>
        <div class="task-status">
            <input type="checkbox" class="task-main-checkbox" ${task.completed ? "checked" : ""} />
        </div>
        <div class="task-progress">
            <div class="task-progress-fill" style="width: ${progress}%"></div>
            <div class="progress-text">${progress}%</div>
        </div>
        <div class="task-subtasks-toggle">
            <span class="toggle-indicator">
                <img src="${task.subtasks[0]?.open === false ? '/assets/icons/triangleFill.png' : '/assets/icons/triangle.png'}" alt="Toggle" class="toggle-icon">
            </span>
        </div>
    `;

    updateTaskProgress(item, progress);

    const checkboxInput = item.querySelector(".task-main-checkbox");

    // Prevent clicks inside subtasks from opening modal (we'll handle below)
    item.addEventListener('click', (e) => {
        // If click on input or inside subtasks list or on toggle, ignore opening
        if (e.target.tagName === 'INPUT' || e.target.closest('.task-subtasks-list') || e.target.closest('.task-subtasks-toggle')) {
            return;
        }
        openModalForEdit(task._id, task.title, task.description, task.subtasks || []);
    });

    // MAIN CHECKBOX (affects all subtasks)
    checkboxInput.addEventListener("change", async (e) => {
        try {
            const fresh = await localDB.get(task._id);
            fresh.completed = e.target.checked;
            fresh.subtasks.forEach(st => st.completed = e.target.checked);
            fresh.updatedAt = new Date().toISOString();
            await localDB.put(fresh);

            loadTasks(new Date(task.createdAt));
        } catch (err) {
            console.error("Error updating task:", err);
        }
    });

    // SUBTASK LIST
    const subtasksContainer = document.createElement("div");
    subtasksContainer.className = "task-subtasks-list";
    subtasksContainer.style.display = task.subtasks[0]?.open === false ? "none" : "flex";

    task.subtasks.forEach(subtask => {
        const subtaskEl = document.createElement("div");
        subtaskEl.className = "task-subtask-item";

        subtaskEl.innerHTML = `
            <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? "checked" : ""} />
            <span class="subtask-title">${subtask.title}</span>
        `;

        subtaskEl.querySelector(".subtask-checkbox").addEventListener("change", async (e) => {
            try {
                const fresh = await localDB.get(task._id);
                const targetSubtask = fresh.subtasks.find(st => st.id === subtask.id);
                if (targetSubtask) {
                    targetSubtask.completed = e.target.checked;
                }

                const newProgress = getSubtaskProgress(fresh.subtasks);
                const allDone = fresh.subtasks.every(st => st.completed);

                fresh.completed = allDone;
                fresh.updatedAt = new Date().toISOString();
                await localDB.put(fresh);

                updateTaskProgress(item, newProgress);
                checkboxInput.checked = allDone;

            } catch (err) {
                console.error("Error updating subtask:", err);
            }
        });

        subtasksContainer.appendChild(subtaskEl);
    });

    // Toggle open/close
    const toggleBtn = item.querySelector(".task-subtasks-toggle");
    toggleBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const openNow = subtasksContainer.style.display === "flex";
        subtasksContainer.style.display = openNow ? "none" : "flex";
        
        const indicator = toggleBtn.querySelector(".toggle-indicator img");
        if (indicator) {
            if (openNow) {
                indicator.src = "/assets/icons/triangleFill.png";
                indicator.alt = "Развернуть";
            } else {
                indicator.src = "/assets/icons/triangle.png";
                indicator.alt = "Свернуть";
            }
        }

        try {
            const fresh = await localDB.get(task._id);
            fresh.subtasks.forEach(st => st.open = !openNow);
            fresh.updatedAt = new Date().toISOString();
            await localDB.put(fresh);
        } catch (err) {
            console.error("Error updating open state:", err);
        }
    });

    item.appendChild(subtasksContainer);

    return item;
}

export async function loadTasks(filterDate = null) {
    const container = document.getElementById("taskContainer");
    if (!container) return;
    container.innerHTML = "";

    try {
        const result = await localDB.allDocs({ include_docs: true });
        let tasks = result.rows
            .map(row => row.doc)
            .filter(doc => {
                if (doc.deleted) return false;
                if (doc.type === "note") return false;
                if (doc.type === "weeklySummary") return false;
                return doc._id && doc._id.startsWith("task_");
            });

        if (filterDate) {
            const filterDateKey = filterDate instanceof Date 
                ? filterDate.toISOString().split('T')[0]
                : new Date(filterDate).toISOString().split('T')[0];
            
            tasks = tasks.filter(task => {
                const taskDateKey = new Date(task.createdAt).toISOString().split('T')[0];
                return taskDateKey === filterDateKey;
            });
        }

        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (tasks.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.className = "empty-message";
            emptyMsg.textContent = "No tasks for this day";
            container.appendChild(emptyMsg);
            return;
        }

        tasks.forEach(task => {
            const item = task.subtasks && task.subtasks.length > 0 
                ? renderTaskWithSubtasks(task) 
                : renderSimpleTask(task);

            container.appendChild(item);
        });

    } catch (err) {
        console.error("Error loading tasks:", err);
    }
}

/* Event-driven bridge: слушаем события из modal.js */
document.addEventListener('task:save', async (e) => {
    await saveNewTask(e.detail);
});

document.addEventListener('task:update', async (e) => {
    const { id, ...data } = e.detail;
    await updateTaskById(id, data);
});

document.addEventListener('task:delete', async (e) => {
    await markTaskDeleted(e.detail.id);
});

window.loadTasks = loadTasks;
window.addEventListener('DOMContentLoaded', () => loadTasks(new Date()));
