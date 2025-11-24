import { createTask, editTask, loadTasks } from "./task.js";

const modal = document.getElementById('modal');
const openButton = document.getElementById('openModal');
const createButton = document.getElementById('closeModal');

// Store current editing task ID
let currentEditingTaskId = null;

openButton.addEventListener('click', () => {
  if (modal.open) {
    // Close modal if it's already open
    modal.close();
    openButton.classList.remove('active');
  } else {
    // Open modal if it's closed
    currentEditingTaskId = null;
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDescription").value = "";
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

// Close modal on background click
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.close();
    openButton.classList.remove('active');
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
