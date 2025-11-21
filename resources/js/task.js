import { localDB } from "./pouchDB.js";

export async function createTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();

    if (!title) {
        alert("Please enter task title");
        return;
    }

    const task = {
        _id: "task_" + new Date().getTime() + "_" + Math.random().toString(36).substring(2,8),
        title,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completed: false,
        deleted: false
    };

    try {
        const response = await localDB.put(task);
        console.log("Task saved:", response);

        // очистка полей
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDescription").value = "";

        // закрыть модалку
        document.getElementById("modal").close();

        // обновить UI (функция создадим позже)
        if (window.loadTasks) {
            loadTasks();
        }

    } catch (err) {
        console.error("Error saving task:", err);
    }
}

export async function loadTasks() {
    const container = document.getElementById("taskContainer");
    container.innerHTML = ""; // очистить старый вывод

    try {
        const result = await localDB.allDocs({ include_docs: true });
        const tasks = result.rows.map(row => row.doc).filter(doc => !doc.deleted);

        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-item";

            item.innerHTML = `
                <div class="task-status">
                    <input type="checkbox" ${task.completed ? "checked" : ""} />
                </div>

                <div class="task-text">
                    <p>${task.title}</p>
                    <!-- <p>${task.description || ""}</p> -->
                </div> 
            `;

            // обработчик галочки
            item.querySelector("input").addEventListener("change", async (e) => {
                try {
                    const fresh = await localDB.get(task._id); // получаем актуальную версию
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
window.addEventListener('DOMContentLoaded', loadTasks)