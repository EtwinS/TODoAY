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
saveButton.addEventListener('click', () => {
  // Collect form values
  const username = document.getElementById('optionsUsername').value;
  const password = document.getElementById('optionsPassword').value;
  const url = document.getElementById('optionsUrl').value;

  // Create options object
  const optionsData = {
    username: username,
    password: password,
    url: url,
    timestamp: new Date().toISOString()
  };

  // Output to console for now
  console.log('Options saved:', optionsData);

  // TODO: Implement actual saving logic here
  // This is where you would:
  // 1. Send the data to a backend server
  // 2. Save to local storage
  // 3. Save to a database
  // 4. Validate the data before saving
  // 5. Handle errors and display success/error messages

  // Close the modal after saving
  optionsModal.close();
  isOptionsOpen = false;

  // Clear form fields (optional)
  document.getElementById('optionsUsername').value = '';
  document.getElementById('optionsPassword').value = '';
  document.getElementById('optionsUrl').value = '';
});
