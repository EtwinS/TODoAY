import { setWeeklyReviewDay } from "./navbar.js";

const optionsModal = document.getElementById('optionsModal');
const settingsButton = document.getElementById('settingsButton');
const saveButton = document.getElementById('saveOptions');

// Store current state of options modal
let isOptionsOpen = false;

// Load options when modal opens
async function loadOptions() {
  try {
    const result = await db.getTask('settings');
    
    if (result.success && result.task) {
      const settings = result.task;
      document.getElementById('optionsUsername').value = settings.username || '';
      document.getElementById('optionsPassword').value = settings.password || '';
      document.getElementById('optionsUrl').value = settings.url || '';
      
      // Set date if weekly review day exists
      if (settings.weeklyReviewDay !== undefined) {
        const date = new Date();
        // Find next occurrence of this day of week
        const currentDay = date.getDay();
        let daysToAdd = settings.weeklyReviewDay - currentDay;
        if (daysToAdd < 0) {
          daysToAdd += 7;
        }
        const reviewDate = new Date(date);
        reviewDate.setDate(reviewDate.getDate() + daysToAdd);
        
        const dateString = reviewDate.toISOString().split('T')[0];
        document.getElementById('dayWeeklyReview').value = dateString;
      }
    }
  } catch (err) {
    console.log('No existing settings found:', err);
  }
}

// Open Options modal when settings button is clicked
settingsButton.addEventListener('click', async () => {
  await loadOptions();
  optionsModal.showModal();
  isOptionsOpen = true;
});

// Close modal on background click
optionsModal.addEventListener('click', (e) => {
  if (e.target === optionsModal) {
    optionsModal.close();
    isOptionsOpen = false;
  }
});

// Save button functionality
saveButton.addEventListener('click', async () => {
  const username = document.getElementById('optionsUsername').value;
  const password = document.getElementById('optionsPassword').value;
  const url = document.getElementById('optionsUrl').value;
  const weeklyReviewDate = document.getElementById('dayWeeklyReview').value;

  const weeklyReviewDayIndex = weeklyReviewDate
    ? new Date(weeklyReviewDate).getDay()
    : 0; // Default to Sunday

  try {
    // Пытаемся получить существующие настройки
    const getResult = await db.getTask('settings');
    
    if (getResult.success && getResult.task) {
      // Настройки существуют, обновляем
      const updateResult = await db.updateTask('settings', {
        username: username,
        password: password,
        url: url,
        timestamp: new Date().toISOString(),
        weeklyReviewDay: weeklyReviewDayIndex
      });
      
      if (updateResult.success) {
        console.log('Options saved successfully');
      } else {
        console.error('Error updating options:', updateResult.error);
      }
    } else {
      // Настройки не существуют, создаём новые
      const addResult = await db.addTask('Settings', 'Application settings');
      
      if (addResult.success) {
        // Обновляем с нужными полями
        await db.updateTask(addResult.id, {
          username: username,
          password: password,
          url: url,
          timestamp: new Date().toISOString(),
          weeklyReviewDay: weeklyReviewDayIndex
        });
        
        console.log('Options created and saved successfully');
      } else {
        console.error('Error creating options:', addResult.error);
      }
    }
    
    // Update navbar with new weekly review day
    setWeeklyReviewDay(weeklyReviewDayIndex);
  } catch (error) {
    console.error('Error saving options to database:', error);
  }

  optionsModal.close();
  isOptionsOpen = false;

  // Clear form fields (optional)
  document.getElementById('optionsUsername').value = '';
  document.getElementById('optionsPassword').value = '';
  document.getElementById('optionsUrl').value = '';
  document.getElementById('dayWeeklyReview').value = '';
});