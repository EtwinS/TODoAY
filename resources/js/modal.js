import { createTask } from "./task.js";

const modal = document.getElementById('modal');
const openButton = document.getElementById('opneModal');
const createButton = document.getElementById('closeModal');

openButton.addEventListener('click', () => {
  modal.showModal();
});

createButton.addEventListener('click', createTask);
