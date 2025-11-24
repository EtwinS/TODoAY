import { localDB } from "./pouchDB.js";
import { openModalForEdit, closeModal } from "./modal.js";
import { getSelectedDate } from "./navbar.js";

export async function createTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();

    if (!title) {
        alert("Please enter task title");
        return;
    }

    // Use selected date from navbar, not current date
    const taskDate = getSelectedDate();

    const task = {
        _id: "task_" + new Date().getTime() + "_" + Math.random().toString(36).substring(2, 8),
        title,
        description,
        createdAt: taskDate.toISOString(),
        updatedAt: new Date().toISOString(),
        completed: false,
        deleted: false
    };

    try {
        await localDB.put(task);
        console.log("Task saved:", task);

        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDescription").value = "";

        closeModal();
        loadTasks(taskDate);

    } catch (err) {
        console.error("Error saving task:", err);
    }
}

export async function editTask(taskId) {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();

    if (!title) {
        alert("Please enter task title");
        return;
    }

    try {
        const task = await localDB.get(taskId);
        task.title = title;
        task.description = description;
        task.updatedAt = new Date().toISOString();
        await localDB.put(task);
        console.log("Task updated:", task);

        closeModal();
        loadTasks(task.createdAt ? new Date(task.createdAt) : new Date());

    } catch (err) {
        console.error("Error updating task:", err);
    }
}

export async function loadTasks(filterDate = null) {
    const container = document.getElementById("taskContainer");
    container.innerHTML = "";

    try {
        const result = await localDB.allDocs({ include_docs: true });
        let tasks = result.rows
            .map(row => row.doc)
            .filter(doc => !doc.deleted && doc.type !== "note");

        // Filter by date if provided
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
            const item = document.createElement("div");
            item.className = "task-item";

            item.innerHTML = `
                <div class="task-status">
                    <input type="checkbox" ${task.completed ? "checked" : ""} />
                </div>

                <div class="task-text">
                    <p>${task.title}</p>
                </div> 
            `;

            // Click to edit
            item.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    openModalForEdit(task._id, task.title, task.description);
                }
            });

            // Checkbox handler
            item.querySelector("input").addEventListener("change", async (e) => {
                try {
                    const fresh = await localDB.get(task._id);
                    fresh.completed = e.target.checked;
                    fresh.updatedAt = new Date().toISOString();
                    await localDB.put(fresh);
                } catch (err) {
                    console.error("Error updating task:", err);
                }
            });

            container.appendChild(item);
        });

    } catch (err) {
        console.error("Error loading tasks:", err);
    }
}

window.loadTasks = loadTasks;
window.addEventListener('DOMContentLoaded', () => loadTasks(new Date()));