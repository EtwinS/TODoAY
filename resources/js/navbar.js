import { loadTasks } from "./task.js";
import { notesSidebar } from "./notesSidebar.js";

// State management
let currentDate = new Date();
let selectedDate = new Date();
let daysArray = [];

// Day names
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Initialize navbar on load
function initializeNavbar() {
  generateDaysArray();
  renderDays();
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

// Generate array of 7 days centered on selected date
function generateDaysArray() {
  daysArray = [];
  const centerDate = new Date(selectedDate);
  
  // Generate 3 days before, current day, and 3 days after
  for (let i = -3; i <= 3; i++) {
    const date = new Date(centerDate);
    date.setDate(date.getDate() + i);
    daysArray.push(new Date(date));
  }
}

// Format date for comparison (YYYY-MM-DD)
function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

// Check if date is today
function isToday(date) {
  const today = new Date();
  return formatDateKey(date) === formatDateKey(today);
}

// Render days in navbar
function renderDays() {
  const container = document.getElementById("daysContainer");
  container.innerHTML = "";
  
  daysArray.forEach((date, index) => {
    const dayElement = document.createElement("span");
    dayElement.className = "day";
    dayElement.dataset.date = formatDateKey(date);
    dayElement.dataset.index = index;
    
    // Center day (index 3 out of 7)
    if (index === 3) {
      dayElement.classList.add("center");
    }
    
    // Active day (selected date)
    if (formatDateKey(date) === formatDateKey(selectedDate)) {
      dayElement.classList.add("active");
    }
    
    // Display day name or "TODAY" if it's today
    if (isToday(date)) {
      dayElement.textContent = "TODAY";
    } else {
      dayElement.textContent = dayNames[date.getDay()];
    }
    
    dayElement.addEventListener("click", () => selectDay(date));
    container.appendChild(dayElement);
  });
}

// Select a day and shift carousel
function selectDay(date) {
  selectedDate = new Date(date);
  generateDaysArray();
  renderDays();
  updateDateTime();
  loadTasks(selectedDate);
  notesSidebar.loadNotesForDay(
    dayNames[selectedDate.getDay()],
    selectedDate
  );
}

// Navigate carousel left (past)
function navigatePast() {
  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  selectDay(prevDate);
}

// Navigate carousel right (future)
function navigateFuture() {
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  selectDay(nextDate);
}

// Update date and time display
function updateDateTime() {
  const dateStr = selectedDate.toLocaleDateString("en-GB").replace(/\//g, ".");
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  document.getElementById("date").textContent = dateStr;
  document.getElementById("time").textContent = timeStr;
}

// Get selected date for task creation
export function getSelectedDate() {
  return new Date(selectedDate);
}

// Load tasks for specific day
export function loadTasksForDay(date) {
  selectedDate = new Date(date);
  generateDaysArray();
  renderDays();
  loadTasks(selectedDate);
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  initializeNavbar();
  // Load notes for today on app start
  notesSidebar.loadNotesForDay(
    dayNames[selectedDate.getDay()],
    selectedDate
  );
});

// Export navigation functions
export { navigatePast, navigateFuture };
