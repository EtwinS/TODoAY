import { localDB } from "./pouchDB.js";

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

class WeeklyReview {
  constructor() {
    this.modal = document.getElementById('weeklyReviewModal');
    this.openButton = document.getElementById('openWeeklyReview');
    this.closeButton = document.getElementById('openModal');
    this.currentWeekStart = this.getWeekStart(new Date());
    this.currentDayIndex = 1; // Monday = 1
    this.summaryTextarea = document.getElementById('weekSummaryTextarea');
    this.summaryDebounceTimer = null;
    this.debounceDelay = 500;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.openButton.addEventListener('click', () => this.openModal());
    this.closeButton.addEventListener('click', () => this.closeModal());

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.open) {
        this.closeModal();
      }
    });

    // Navigation arrows
    document.getElementById('prevDayBtn').addEventListener('click', () => this.previousDay());
    document.getElementById('nextDayBtn').addEventListener('click', () => this.nextDay());

    // Summary textarea
    this.summaryTextarea.addEventListener('input', (e) => {
      this.debouncedSaveSummary(e.target.value);
    });
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;

    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  formatDate(date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().split('T')[0];
  }

  formatDateRange() {
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startDay = String(this.currentWeekStart.getDate()).padStart(2, '0');
    const endDay = String(weekEnd.getDate()).padStart(2, '0');
    
    return `${startDay} - ${endDay}`;
  }

  async getTasksStats() {
    const stats = {};
    
    // Initialize stats for each day of the week (Monday-Sunday)
    for (let i = 1; i <= 7; i++) {
      const dayDate = new Date(this.currentWeekStart);
      dayDate.setDate(dayDate.getDate() + i - 1);
      const dateKey = this.formatDate(dayDate);
      
      stats[dateKey] = {
        total: 0,
        completed: 0,
        percentage: 0
      };
    }

    try {
      const result = await localDB.allDocs({ include_docs: true });
      const tasks = result.rows
        .map(row => row.doc)
        .filter(doc => {
          if (doc.deleted) return false;
          if (doc.type !== undefined && doc.type !== "task") return false;
          return doc._id && doc._id.startsWith("task_");
        });

      // Group tasks by date and calculate stats
      tasks.forEach(task => {
        const taskDateKey = this.formatDate(new Date(task.createdAt));
        
        if (stats[taskDateKey]) {
          stats[taskDateKey].total++;
          if (task.completed) {
            stats[taskDateKey].completed++;
          }
        }
      });

      // Calculate percentages
      for (const dateKey in stats) {
        if (stats[dateKey].total > 0) {
          stats[dateKey].percentage = Math.round(
            (stats[dateKey].completed / stats[dateKey].total) * 100
          );
        }
      }
    } catch (err) {
      console.error("Error loading tasks stats:", err);
    }

    return stats;
  }

  async renderStatsTable() {
    const stats = await this.getTasksStats();
    const tbody = document.querySelector('.weekly-stats-body');
    
    if (!tbody) {
      console.warn('Stats table body not found');
      return;
    }

    tbody.innerHTML = '';

    // Row 1: Created tasks count
    const createdRow = document.createElement('tr');
    createdRow.innerHTML = '<td class="weekly-stats-label">Поставленно</td>';
    
    for (let i = 1; i <= 7; i++) {
      const dayDate = new Date(this.currentWeekStart);
      dayDate.setDate(dayDate.getDate() + i - 1);
      const dateKey = this.formatDate(dayDate);
      const cell = document.createElement('td');
      cell.textContent = stats[dateKey].total;
      cell.className = 'weekly-stats-cell';
      createdRow.appendChild(cell);
    }
    tbody.appendChild(createdRow);

    // Row 2: Completed tasks count
    const completedRow = document.createElement('tr');
    completedRow.innerHTML = '<td class="weekly-stats-label">Выполнено</td>';
    
    for (let i = 1; i <= 7; i++) {
      const dayDate = new Date(this.currentWeekStart);
      dayDate.setDate(dayDate.getDate() + i - 1);
      const dateKey = this.formatDate(dayDate);
      const cell = document.createElement('td');
      cell.textContent = stats[dateKey].completed;
      cell.className = 'weekly-stats-cell';
      completedRow.appendChild(cell);
    }
    tbody.appendChild(completedRow);

    // Row 3: Completion percentage
    const percentageRow = document.createElement('tr');
    percentageRow.innerHTML = '<td class="weekly-stats-label">%</td>';
    
    for (let i = 1; i <= 7; i++) {
      const dayDate = new Date(this.currentWeekStart);
      dayDate.setDate(dayDate.getDate() + i - 1);
      const dateKey = this.formatDate(dayDate);
      const cell = document.createElement('td');
      cell.textContent = stats[dateKey].percentage + '%';
      cell.className = 'weekly-stats-cell';
      percentageRow.appendChild(cell);
    }
    tbody.appendChild(percentageRow);
  }

  async openModal() {
    this.currentWeekStart = this.getWeekStart(new Date());
    this.currentDayIndex = 1; // Reset to Monday
    
    document.getElementById('weekRangeText').textContent = this.formatDateRange();
    
    await this.renderStatsTable();
    await this.loadLastWeekSummary();
    await this.loadCurrentWeekSummary();
    await this.displayDayNotes();
    
    this.modal.showModal();
  }

  closeModal() {
    this.modal.close();
  }

  async previousDay() {
    console.log('Current index BEFORE:', this.currentDayIndex);
    if (this.currentDayIndex > 1) {
      this.currentDayIndex--;
      console.log('Current index AFTER:', this.currentDayIndex);
      await this.displayDayNotes();
    }
  }

  async nextDay() {
    if (this.currentDayIndex < 7) {
      this.currentDayIndex++;
      await this.displayDayNotes();
    }
  }

  async displayDayNotes() {
    const dayDate = new Date(this.currentWeekStart);
    dayDate.setDate(dayDate.getDate() + this.currentDayIndex - 1);
    
    const dayName = dayNames[this.currentDayIndex - 1];
    const notesContainer = document.getElementById('weeklyNotes');
    
    document.getElementById('weekDayName').textContent = dayName;
    
    try {
      const noteId = `note_${this.formatDate(dayDate)}`;
      const doc = await localDB.get(noteId);
      notesContainer.textContent = doc.content || "No notes for this day";
    } catch (err) {
      if (err.status === 404) {
        notesContainer.textContent = "No notes for this day";
      } else {
        console.error("Error loading notes:", err);
      }
    }
  }

  async loadLastWeekSummary() {
    const lastWeekStart = new Date(this.currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const weekKey = this.formatDate(lastWeekStart);
    
    const summaryContainer = document.getElementById('lastWeekSummary');
    
    try {
      const result = await localDB.allDocs({ include_docs: true });
      const summary = result.rows
        .map(row => row.doc)
        .find(doc => doc.type === 'weeklySummary' && doc.weekStart === weekKey);
      
      if (summary && summary.content) {
        summaryContainer.textContent = summary.content;
      } else {
        summaryContainer.textContent = "No summary for last week";
      }
    } catch (err) {
      console.error("Error loading last week summary:", err);
      summaryContainer.textContent = "Error loading summary";
    }
  }

  async loadCurrentWeekSummary() {
    const weekKey = this.formatDate(this.currentWeekStart);
    
    try {
      const result = await localDB.allDocs({ include_docs: true });
      const summary = result.rows
        .map(row => row.doc)
        .find(doc => doc.type === 'weeklySummary' && doc.weekStart === weekKey);
      
      if (summary && summary.content) {
        this.summaryTextarea.value = summary.content;
      } else {
        this.summaryTextarea.value = "";
      }
    } catch (err) {
      console.error("Error loading current week summary:", err);
    }
  }

  debouncedSaveSummary(content) {
    if (this.summaryDebounceTimer) {
      clearTimeout(this.summaryDebounceTimer);
    }

    this.summaryDebounceTimer = setTimeout(() => {
      this.saveSummary(content);
    }, this.debounceDelay);
  }

  async saveSummary(content) {
    const weekKey = this.formatDate(this.currentWeekStart);
    const summaryId = `weeklySummary_${weekKey}`;

    try {
      let doc;

      try {
        doc = await localDB.get(summaryId);
        doc.content = content;
        doc.updatedAt = new Date().toISOString();
      } catch (err) {
        if (err.status === 404) {
          doc = {
            _id: summaryId,
            type: 'weeklySummary',
            weekStart: weekKey,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        } else {
          throw err;
        }
      }

      await localDB.put(doc);
      console.log("Saved weekly summary:", summaryId);
    } catch (err) {
      console.error("Error saving summary:", err);
    }
  }
}

const weeklyReview = new WeeklyReview();
export { weeklyReview };
