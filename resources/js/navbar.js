function updateDateTime() {
  const now = new Date();

  const date = now.toLocaleDateString("en-GB").replace(/\//g, ".");
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  document.getElementById("date").textContent = date;
  document.getElementById("time").textContent = time;
}

updateDateTime();
setInterval(updateDateTime, 1000);

// Выбор дня
document.querySelectorAll(".day").forEach(day => {
  day.addEventListener("click", () => {
    document.querySelectorAll(".day").forEach(d => d.classList.remove("active"));
    day.classList.add("active");

    const selected = day.dataset.day;

    // Здесь обновляется состояние и подгружаются задачи
    loadTasksForDay(selected);
  });
});

function loadTasksForDay(day) {
  console.log("Loading tasks for:", day);
}
