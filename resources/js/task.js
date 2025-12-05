import { openModalForEdit, closeModal } from "./modal.js";

// Хранилище для всех задач в памяти
let allTasks = [];

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
        title,
        description,
        createdAt: taskDate.toISOString(),
        completed: false,
        subtasks: subtasks
    };

    try {
        const result = await db.addTask(title, description);
        
        if (!result.success) {
            console.error("Error saving task:", result.error);
            return;
        }
        
        console.log("Task saved:", result);
        loadTasks(taskDate);
        closeModal();
    } catch (err) {
        console.error("Error saving task:", err);
    }
}

// Update existing task
export async function updateTaskById(taskId, data) {
    try {
        const updates = {
            title: data.title?.trim(),
            description: data.description?.trim(),
            subtasks: data.subtasks,
            updatedAt: new Date().toISOString()
        };

        const result = await db.updateTask(taskId, updates);
        
        if (!result.success) {
            console.error("Error updating task:", result.error);
            return;
        }

        console.log("Task updated:", result);
        
        // Получаем обновленную задачу для определения даты
        const taskResult = await db.getTask(taskId);
        if (taskResult.success && taskResult.task) {
            loadTasks(new Date(taskResult.task.createdAt));
        }
        
        closeModal();
    } catch (err) {
        console.error("Error updating task:", err);
    }
}

// Soft-delete task
export async function markTaskDeleted(taskId) {
    try {
        const result = await db.updateTask(taskId, { deleted: true });
        
        if (!result.success) {
            console.error("Error deleting task:", result.error);
            return;
        }

        console.log("Task deleted:", result);
        
        // Перезагружаем текущие задачи
        loadTasks();
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
            await db.updateTask(task._id, {
                completed: e.target.checked,
                updatedAt: new Date().toISOString()
            });

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
                <img src="${task.subtasks[0]?.open === false 
                    ? '/assets/icons/triangleFill.png' 
                    : '/assets/icons/triangle.png'}" 
                alt="Toggle" 
                class="toggle-icon">
            </span>
        </div>
        <div class="task-subtasks-list"></div>
        ${task.description ? `<p class="task-desc">${task.description}</p>` : ""}
    `;

    updateTaskProgress(item, progress);

    const checkboxInput = item.querySelector(".task-main-checkbox");

    item.addEventListener("click", (e) => {
        if (
            e.target.tagName === "INPUT" ||
            e.target.closest(".task-subtasks-list") ||
            e.target.closest(".task-subtasks-toggle")
        ) {
            return;
        }

        openModalForEdit(
            task._id,
            task.title,
            task.description,
            task.subtasks || []
        );
    });

    checkboxInput.addEventListener("change", async (e) => {
        try {
            await db.updateTask(task._id, {
                completed: e.target.checked,
                subtasks: (task.subtasks || []).map(st => ({
                    ...st,
                    completed: e.target.checked
                })),
                updatedAt: new Date().toISOString()
            });

            loadTasks(new Date(task.createdAt));
        } catch (err) {
            console.error("Error updating task:", err);
        }
    });

    const subtasksContainer = item.querySelector(".task-subtasks-list");
    subtasksContainer.style.display =
        task.subtasks[0]?.open === false ? "none" : "flex";

    task.subtasks.forEach((subtask) => {
        const subtaskEl = document.createElement("div");
        subtaskEl.className = "task-subtask-item";

        subtaskEl.innerHTML = `
            <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? "checked" : ""} />
            <span class="subtask-title">${subtask.title}</span>
        `;

        subtaskEl
            .querySelector(".subtask-checkbox")
            .addEventListener("change", async (e) => {
                try {
                    const updatedSubtasks = task.subtasks.map(st =>
                        st.id === subtask.id 
                            ? { ...st, completed: e.target.checked }
                            : st
                    );

                    const newProgress = getSubtaskProgress(updatedSubtasks);
                    const allDone = updatedSubtasks.every(st => st.completed);

                    await db.updateTask(task._id, {
                        completed: allDone,
                        subtasks: updatedSubtasks,
                        updatedAt: new Date().toISOString()
                    });

                    updateTaskProgress(item, newProgress);
                    checkboxInput.checked = allDone;
                } catch (err) {
                    console.error("Error updating subtask:", err);
                }
            });

        subtasksContainer.appendChild(subtaskEl);
    });

    const toggleBtn = item.querySelector(".task-subtasks-toggle");
    toggleBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const openNow = subtasksContainer.style.display === "flex";
        subtasksContainer.style.display = openNow ? "none" : "flex";

        const indicator = toggleBtn.querySelector(".toggle-indicator img");
        if (indicator) {
            indicator.src = openNow
                ? "/assets/icons/triangleFill.png"
                : "/assets/icons/triangle.png";
            indicator.alt = openNow ? "Развернуть" : "Свернуть";
        }

        try {
            await db.updateTask(task._id, {
                subtasks: (task.subtasks || []).map(st => ({
                    ...st,
                    open: !openNow
                })),
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error("Error updating open state:", err);
        }
    });

    return item;
}

export async function loadTasks(filterDate = null) {
    const container = document.getElementById("taskContainer");
    if (!container) return;
    container.innerHTML = "";

    try {
        const result = await db.getAllTasks();
        
        if (!result.success || !result.tasks) {
            console.error("Error loading tasks:", result.error);
            const emptyMsg = document.createElement("div");
            emptyMsg.className = "empty-message";
            emptyMsg.textContent = "Error loading tasks";
            container.appendChild(emptyMsg);
            return;
        }

        let tasks = result.tasks
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
        allTasks = tasks;

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
window.addEventListener('DOMContentLoaded', () => {
    // Задержка чтобы дождаться инициализации db
    setTimeout(() => loadTasks(), 500);
});