import { createTask, editTask, loadTasks } from "./task.js";

const modal = document.getElementById('modal');
const openButton = document.getElementById('openModal');
const createButton = document.getElementById('closeModal');

// Store current editing task ID
let currentEditingTaskId = null;

openButton.addEventListener('click', () => {
  currentEditingTaskId = null;
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  modal.showModal();
});

createButton.addEventListener('click', async () => {
  if (currentEditingTaskId) {
    await editTask(currentEditingTaskId);
  } else {
    await createTask();
  }
});

// Close modal on background click
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.close();
  }
});

// Export for task.js to use
export function openModalForEdit(taskId, title, description) {
  currentEditingTaskId = taskId;
  document.getElementById("taskTitle").value = title;
  document.getElementById("taskDescription").value = description;
  modal.showModal();
}

export function closeModal() {
  modal.close();
}
