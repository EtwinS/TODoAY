import { localDB } from "./pouchDB.js";
import { setWeeklyReviewDay } from "./navbar.js";

const optionsModal = document.getElementById('optionsModal');
const settingsButton = document.getElementById('settingsButton');
const saveButton = document.getElementById('saveOptions');


// Store current state of options modal
let isOptionsOpen = false;

// Open Options modal when settings button is clicked
settingsButton.addEventListener('click', () => {
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

  const optionsData = {
    _id: 'settings', // Required by PouchDB
    username: username,
    password: password,
    url: url,
    timestamp: new Date().toISOString(),
    weeklyReviewDay: weeklyReviewDayIndex
  };

  try {
    // Try to get existing document to preserve _rev
    let existingDoc;
    try {
      existingDoc = await localDB.get('settings');
      optionsData._rev = existingDoc._rev;
    } catch (e) {
      // Document doesn't exist yet, that's fine
    }
    
    await localDB.put(optionsData);
    
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
