/**
 * Hamburger Menu & Settings Panel Functionality
 * This script manages the hamburger menu, settings panel, and column visibility toggles
 */

// Column definitions for the mission table
const tableColumns = [
  { id: 'item', label: 'Item', defaultVisible: true },
  { id: 'amount', label: 'Amount', defaultVisible: true },
  { id: 'payment', label: 'Payment', defaultVisible: true },
  { id: 'faction', label: 'Faction', defaultVisible: true },
  { id: 'planet', label: 'Planet', defaultVisible: true },
  { id: 'info', label: 'Info', defaultVisible: true },
  { id: 'produced', label: 'Produced', defaultVisible: true },
  { id: 'loaded', label: 'Loaded', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true }
];

// Initialize settings when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  initHamburgerMenu();
  initColumnToggles();
  initResetButton();
  initLongPressConfig();
  applyColumnVisibility();
  initVersionDisplay();
  initRefreshCacheButton();
});

// Initialize the hamburger menu functionality
function initHamburgerMenu() {
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsOverlay = document.getElementById('settingsOverlay');
  
  // Toggle settings panel when hamburger is clicked
  hamburgerMenu.addEventListener('click', function() {
    hamburgerMenu.classList.toggle('active');
    settingsPanel.classList.toggle('active');
    settingsOverlay.classList.toggle('active');
  });
  
  // Close settings when clicking outside
  settingsOverlay.addEventListener('click', function() {
    hamburgerMenu.classList.remove('active');
    settingsPanel.classList.remove('active');
    settingsOverlay.classList.remove('active');
  });
}

// Create column visibility toggle switches
function initColumnToggles() {
  const container = document.getElementById('columnToggleContainer');
  
  // Clear existing toggles
  container.innerHTML = '';
  
  // Create toggle for each column
  tableColumns.forEach(column => {
    // Get saved visibility or use default
    const isVisible = getColumnVisibility(column.id, column.defaultVisible);
    
    // Create toggle element
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-setting';
    
    const label = document.createElement('label');
    label.textContent = column.label;
    label.htmlFor = `column-toggle-${column.id}`;
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `column-toggle-${column.id}`;
    input.checked = isVisible;
    input.addEventListener('change', function() {
      // Save new visibility setting
      saveColumnVisibility(column.id, this.checked);
      // Apply changes to the table
      applyColumnVisibility();
    });
    
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    
    toggleSwitch.appendChild(input);
    toggleSwitch.appendChild(slider);
    
    toggleDiv.appendChild(label);
    toggleDiv.appendChild(toggleSwitch);
    
    container.appendChild(toggleDiv);
  });
}

// Save column visibility setting to localStorage
function saveColumnVisibility(columnId, isVisible) {
  // Get existing settings or create empty object
  const settings = JSON.parse(localStorage.getItem('seatColumnSettings') || '{}');
  
  // Update setting for this column
  settings[columnId] = isVisible;
  
  // Save back to localStorage
  localStorage.setItem('seatColumnSettings', JSON.stringify(settings));
}

// Get column visibility setting from localStorage
function getColumnVisibility(columnId, defaultValue) {
  const settings = JSON.parse(localStorage.getItem('seatColumnSettings') || '{}');
  return settings[columnId] !== undefined ? settings[columnId] : defaultValue;
}

// Apply column visibility settings to the mission table
function applyColumnVisibility() {
  const table = document.querySelector('.missions-table');
  if (!table) return; // Table not yet created
  
  // Get headers and set their visibility
  const headers = table.querySelectorAll('th');
  tableColumns.forEach((column, index) => {
    if (index < headers.length) {
      const isVisible = getColumnVisibility(column.id, column.defaultVisible);
      headers[index].style.display = isVisible ? '' : 'none';
    }
  });
  
  // Set visibility for cells in each row
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    if (row.querySelector('th')) return; // Skip header row
    
    const cells = row.querySelectorAll('td');
    tableColumns.forEach((column, index) => {
      if (index < cells.length) {
        const isVisible = getColumnVisibility(column.id, column.defaultVisible);
        cells[index].style.display = isVisible ? '' : 'none';
      }
    });
  });
}

// Initialize the reset columns button
function initResetButton() {
  const resetBtn = document.getElementById('resetColumnsBtn');
  
  resetBtn.addEventListener('click', function() {
    // Reset all columns to their default visibility
    tableColumns.forEach(column => {
      saveColumnVisibility(column.id, column.defaultVisible);
    });
    
    // Update toggle switches to match defaults
    tableColumns.forEach(column => {
      const toggle = document.getElementById(`column-toggle-${column.id}`);
      if (toggle) {
        toggle.checked = column.defaultVisible;
      }
    });
    
    // Apply changes to table
    applyColumnVisibility();
  });
}

// Initialize long press duration configuration
function initLongPressConfig() {
  const slider = document.getElementById('longpressDuration');
  const display = document.getElementById('durationDisplay');
  
  // Load saved duration or use default
  const savedDuration = getLongPressDuration();
  slider.value = savedDuration;
  updateDurationDisplay(savedDuration);
  
  // Update display and save when slider changes
  slider.addEventListener('input', function() {
    const duration = parseInt(this.value);
    updateDurationDisplay(duration);
    saveLongPressDuration(duration);
    
    // Update the global long press duration if it exists
    if (window.updateLongPressDuration) {
      window.updateLongPressDuration(duration);
    }
  });
}

// Update the duration display text
function updateDurationDisplay(duration) {
  const display = document.getElementById('durationDisplay');
  const seconds = (duration / 1000).toFixed(1);
  display.textContent = `${seconds} seconds`;
}

// Save long press duration to localStorage
function saveLongPressDuration(duration) {
  localStorage.setItem('seatLongPressDuration', duration.toString());
}

// Get long press duration from localStorage
function getLongPressDuration() {
  const saved = localStorage.getItem('seatLongPressDuration');
  return saved ? parseInt(saved) : 500; // Default to 500ms
}

// Initialize version display
function initVersionDisplay() {
  fetchVersionInfo().then(version => {
    const versionContainer = document.getElementById('versionInfo');
    if (version && versionContainer) {
      versionContainer.textContent = version;
    }
  }).catch(error => {
    console.log('Could not load version info:', error);
    // Silently fail - version info is not critical
  });
}

// Fetch version information from SEAT-Version.js
async function fetchVersionInfo() {
  try {
    // Parse the version data from the global variable
    if (typeof versionDataString !== 'undefined') {
      const versionData = JSON.parse(versionDataString);
      return versionData.version;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

// Initialize cache refresh button
function initRefreshCacheButton() {
  const refreshBtn = document.getElementById('refreshCacheBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      // Show confirmation dialog
      const confirmed = confirm(
        'This will refresh the page and clear browser cache to ensure you have the latest version.\n\n' +
        'Any unsaved data will be lost. Continue?'
      );
      
      if (confirmed) {
        // Force hard refresh by adding timestamp to URL and reloading
        try {
          // Clear browser cache (where supported)
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                caches.delete(name);
              });
            });
          }
          
          // Force hard refresh with cache bypass
          const currentUrl = window.location.href.split('?')[0];
          const timestamp = new Date().getTime();
          const refreshUrl = `${currentUrl}?cache_bust=${timestamp}`;
          
          // Use location.replace to prevent back button issues
          window.location.replace(refreshUrl);
          
        } catch (error) {
          console.warn('Cache clearing not fully supported, performing hard refresh');
          // Fallback: standard hard refresh
          window.location.reload(true);
        }
      }
    });
  }
}

// Export function to get current duration for use in other scripts
window.getLongPressDuration = getLongPressDuration;
