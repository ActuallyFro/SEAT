// SEAT Application Logic

// Initialize the application state
window.SJFI_storageKey = 'SEAT-DATA';

window.SJFI_data = {
  missions: {}
};

// Global array to track LongPress instances for updating duration
window.longPressInstances = [];

// ── Export tracking ──────────────────────────────────────────────────────────
var LAST_EXPORT_KEY       = 'seatLastExportTime';
var UNEXPORTED_CHG_KEY    = 'seatUnexportedChanges';
var CHANGE_WARN_THRESHOLD = 5;
var TIME_WARN_MINUTES     = 15;
var _exportSnoozeUntil    = 0;   // epoch ms; 0 = not snoozed; Infinity = dismissed for session
var _exportTimerID        = null;

function getUnexportedChanges() {
  return Math.max(0, parseInt(localStorage.getItem(UNEXPORTED_CHG_KEY) || '0', 10));
}

function getLastExportTime() {
  return parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10);
}

// delta: +1 for C/U/D operations, -1 when restoring a completed mission
function incrementChangeCounter(delta) {
  if (delta === undefined) delta = 1;
  var n = getUnexportedChanges() + delta;
  if (n < 0) n = 0;
  localStorage.setItem(UNEXPORTED_CHG_KEY, String(n));
  updateExportStatusBar();
}

function resetExportTracking() {
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  localStorage.setItem(UNEXPORTED_CHG_KEY, '0');
  _exportSnoozeUntil = 0;
  var toast = document.getElementById('exportTimeWarning');
  if (toast) toast.style.display = 'none';
  updateExportStatusBar();
}

function updateExportStatusBar() {
  var changes = getUnexportedChanges();
  var lastTs  = getLastExportTime();

  // Keep legacy #backupWarning (inside collapsed Admin section) in sync
  var legacyEl = document.getElementById('backupWarning');
  if (legacyEl) legacyEl.style.display = changes > 0 ? '' : 'none';

  var container = document.getElementById('exportContainer');
  var bar       = document.getElementById('exportStatusBar');
  if (!bar) return;

  if (changes === 0) {
    if (container) container.style.display = 'none';
    return;
  }

  // Format last-export age
  var lastExportText;
  if (lastTs > 0) {
    var minsAgo = Math.floor((Date.now() - lastTs) / 60000);
    if (minsAgo < 1)        lastExportText = 'just now';
    else if (minsAgo === 1) lastExportText = '1 min ago';
    else                    lastExportText = minsAgo + ' min ago';
  } else {
    lastExportText = 'never';
  }

  var isHighCount = changes > CHANGE_WARN_THRESHOLD;
  bar.className   = 'export-status-bar' + (isHighCount ? ' export-warn-high' : '');

  var textEl = document.getElementById('exportStatusText');
  if (textEl) {
    var icon = isHighCount ? '⚠' : '💾';
    textEl.textContent = icon + '\u00a0' + changes + ' unsaved change' + (changes === 1 ? '' : 's')
                       + ' \u2014 last exported: ' + lastExportText;
  }

  if (container) container.style.display = '';
}

function checkTimeBasedExportWarning() {
  var changes = getUnexportedChanges();
  if (changes === 0) return;

  var now = Date.now();
  if (_exportSnoozeUntil > now) return;

  var lastTs      = getLastExportTime();
  var elapsed     = lastTs > 0 ? (now - lastTs) : Infinity;
  var minsElapsed = elapsed / 60000;

  if (minsElapsed >= TIME_WARN_MINUTES) {
    showTimeWarningToast(Math.round(minsElapsed));
  }
}

function showTimeWarningToast(minsAgo) {
  var toast = document.getElementById('exportTimeWarning');
  if (!toast) return;
  var msgEl = document.getElementById('exportTimeMsg');
  if (msgEl) {
    var timeText = (minsAgo >= 60)
      ? (Math.floor(minsAgo / 60) + 'h ' + (minsAgo % 60) + 'm')
      : (minsAgo + ' min');
    msgEl.textContent = '⏰ ' + timeText + ' since last export — browser storage is not permanent!';
  }
  toast.style.display = '';
}

function snoozeExportWarning() {
  _exportSnoozeUntil = Date.now() + (TIME_WARN_MINUTES * 60000);
  var toast = document.getElementById('exportTimeWarning');
  if (toast) toast.style.display = 'none';
}

function dismissExportWarning() {
  _exportSnoozeUntil = Infinity; // suppress for entire session
  var toast = document.getElementById('exportTimeWarning');
  if (toast) toast.style.display = 'none';
}

function startExportReminderTimer() {
  if (_exportTimerID) clearInterval(_exportTimerID);
  _exportTimerID = setInterval(function() {
    updateExportStatusBar();
    checkTimeBasedExportWarning();
  }, 60000); // check every 60 s
  checkTimeBasedExportWarning(); // immediate check on load
}

// ── Aliases so all existing markDataDirty()/markDataClean() call sites still work ──
function markDataDirty() { incrementChangeCounter(1); }
function markDataClean()  { resetExportTracking(); }
function checkBackupState() {
  updateExportStatusBar();
  startExportReminderTimer();
}

// Parse the JSON data - jsonDataString is loaded from SEAT-Data.js
const parsedData = JSON.parse(jsonDataString);
window.SE_Data_References = parsedData;

// Event handler when the DOM is fully loaded
window.onload = function() {
  // Initialize editing state
  window.currentlyEditingMission = null;
  
  // Load data from local storage
  loadFormData();
  
  // Initialize form dropdowns
  initializeFormDropdowns();
  
  // Display missions
  reloadTableData();
  
  // Set up event listeners
  setupEventListeners();

  // Show backup reminder if data has changed since last export
  checkBackupState();
};

// Set up all event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById('missionForm').addEventListener('submit', function(event) {
    event.preventDefault();
    storeFormData();
  });

  // Import button
  document.getElementById('import-button').addEventListener('click', function() {
    document.getElementById('import-file').click();
  });

  // Import file change
  document.getElementById('import-file').addEventListener('change', importJSONObjects);

  // Export button
  document.getElementById('export-button').addEventListener('click', JSONExport);

  // Export-status bar: "Export Now" button (count bar)
  var exportNowBtn = document.getElementById('exportNowBtn');
  if (exportNowBtn) exportNowBtn.addEventListener('click', JSONExport);

  // Time-warning toast buttons
  var exportNowBtn2   = document.getElementById('exportNowBtn2');
  var exportSnoozeBtn = document.getElementById('exportSnoozeBtn');
  var exportDismissBtn = document.getElementById('exportDismissBtn');
  if (exportNowBtn2)    exportNowBtn2.addEventListener('click', JSONExport);
  if (exportSnoozeBtn)  exportSnoozeBtn.addEventListener('click', snoozeExportWarning);
  if (exportDismissBtn) exportDismissBtn.addEventListener('click', dismissExportWarning);

  // Clear storage button
  document.getElementById('clear-storage').addEventListener('click', clearLocalStorage);

  // Cancel edit button
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);

  // GPS copy buttons in the form
  setupGPSCopyButtons();

  // Stepper +/- buttons for Amount and Payment
  setupStepperButtons();

  // Auto-fill GPS when known station/base name is selected
  setupGPSAutofill();

  // Contract type toggle buttons
  setupContractTypeSelector();

  // GPS inline copy in the mission table (event delegation)
  const gpsCopyHandler = function(e) {
    const btn = e.target.closest('.gps-inline-btn');
    if (!btn) return;
    e.stopPropagation();
    const gps = btn.dataset.gps || '';
    if (!gps) return;
    const originalText = btn.textContent;
    const doCopy = (text) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(gps).then(() => {
        btn.textContent = '\u2713';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      }).catch(() => {
        doCopy(gps);
        btn.textContent = '\u2713';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      });
    } else {
      doCopy(gps);
      btn.textContent = '\u2713';
      setTimeout(() => { btn.textContent = originalText; }, 1500);
    }
  };
  document.getElementById('current-mission-list').addEventListener('click', gpsCopyHandler);
  const completedListEl = document.getElementById('completed-mission-list');
  if (completedListEl) completedListEl.addEventListener('click', gpsCopyHandler);

  // Set up collapsible sections after all other UI elements are ready
  setupCollapsibleSections();
}

// Setup collapsible sections
function setupCollapsibleSections() {
  // Add collapsible functionality to the "Add Mission" section
  convertToCollapsible('missionForm', 'Add Mission');
  
  // Add collapsible functionality to the "Current Mission List" section
  convertToCollapsible('missionListContainer', 'Current Mission List');

  // Add collapsible functionality to the "Completed Mission List" section
  convertToCollapsible('completedMissionListContainer', 'Completed Mission List');
  
  // Add collapsible functionality to the "Admin Functions" section
  convertToCollapsible('adminFunctionsContainer', 'Admin Functions');
}

// Convert a section to a collapsible panel
function convertToCollapsible(elementId, title) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'collapsible-section';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'collapsible-header';
  
  // Determine if this is an h1 or h3 section title
  const isAdminSection = (title === "Admin Functions");
  
  // Create title element
  const titleElement = document.createElement(isAdminSection ? 'h3' : 'h1');
  titleElement.innerHTML = `<u>${title}</u>`;
  
  // Create toggle icon
  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'toggle-icon';
  toggleIcon.textContent = '−'; // Minus sign (expanded state)
  
  // Append elements
  header.appendChild(titleElement);
  header.appendChild(toggleIcon);
  
  // Create content container
  const content = document.createElement('div');
  content.className = 'collapsible-content';
  
  // Find the original heading and hr elements to replace them
  let targetHr = null;
  let targetHeading = null;
  
  // Find the heading that matches the title
  const headingSelector = isAdminSection ? 'h3' : 'h1';
  const headings = document.querySelectorAll(headingSelector);
  for (const heading of headings) {
    const underline = heading.querySelector('u');
    if (underline && underline.textContent === title) {
      targetHeading = heading;
      // Try to find the hr that precedes this heading
      let prev = heading.previousElementSibling;
      if (prev && prev.tagName === 'HR') {
        targetHr = prev;
      }
      break;
    }
  }
  
  // If we found the elements to replace
  if (targetHeading && targetHr) {
    const parent = targetHeading.parentNode;
    
    // Insert our new components
    parent.insertBefore(wrapper, targetHr);
    
    // Remove the old elements
    parent.removeChild(targetHr);
    parent.removeChild(targetHeading);
    
    // Move the form into the content container
    parent.removeChild(element);
    content.appendChild(element);
  } else {
    // Fallback if we can't find the elements
    const parent = element.parentNode;
    parent.insertBefore(wrapper, element);
    parent.removeChild(element);
    content.appendChild(element);
  }
  
  // Add everything to the wrapper
  wrapper.appendChild(header);
  wrapper.appendChild(content);
  
  // Now the wrapper is ready to be inserted into the page
  
  // Add click event to toggle
  header.addEventListener('click', function() {
    const isCollapsed = content.classList.contains('collapsed');
    if (isCollapsed) {
      // Expand
      content.classList.remove('collapsed');
      wrapper.classList.remove('collapsed');
      toggleIcon.textContent = '−'; // Minus sign
    } else {
      // Collapse
      content.classList.add('collapsed');
      wrapper.classList.add('collapsed');
      toggleIcon.textContent = '+'; // Plus sign
      
      // QoL Enhancement: If this is the "Add Mission" section being collapsed,
      // automatically cancel any active editing state (acts like Cancel button)
      // or soft reset the form if no editing is active
      if (title === 'Add Mission') {
        if (window.currentlyEditingMission) {
          // If editing, do full cancel
          cancelEdit();
        } else {
          // If not editing, do soft reset to preserve planet/faction names
          softResetForm();
        }
        // Always clear item search when collapsing Add Mission section
        clearItemSearch();
      }
    }
  });
  
  // Set initial state based on section type
  if (title === 'Admin Functions') {
    // Admin Functions starts collapsed
    content.classList.add('collapsed');
    wrapper.classList.add('collapsed');
    toggleIcon.textContent = '+';
  } else {
    // Other sections start expanded by default
    content.classList.remove('collapsed');
    wrapper.classList.remove('collapsed');
    toggleIcon.textContent = '−';
  }
}

// ── Contract Type Switch ─────────────────────────────────────────────────────
// Switch the form between Acquisition, Courier, and Hauling modes.
function switchContractType(type) {
  const hidden = document.getElementById('formContractType');
  if (hidden) hidden.value = type;

  // Update active button
  document.querySelectorAll('.contract-type-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  var isTransport = (type === 'courier' || type === 'hauling');

  // Show/hide field groups
  var acqOnly = document.getElementById('acqOnlyFields');
  var transportOnly = document.getElementById('transportOnlyFields');
  if (acqOnly)       acqOnly.style.display       = isTransport ? 'none' : '';
  if (transportOnly) transportOnly.style.display = isTransport ? ''     : 'none';

  // Swap labels: Station Name ↔ Pickup Station
  var stationText = document.getElementById('stationNameLabelText');
  var stationSub  = document.getElementById('stationNameLabelSub');
  var stationGPS  = document.getElementById('stationGPSLabel');
  if (stationText) stationText.textContent = isTransport ? 'Pickup Station'  : 'Station Name';
  if (stationSub)  stationSub.textContent  = isTransport ? ''                : '(optional override)';
  if (stationGPS)  stationGPS.textContent  = isTransport ? 'Pickup GPS:'     : 'Station GPS:';

  // Auto-fill cargo description for courier (always a Package); clear for others
  var cargoEl = document.getElementById('formCargoDescription');
  if (cargoEl) {
    if (type === 'courier') {
      cargoEl.value = 'Package (100Kg)';
      cargoEl.readOnly = true;
    } else {
      cargoEl.readOnly = false;
      if (type !== 'hauling' || cargoEl.value === 'Package (100Kg)') {
        cargoEl.value = '';
      }
    }
  }

  // Swap labels: Player Base ↔ Delivery Point
  var baseText = document.getElementById('playerBaseLabelText');
  var baseSub  = document.getElementById('playerBaseLabelSub');
  var baseGPS  = document.getElementById('playerBaseGPSLabel');
  if (baseText) baseText.textContent = isTransport ? 'Delivery Point' : 'Player Base';
  if (baseSub)  baseSub.textContent  = isTransport ? ''               : '(optional)';
  if (baseGPS)  baseGPS.textContent  = isTransport ? 'Delivery GPS:'  : 'Player Base GPS:';

  // Swap placeholders on text inputs
  var stationInput = document.getElementById('formStationName');
  var baseInput    = document.getElementById('formPlayerBase');
  if (stationInput) stationInput.placeholder = isTransport ? 'e.g. Alpha Station (pickup)'   : 'e.g. FRAC Oberlin Station (overrides faction display)';
  if (baseInput)    baseInput.placeholder    = isTransport ? 'e.g. Home Base (delivery point)' : 'e.g. Hauler Alpha';
}

// Wire click handlers for the contract-type selector buttons.
function setupContractTypeSelector() {
  document.querySelectorAll('.contract-type-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchContractType(this.dataset.type);
    });
  });
}

// Generate <select> options for formAcquisitionItem
function pageSetupFormCreateItemSelectList() {
  const selectElement = document.getElementById("formAcquisitionItem");
  selectElement.innerHTML = ''; // Clear existing options

  Object.keys(window.SE_Data_References.Contract["Acquisition Request Item"]).forEach(category => {
    // Add category as non-selectable header
    const categoryOption = document.createElement("option");
    categoryOption.value = category;
    categoryOption.disabled = true;
    categoryOption.textContent = `--- ${category} ---`;
    selectElement.appendChild(categoryOption);

    // Add items under the category
    const items = SE_Data_References.Contract["Acquisition Request Item"][category];
    Object.keys(items).forEach(item => {
      if (items[item] !== null) {
        const itemOption = document.createElement("option");
        // Don't add suffix for any category
        itemOption.value = `${items[item]}`;
        
        // Store the category as data attribute
        itemOption.setAttribute('data-category', category);
        
        // Show category for items that could appear in multiple categories (like Iron)
        if ((category === "Ores" || category === "Ingots") && 
            items[item].indexOf(category.slice(0, -1)) === -1) {
          itemOption.textContent = `${items[item]} ${category.slice(0, -1)}`;
        } else {
          itemOption.textContent = `${items[item]}`;
        }
        
        selectElement.appendChild(itemOption);
      }
    });
  });
}

// Generate <select> options for Planet dropdown
function pageSetupPlanetSelectList() {
  const selectElement = document.getElementById("formPlanet");
  selectElement.innerHTML = ''; // Clear existing options

  const planets = window.SE_Data_References.Metadata.Planet;
  Object.keys(planets).forEach(planet => {
    if (planet !== "{empty}") {
      const option = document.createElement("option");
      option.value = planets[planet];
      option.textContent = planets[planet];
      selectElement.appendChild(option);
    }
  });
}

// Generate <select> options for Faction First Name dropdown
function pageSetupFactionFirstNameSelectList() {
  const selectElement = document.getElementById("formFirstName");
  selectElement.innerHTML = ''; // Clear existing options

  const factionFirstNameLabel = document.querySelector("label[for='formFirstName']");

  if (factionFirstNameLabel && !factionFirstNameLabel.querySelector(".tooltip-text")) {
    factionFirstNameLabel.classList.add("tooltip-container");
    const tooltip = document.createElement("span");
    tooltip.classList.add("tooltip-text");
    tooltip.textContent = "The first part of the Faction's name (e.g., 'Revolutionary' in 'Revolutionary Artisans'). Helps categorize factions.";
    factionFirstNameLabel.appendChild(tooltip);
  }

  const firstNames = window.SE_Data_References.Metadata.Factions["First Name"];
  Object.keys(firstNames).forEach(name => {
    const option = document.createElement("option");
    option.value = firstNames[name];
    // Display code + name format exactly as in the data
    option.textContent = name;
    option.setAttribute('data-fullname', name);
    selectElement.appendChild(option);
  });
  selectElement.selectedIndex = -1; // start with nothing selected
}

// Generate <select> options for Faction Second Name dropdown
function pageSetupFactionSecondNameSelectList() {
  const secondNameLabel = document.querySelector('label[for="formSecondName"]');
  
  // Add tooltip to the label
  if (secondNameLabel) {
    // Create wrapper with tooltip
    const tooltipContainer = document.createElement('div');
    tooltipContainer.className = 'tooltip-container';
    
    // Clone the existing label text into the container
    tooltipContainer.innerHTML = secondNameLabel.innerHTML;
    
    // Add the tooltip
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip-text';
    tooltip.innerHTML = `
      <strong>Faction Type Guide:</strong><br>
      <br>
      <strong>[B]</strong> - Builder/Industry focused factions<br>
      <strong>[M]</strong> - Mining/Resource focused factions<br>
      <strong>[T]</strong> - Trading/Commerce focused factions<br>
      <strong>[P]</strong> - Pirate factions<br>
      <strong>[Mil]</strong> - Military factions<br>
      <br>
      Select a faction type that matches your mission context.
    `;
    
    tooltipContainer.appendChild(tooltip);
    
    // Replace the label content with our tooltip container
    secondNameLabel.innerHTML = '';
    secondNameLabel.appendChild(tooltipContainer);
  }
  
  const selectElement = document.getElementById("formSecondName");
  selectElement.innerHTML = ''; // Clear existing options

  const secondNames = window.SE_Data_References.Metadata.Factions["Second Name"];
  Object.keys(secondNames).forEach(name => {
    const option = document.createElement("option");
    option.value = secondNames[name];
    // Display name format exactly as in the data
    option.textContent = name;
    option.setAttribute('data-fullname', name);
    selectElement.appendChild(option);
  });
  selectElement.selectedIndex = -1; // start with nothing selected
}

// Initialize all dropdowns
function initializeFormDropdowns() {
  pageSetupFormCreateItemSelectList();
  pageSetupPlanetSelectList();
  pageSetupFactionFirstNameSelectList();
  pageSetupFactionSecondNameSelectList();

  // Set today's date as default
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 10);
  document.getElementById('formDate').value = formattedDate;

  // Initialize searchable custom dropdowns (replaces the old item-search bar)
  initSearchableDropdown('formAcquisitionItem', 'Type to search items…');
  initSearchableDropdown('formFirstName', 'Type to filter first name…', true);
  initSearchableDropdown('formSecondName', 'Type to filter second name…', true);

  // Mission table text search
  setupMissionSearch();

  // Populate known-station / known-base autocomplete lists
  updateKnownStationNames();
  updateKnownPlayerBases();
}

// Setup item search
function setupItemSearch() {
  const searchInput = document.getElementById('itemSearch');
  const clearButton = document.getElementById('itemSearchClear');
  const selectElement = document.getElementById('formAcquisitionItem');
  
  // Toggle clear button visibility based on input content
  function toggleClearButton() {
    if (searchInput.value.length > 0) {
      clearButton.classList.add('visible');
    } else {
      clearButton.classList.remove('visible');
    }
  }
  
  // Clear button click handler
  clearButton.addEventListener('click', function() {
    searchInput.value = '';
    resetOptions();
    toggleClearButton();
    searchInput.focus();
  });
  
  // Show/hide clear button on input
  searchInput.addEventListener('input', toggleClearButton);
  
  // Clear previous options and regenerate full list
  function resetOptions() {
    // Store the current selection if any
    const currentSelection = selectElement.value;
    
    // Clear and regenerate the dropdown
    selectElement.innerHTML = '';
    
    Object.keys(window.SE_Data_References.Contract["Acquisition Request Item"]).forEach(category => {
      // Add category as non-selectable header
      const categoryOption = document.createElement("option");
      categoryOption.value = category;
      categoryOption.disabled = true;
      categoryOption.textContent = `--- ${category} ---`;
      selectElement.appendChild(categoryOption);

      // Add items under the category
      const items = window.SE_Data_References.Contract["Acquisition Request Item"][category];
      Object.keys(items).forEach(item => {
        if (items[item] !== null) {
          const itemOption = document.createElement("option");
          // Don't add category suffix to item name
          itemOption.value = `${items[item]}`;
          itemOption.textContent = `${items[item]}`;
          // IMPORTANT: Set the category attribute
          itemOption.setAttribute('data-category', category);
          selectElement.appendChild(itemOption);
        }
      });
    });
    
    // Restore selection if possible
    if (currentSelection) {
      for (const option of selectElement.options) {
        if (option.value === currentSelection) {
          option.selected = true;
          break;
        }
      }
    }
  }
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    if (!searchTerm) {
      resetOptions();
      return;
    }
    
    // Clear current options
    selectElement.innerHTML = '';
    
    // Filter items from all categories
    let foundItems = false;
    Object.keys(window.SE_Data_References.Contract["Acquisition Request Item"]).forEach(category => {
      const items = window.SE_Data_References.Contract["Acquisition Request Item"][category];
      const matchingItems = [];
      
      // Find matching items in this category
      Object.keys(items).forEach(item => {
        if (items[item] !== null && item.toLowerCase().includes(searchTerm)) {
          matchingItems.push(item);
        }
      });
      
      // Add category header and matching items if any found
      if (matchingItems.length > 0) {
        const categoryOption = document.createElement("option");
        categoryOption.value = category;
        categoryOption.disabled = true;
        categoryOption.textContent = `--- ${category} ---`;
        selectElement.appendChild(categoryOption);
        
        matchingItems.forEach(item => {
          const itemOption = document.createElement("option");
          // Don't add suffix for any category
          itemOption.value = `${items[item]}`;
          itemOption.textContent = `${items[item]}`;
          // IMPORTANT: Set the category attribute for searched items too
          itemOption.setAttribute('data-category', category);
          selectElement.appendChild(itemOption);
        });
        
        foundItems = true;
      }
    });
    
    // If no items found, add a message
    if (!foundItems) {
      const noResultsOption = document.createElement("option");
      noResultsOption.disabled = true;
      noResultsOption.textContent = "No matching items found";
      selectElement.appendChild(noResultsOption);
    }
  });
}

// Setup mission search
function setupMissionSearch() {
  const searchInput = document.getElementById('missionSearch');
  const clearButton = document.getElementById('missionSearchClear');
  
  // Toggle clear button visibility based on input content
  function toggleClearButton() {
    if (searchInput.value.length > 0) {
      clearButton.classList.add('visible');
    } else {
      clearButton.classList.remove('visible');
    }
  }
  
  // Clear button click handler
  clearButton.addEventListener('click', function() {
    searchInput.value = '';
    // Clear the search by triggering the input event
    const inputEvent = new Event('input', { bubbles: true });
    searchInput.dispatchEvent(inputEvent);
    toggleClearButton();
    searchInput.focus();
  });
  
  // Show/hide clear button on input
  searchInput.addEventListener('input', toggleClearButton);
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const table = document.querySelector('#current-mission-list table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    
    // Skip the header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const text = row.textContent.toLowerCase();
      
      if (text.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

// ── Searchable custom dropdown ──────────────────────────────────────────────
// Transforms a <select> inside a .select-wrapper into a type-to-filter combobox.
function initSearchableDropdown(selectId, placeholder, clearable) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const wrapper = select.closest('.select-wrapper');
  if (!wrapper) return;

  // Avoid double-init: if search input already present, just refresh display
  if (wrapper.querySelector('.select-search')) {
    if (select._sdUpdateDisplay) select._sdUpdateDisplay();
    return;
  }

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'select-search';
  searchInput.placeholder = placeholder || 'Search…';
  searchInput.setAttribute('autocomplete', 'off');
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.setAttribute('role', 'combobox');

  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'filtered-options';
  optionsDiv.setAttribute('role', 'listbox');

  wrapper.style.position = 'relative';
  wrapper.insertBefore(searchInput, select);
  wrapper.insertBefore(optionsDiv, select);
  select.style.display = 'none';

  // Optional clear (X) button overlaying the right side of the search input
  if (clearable) {
    wrapper.classList.add('clearable');
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'select-clear-btn';
    clearBtn.textContent = '✕';
    clearBtn.title = 'Clear selection';
    clearBtn.addEventListener('mousedown', e => {
      e.preventDefault();
      select.selectedIndex = -1;
      searchInput.value = '';
      optionsDiv.style.display = 'none';
      searchInput.setAttribute('aria-expanded', 'false');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    wrapper.appendChild(clearBtn);
  }

  let keyboardIndex = -1;

  function getAllOptions() {
    const result = [];
    Array.from(select.options).forEach(opt => {
      if (opt.disabled) {
        result.push({ isGroup: true, label: opt.textContent });
      } else {
        result.push({
          isGroup: false,
          label: opt.textContent,
          value: opt.value,
          dataFullname: opt.getAttribute('data-fullname') || ''
        });
      }
    });
    return result;
  }

  function renderOptions(filter) {
    optionsDiv.innerHTML = '';
    keyboardIndex = -1;
    const lc = (filter || '').toLowerCase().trim();
    const all = getAllOptions();
    let visibleCount = 0;
    let lastGroupEl = null;

    all.forEach(item => {
      if (item.isGroup) {
        lastGroupEl = document.createElement('div');
        lastGroupEl.className = 'option-group';
        lastGroupEl.textContent = item.label;
        optionsDiv.appendChild(lastGroupEl);
      } else {
        if (!lc || item.label.toLowerCase().includes(lc)) {
          const div = document.createElement('div');
          div.textContent = item.label;
          div.dataset.value = item.value;
          if (item.dataFullname) div.dataset.fullname = item.dataFullname;
          if (item.value === select.value) div.classList.add('selected-option');
          div.setAttribute('role', 'option');
          div.addEventListener('mousedown', e => {
            e.preventDefault();
            selectOption(item.value);
          });
          optionsDiv.appendChild(div);
          visibleCount++;
          lastGroupEl = null; // mark group as having items
        }
      }
    });

    // Remove trailing group headers (group with no following items)
    Array.from(optionsDiv.querySelectorAll('.option-group')).forEach(g => {
      const next = g.nextElementSibling;
      if (!next || next.classList.contains('option-group')) g.remove();
    });

    if (visibleCount === 0) {
      const none = document.createElement('div');
      none.className = 'no-results';
      none.textContent = 'No matches';
      optionsDiv.appendChild(none);
    }
  }

  function selectOption(value) {
    select.value = value;
    updateDisplay();
    closeDropdown();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function updateDisplay() {
    const sel = select.options[select.selectedIndex];
    searchInput.value = (sel && !sel.disabled) ? sel.textContent : '';
  }

  function openDropdown() {
    renderOptions(searchInput.value);
    optionsDiv.style.display = 'block';
    searchInput.setAttribute('aria-expanded', 'true');
    keyboardIndex = -1;
  }

  function closeDropdown() {
    optionsDiv.style.display = 'none';
    searchInput.setAttribute('aria-expanded', 'false');
    updateDisplay(); // restore display text if user typed but didn't pick
  }

  function moveKeyboardFocus(delta) {
    const items = Array.from(optionsDiv.querySelectorAll('[role="option"]'));
    if (!items.length) return;
    items.forEach(i => i.classList.remove('keyboard-focus'));
    keyboardIndex = Math.max(0, Math.min(items.length - 1, keyboardIndex + delta));
    items[keyboardIndex].classList.add('keyboard-focus');
    items[keyboardIndex].scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('focus', openDropdown);
  searchInput.addEventListener('input', function() {
    openDropdown();
    renderOptions(this.value);
  });
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveKeyboardFocus(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveKeyboardFocus(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const focused = optionsDiv.querySelector('.keyboard-focus');
      if (focused) selectOption(focused.dataset.value);
      else closeDropdown();
    } else if (e.key === 'Escape') {
      e.preventDefault(); closeDropdown();
    } else if (e.key === 'Tab') {
      closeDropdown();
    }
  });
  searchInput.addEventListener('blur', () => setTimeout(closeDropdown, 150));

  // Expose helpers on the element for external programmatic use
  select._sdUpdateDisplay = updateDisplay;
  select._sdSelectOption = selectOption;
  updateDisplay();
}

// Programmatically set a searchable dropdown's value and refresh its display text.
function setSearchableValue(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.value = value;
  if (select._sdUpdateDisplay) select._sdUpdateDisplay();
}

// Rebuild the #knownStations datalist from all saved mission stationName values.
function updateKnownStationNames() {
  const datalist = document.getElementById('knownStations');
  if (!datalist) return;
  const names = new Set();
  Object.values(window.SJFI_data.missions || {}).forEach(arr =>
    arr.forEach(m => { if (m.stationName) names.add(m.stationName); })
  );
  datalist.innerHTML = '';
  names.forEach(n => { const o = document.createElement('option'); o.value = n; datalist.appendChild(o); });
}

// Rebuild the #knownPlayerBases datalist from all saved mission playerBase values.
function updateKnownPlayerBases() {
  const datalist = document.getElementById('knownPlayerBases');
  if (!datalist) return;
  const names = new Set();
  Object.values(window.SJFI_data.missions || {}).forEach(arr =>
    arr.forEach(m => { if (m.playerBase) names.add(m.playerBase); })
  );
  datalist.innerHTML = '';
  names.forEach(n => { const o = document.createElement('option'); o.value = n; datalist.appendChild(o); });
}

// Attach GPS copy handlers to all .gps-copy-btn elements in the form.
function setupGPSCopyButtons() {
  document.querySelectorAll('.gps-copy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const input = document.getElementById(this.dataset.target);
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      const el = this;
      const onCopied = () => {
        el.classList.add('copied');
        const orig = el.innerHTML;
        el.textContent = '\u2713';
        setTimeout(() => { el.classList.remove('copied'); el.innerHTML = orig; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onCopied).catch(() => {
          legacyCopy(text); onCopied();
        });
      } else {
        legacyCopy(text); onCopied();
      }
    });
  });
}

function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

// Auto-fill GPS fields when a known station name or player base is chosen from the datalist.
function setupGPSAutofill() {
  // Helper: scan missions for the first GPS value matching a given field name/value pair
  function lookupGPS(nameField, gpsField, name) {
    for (const arr of Object.values(window.SJFI_data.missions || {})) {
      for (const m of arr) {
        if (m[nameField] === name && m[gpsField]) return m[gpsField];
      }
    }
    return null;
  }

  const stationNameEl  = document.getElementById('formStationName');
  const stationGPSEl   = document.getElementById('formStationGPS');
  const baseNameEl     = document.getElementById('formPlayerBase');
  const baseGPSEl      = document.getElementById('formPlayerBaseGPS');

  if (stationNameEl && stationGPSEl) {
    stationNameEl.addEventListener('input', function() {
      const name = this.value.trim();
      if (!name || stationGPSEl.value.trim()) return; // don't clobber an existing value
      const found = lookupGPS('stationName', 'stationGPS', name);
      if (found) stationGPSEl.value = found;
    });
  }

  if (baseNameEl && baseGPSEl) {
    baseNameEl.addEventListener('input', function() {
      const name = this.value.trim();
      if (!name || baseGPSEl.value.trim()) return;
      const found = lookupGPS('playerBase', 'playerBaseGPS', name);
      if (found) baseGPSEl.value = found;
    });
  }
}

// Attach +/- click handlers for all .stepper-group elements.
function setupStepperButtons() {
  document.querySelectorAll('.stepper-group').forEach(group => {
    group.addEventListener('click', function(e) {
      const btn = e.target.closest('.stepper-btn');
      if (!btn) return;
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const current = parseInt(input.value, 10) || 0;
      const minVal = parseInt(input.min, 10);
      if (btn.classList.contains('stepper-minus')) {
        const next = current - 1;
        input.value = (!isNaN(minVal) && next < minVal) ? minVal : next;
      } else {
        input.value = current + 1;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

// Save form data
function storeFormData() {
  var contractType = (document.getElementById("formContractType") || {}).value || 'acquisition';
  var isTransport  = (contractType === 'courier' || contractType === 'hauling');

  // Determine storage key: item name for acquisition, [Courier]/[Hauling] for transport
  var itemName = isTransport
    ? (contractType === 'courier' ? '[Courier]' : '[Hauling]')
    : document.getElementById("formAcquisitionItem").value;

  var amountValue  = isTransport ? null : document.getElementById("formAmount").value;
  var paymentValue = document.getElementById("formPayment").value;
  var firstName    = document.getElementById("formFirstName").value;
  var secondName   = document.getElementById("formSecondName").value;
  var planet       = document.getElementById("formPlanet").value;
  var dateAccepted = document.getElementById("formDate").value;
  var description  = document.getElementById("formDescription").value;
  var stationName  = document.getElementById("formStationName")?.value?.trim()  || "";
  var stationGPS   = document.getElementById("formStationGPS")?.value?.trim()   || "";
  var playerBase   = document.getElementById("formPlayerBase")?.value?.trim()   || "";
  var playerBaseGPS= document.getElementById("formPlayerBaseGPS")?.value?.trim()|| "";
  var cargoDescription = document.getElementById("formCargoDescription")?.value?.trim() || "";
  var riskLevel        = isTransport ? (document.getElementById("formRisk")?.value || "Low") : "";
  var distance         = isTransport ? (parseInt(document.getElementById("formDistance")?.value) || 0) : null;

  // ── Validation ───────────────────────────────────────────────────────────
  if (!isTransport) {
    if (!itemName || !amountValue) {
      alert("Please select an acquisition item and specify the amount.");
      return;
    }
  } else {
    if (!cargoDescription) {
      alert("Please enter a cargo description for the " + contractType + " contract.");
      return;
    }
  }

  // Validate amount (acquisition only)
  var numericAmount = 0;
  if (!isTransport) {
    numericAmount = parseInt(amountValue.toString().replace(/\D/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid positive number for the amount.");
      return;
    }
  }

  // Validate payment - ensure it's a non-negative integer or empty
  var numericPayment = 0;
  if (paymentValue && paymentValue.toString().trim() !== '') {
    numericPayment = parseInt(paymentValue.toString().replace(/\D/g, ''));
    if (isNaN(numericPayment) || numericPayment < 0) {
      alert("Please enter a valid non-negative number for payment, or leave it blank for 0.");
      return;
    }
  }

  // Create mission object with all details
  var mission = {
    contractType: contractType,
    amount: contractType === 'courier' ? 1 : (isTransport ? null : numericAmount),
    payment: numericPayment,
    firstName: firstName,
    secondName: secondName,
    planet: planet,
    dateAccepted: dateAccepted,
    description: description,
    produced: false, // Default to not produced
    loaded: false, // Default to not loaded
    completed: false, // Default to not completed
    // Store category information from the actually selected option
    itemCategory: isTransport ? "" : (document.getElementById("formAcquisitionItem").selectedOptions[0]?.getAttribute('data-category') || ""),
    cargoDescription: cargoDescription,
    riskLevel: riskLevel,
    distance: distance,
    firstNameFull: firstName ? document.querySelector(`#formFirstName option[value="${firstName}"]`)?.getAttribute('data-fullname') || "" : "",
    secondNameFull: secondName ? document.querySelector(`#formSecondName option[value="${secondName}"]`)?.getAttribute('data-fullname') || "" : "",
    stationName: stationName,
    stationGPS: stationGPS,
    playerBase: playerBase,
    playerBaseGPS: playerBaseGPS
  };
  
  // Check if we're editing an existing mission or adding a new one
  if (window.currentlyEditingMission) {
    const { itemName: oldItemName, index } = window.currentlyEditingMission;
    
    // Preserve the loaded and produced status from the original mission
    if (window.SJFI_data.missions[oldItemName] && 
        window.SJFI_data.missions[oldItemName][index]) {
      mission.loaded = window.SJFI_data.missions[oldItemName][index].loaded;
      mission.produced = window.SJFI_data.missions[oldItemName][index].produced;
      mission.completed = window.SJFI_data.missions[oldItemName][index].completed || false;
    }
    
    // Remove the original mission
    if (oldItemName === itemName) {
      // Same item type, just update in place
      window.SJFI_data.missions[oldItemName][index] = mission;
    } else {
      // Item type changed, remove from old array and add to new
      window.SJFI_data.missions[oldItemName].splice(index, 1);
      if (window.SJFI_data.missions[oldItemName].length === 0) {
        delete window.SJFI_data.missions[oldItemName];
      }
      
      // Add to new item type array
      if (!window.SJFI_data.missions[itemName]) {
        window.SJFI_data.missions[itemName] = [];
      }
      window.SJFI_data.missions[itemName].push(mission);
    }
    
    // Clear editing state
    window.currentlyEditingMission = null;
    
    // Reset submit button text
    const submitButton = document.querySelector('#missionForm input[type="submit"]');
    submitButton.value = "Add Mission";
    
    // Hide edit mode indicator and cancel button
    document.getElementById('edit-mode-indicator').style.display = 'none';
    document.getElementById('cancel-edit-btn').style.display = 'none';
  } else {
    // Adding a new mission
    if (!window.SJFI_data.missions[itemName]) {
      window.SJFI_data.missions[itemName] = [];
    }
    window.SJFI_data.missions[itemName].push(mission);
  }

  // Soft reset form fields (preserve planet and faction names)
  softResetForm();
  
  reloadTableData();
  storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
  markDataDirty();
  updateKnownStationNames();
  updateKnownPlayerBases();
}

// Load data from localStorage
function loadFormData() {
  let formData = loadJSONObjectsFromKey(window.SJFI_storageKey);

  if (formData !== null) {
    window.SJFI_data = formData;
  }
}

// Find the item's category to create a proper item display name
function getItemWithCategory(itemName, itemCategory) {
  if (itemCategory) {
    if ((itemCategory === "Ores" || itemCategory === "Ingots") &&
        !itemName.includes(itemCategory.slice(0, -1))) {
      return `${itemName} ${itemCategory.slice(0, -1)}`;
    }
    return itemName;
  }
  // CRITICAL: Try Ingots first, then Ores to prioritize Ingots when both exist
  const categoryOrder = ["Ingots", "Ores", "Components", "Tools"];
  for (const category of categoryOrder) {
    const items = window.SE_Data_References.Contract["Acquisition Request Item"][category];
    if (!items) continue;
    for (const item of Object.keys(items)) {
      if (items[item] === itemName) {
        if ((category === "Ores" || category === "Ingots") && !itemName.includes(category.slice(0, -1))) {
          return `${itemName} ${category.slice(0, -1)}`;
        }
        return itemName;
      }
    }
  }
  return itemName;
}

// Display all missions in a table
function displayCurrentMissions() {
  const currentMissionListDiv = document.getElementById("current-mission-list");
  currentMissionListDiv.innerHTML = ""; // Clear existing content
  
  // Clear existing LongPress instances
  if (window.longPressInstances) {
    window.longPressInstances.forEach(instance => {
      if (instance.destroy) {
        instance.destroy();
      }
    });
    window.longPressInstances = [];
  }

  // Check if there are any missions
  if (!window.SJFI_data.missions || Object.keys(window.SJFI_data.missions).length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No missions found. Add a mission using the form above.";
    emptyMessage.style.textAlign = "center";
    currentMissionListDiv.appendChild(emptyMessage);
    return;
  }

  const table = document.createElement("table");
  table.classList.add("missions-table");
  table.id = "missions-table";

  // Add Info column between Date and Actions
  const headers = ["Type", "Item", "Amount", "Payment", "Risk", "Distance (Km)", "Faction/Station", "Player Base/Delivery Point", "Planet", "Info", "Produced", "Loaded", "Actions"];
  const headerRow = document.createElement("tr");
  
  headers.forEach((headerText, index) => {
    const header = document.createElement("th");
    
    // Don't make the Info, Produced, Loaded, and Actions columns sortable
    if (headerText !== "Actions" && headerText !== "Info" && headerText !== "Produced" && headerText !== "Loaded") {
      header.classList.add("sortable");
      header.dataset.sortIndex = index;
      header.innerHTML = `${headerText} <span class="sort-icon">↕</span>`;
      
      // Add click event for sorting
      header.addEventListener('click', function() {
        sortTable(index);
      });
    } else {
      header.textContent = headerText;
      if (headerText === "Info") {
        header.classList.add("info-header");
        header.style.width = "40px"; // Still keeping fixed width for the column
      }
    }
    
    headerRow.appendChild(header);
  });
  
  table.appendChild(headerRow);

  // Add table rows with mission data
  Object.keys(window.SJFI_data.missions).forEach(itemName => {
    const missionsForItem = window.SJFI_data.missions[itemName];
    
    missionsForItem.forEach((mission, index) => {
      // Skip completed missions — they appear in the Completed Mission List
      if (mission.completed) return;

      const row = document.createElement("tr");
      
      // Format the faction name for display
      let factionDisplay = "";
      let factionCode = "";
      if (mission.firstNameFull && mission.secondNameFull) {
        const firstMatch = mission.firstNameFull.match(/\(([^)]+)\)/);
        const secondMatch = mission.secondNameFull.match(/\(([^)]+)\)/);
        const firstCode = firstMatch ? firstMatch[1] : "";
        const secondCode = secondMatch ? secondMatch[1] : "";
        factionCode = `${firstCode}${secondCode}`.substring(0, 4); // FFSS code

        const cleanFirstName = mission.firstNameFull.replace(/\s*\([^)]+\)/g, "").trim();
        const cleanSecondName = mission.secondNameFull.replace(/\s*\([^)]+\)/g, "").trim();
        
        // Desktop: FFSS - Full First Name Full Second Name [Type]
        // Mobile: FFSS
        // The actual switch between mobile/desktop display will be handled by CSS
        factionDisplay = `<span class="faction-full">${factionCode} - ${cleanFirstName} ${cleanSecondName}</span><span class="faction-code">${factionCode}</span>`;
      } else {
        // Fallback if full names are not available (e.g. older data)
        factionDisplay = `${mission.firstName || ""} ${mission.secondName || ""}`;
        factionCode = (mission.firstName || "").substring(0,2) + (mission.secondName || "").substring(0,2);
        factionDisplay = `<span class="faction-full">${factionCode} - ${mission.firstName || ""} ${mission.secondName || ""}</span><span class="faction-code">${factionCode}</span>`;
      }

      // Escape helper for inline HTML
      const escAttr = s => (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      const escText = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

      // Faction/Station cell: if station name is set it overrides the faction display.
      // Hovering the station name shows full faction info as tooltip.
      let factionCellHTML;
      if (mission.stationName) {
        let factionPlain = '';
        if (mission.firstNameFull && mission.secondNameFull) {
          const cf = mission.firstNameFull.replace(/\s*\([^)]+\)/g, '').trim();
          const cs = mission.secondNameFull.replace(/\s*\([^)]+\)/g, '').trim();
          factionPlain = `${factionCode} - ${cf} ${cs}`;
        } else {
          factionPlain = `${mission.firstName || ''} ${mission.secondName || ''}`.trim();
        }
        const stationGpsBtn = mission.stationGPS
          ? ` <button class="gps-inline-btn" data-gps="${escAttr(mission.stationGPS)}" title="Copy station GPS">&#128205;</button>`
          : '';
        factionCellHTML = `<span class="station-name tooltip-container">${escText(mission.stationName)}${stationGpsBtn}<span class="tooltip-text">${escText(factionPlain)}</span></span>`;
      } else {
        factionCellHTML = factionDisplay;
      }

      // Player Base cell
      let playerBaseCellHTML = '';
      if (mission.playerBase) {
        const baseGpsBtn = mission.playerBaseGPS
          ? ` <button class="gps-inline-btn" data-gps="${escAttr(mission.playerBaseGPS)}" title="Copy base GPS">&#128205;</button>`
          : '';
        playerBaseCellHTML = `${escText(mission.playerBase)}${baseGpsBtn}`;
      }

      // Add mission data to the row with proper item name
      const formatNumber = (num) => {
        // Remove all non-numeric characters, then add 1000-comma separation
        const numeric = String(num).replace(/[^\d]/g, '');
        return numeric ? Number(numeric).toLocaleString() : '';
      };

      const missionType = mission.contractType || 'acquisition';
      const isTransportRow = (missionType === 'courier' || missionType === 'hauling');

      // Type cell badge (used in dedicated Type column)
      const typeLabel = missionType.charAt(0).toUpperCase() + missionType.slice(1);
      const typeCellHTML = `<span class="mission-type-badge mission-type-${missionType}">${typeLabel}</span>`;

      const data = [
        '',                    // 0: Type  — rendered as typeCellHTML
        isTransportRow ? '' : getItemWithCategory(itemName, mission.itemCategory), // 1: Item
        isTransportRow ? '' : formatNumber(mission.amount),                        // 2: Amount
        mission.payment ? formatNumber(mission.payment) : '',                      // 3: Payment
        isTransportRow ? (mission.riskLevel || 'Low') : 'N/A',                    // 4: Risk
        isTransportRow ? (mission.distance != null ? formatNumber(mission.distance) : '') : 'N/A', // 5: Distance
        factionCellHTML,      // 6: Faction/Station (HTML)
        playerBaseCellHTML,   // 7: Player Base (HTML)
        mission.planet || '', // 8: Planet
      ];
      
      data.forEach((cellData, cellIndex) => {
        const cell = document.createElement("td");
        if (cellIndex === 0) {
          cell.innerHTML = typeCellHTML;    // Type badge for all mission types
        } else if (cellIndex === 1 && isTransportRow) {
          cell.innerHTML = escText(mission.cargoDescription || '—'); // cargo description
        } else if (cellIndex === 6 || cellIndex === 7) {
          cell.innerHTML = cellData;        // HTML content for faction/station and player base
        } else {
          cell.textContent = cellData;
        }
        row.appendChild(cell);
      });
      
      // Add info icon cell with tooltip if description exists
      const infoCell = document.createElement("td");
      infoCell.classList.add("info-cell");
      
      // Format date for tooltip - make it the header
      const dateFormatted = mission.dateAccepted ? 
        `Mission Date: ${new Date(mission.dateAccepted).toLocaleDateString()}` : 'Mission Date: Not specified';
      
      // Create tooltip content - date first as header, then description if it exists
      let tooltipContent = dateFormatted;
      
      if (mission.description) {
        // Add a line break between date and description if both exist
        tooltipContent += '\n\n';
        tooltipContent += mission.description;
      }
      
      // Only show icon if we have date or description
      if (tooltipContent) {
        infoCell.classList.add("tooltip-container");
        infoCell.textContent = "ⓘ"; // Circled information source
        infoCell.style.cursor = "help";
        infoCell.style.color = "#4CAF50"; // Green color to make it stand out
        
        const tooltip = document.createElement("span");
        tooltip.classList.add("tooltip-text");
        tooltip.style.whiteSpace = "pre-wrap"; // Preserve line breaks
        tooltip.textContent = tooltipContent;
        infoCell.appendChild(tooltip);
      }
      row.appendChild(infoCell);

      // Add produced status toggle button
      const producedCell = document.createElement("td");
      producedCell.style.textAlign = "center";
      
      const producedButton = document.createElement("button");
      producedButton.classList.add("produced-btn");
      producedButton.innerHTML = mission.produced ? "&#10003;" : "&#10005;";
      
      if (mission.produced) {
        producedButton.classList.add("checked");
      }
      
      producedButton.onclick = function() {
        // Toggle the produced status
        mission.produced = !mission.produced;
        producedButton.innerHTML = mission.produced ? "&#10003;" : "&#10005;";
        producedButton.classList.toggle("checked", mission.produced);
        
        // Save the updated data
        storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
        markDataDirty();
      };
      
      producedCell.appendChild(producedButton);
      row.appendChild(producedCell);

      // Add loaded status toggle button
      const loadedCell = document.createElement("td");
      loadedCell.style.textAlign = "center";
      
      const loadedButton = document.createElement("button");
      loadedButton.classList.add("loaded-btn");
      loadedButton.innerHTML = mission.loaded ? "&#10003;" : "&#10005;";
      
      if (mission.loaded) {
        loadedButton.classList.add("checked");
      }
      
      loadedButton.onclick = function() {
        // Toggle the loaded status
        mission.loaded = !mission.loaded;
        loadedButton.innerHTML = mission.loaded ? "&#10003;" : "&#10005;";
        loadedButton.classList.toggle("checked", mission.loaded);
        
        // Save the updated data
        storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
        markDataDirty();
      };
      
      loadedCell.appendChild(loadedButton);
      row.appendChild(loadedCell);
      
      // Add action buttons
      const actionsCell = document.createElement("td");

      // Edit button (explicit discoverability - edit is also on dblclick/longpress)
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.classList.add("edit-btn");
      editButton.onclick = function() {
        loadMissionToForm(itemName, mission, index);
      };
      actionsCell.appendChild(editButton);

      // Complete button — marks mission as done and moves it to the Completed list
      const completeButton = document.createElement("button");
      completeButton.textContent = "Complete";
      completeButton.classList.add("complete-btn");
      completeButton.onclick = function() {
        mission.completed = true;
        storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
        markDataDirty();
        reloadTableData();
      };
      actionsCell.appendChild(completeButton);

      // Create remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.classList.add("remove-btn"); // Changed from "danger" to "remove-btn"
      removeButton.onclick = function() {
        if (confirm("Are you sure you want to remove this mission?")) {
          missionsForItem.splice(index, 1);
          // If no more missions for this item, remove the item
          if (missionsForItem.length === 0) {
            delete window.SJFI_data.missions[itemName];
          }
          storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
          markDataDirty();
          reloadTableData();
        }
      };
      
      actionsCell.appendChild(removeButton);
      row.appendChild(actionsCell);

      // Add double-click event to the row for quick editing
      row.addEventListener('dblclick', function() {
        loadMissionToForm(itemName, mission, index);
      });
      
      // Add long-press for mobile devices to avoid double-tap zoom issues
      const longPressInstance = new LongPress(row, function() {
        loadMissionToForm(itemName, mission, index);
      });
      
      // Store the instance for later duration updates
      window.longPressInstances.push(longPressInstance);
      
      // Add table row to the table
      table.appendChild(row);
    });
  });

  currentMissionListDiv.appendChild(table);
  
  // Apply column visibility settings if the function exists
  if (typeof applyColumnVisibility === 'function') {
    applyColumnVisibility();
  }
}

// Reload table data
function reloadTableData() {
  displayCurrentMissions();
  displayCompletedMissions();
}

// Display completed missions in the Completed Mission List table
function displayCompletedMissions() {
  const div = document.getElementById("completed-mission-list");
  if (!div) return;
  div.innerHTML = "";

  if (!window.SJFI_data.missions) {
    div.innerHTML = '<p style="text-align:center">No completed missions.</p>';
    return;
  }

  // Collect all completed missions
  const completedRows = [];
  Object.keys(window.SJFI_data.missions).forEach(itemName => {
    window.SJFI_data.missions[itemName].forEach((mission, index) => {
      if (mission.completed) completedRows.push({ itemName, mission, index });
    });
  });

  if (completedRows.length === 0) {
    div.innerHTML = '<p style="text-align:center">No completed missions.</p>';
    return;
  }

  const table = document.createElement("table");
  table.classList.add("missions-table");
  table.id = "completed-missions-table";

  const headers = ["Type", "Item", "Amount", "Payment", "Risk", "Distance (Km)", "Faction/Station", "Player Base/Delivery Point", "Planet", "Info", "Produced", "Loaded", "Actions"];
  const headerRow = document.createElement("tr");
  headers.forEach(headerText => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  const formatNumber = (num) => {
    const numeric = String(num).replace(/[^\d]/g, '');
    return numeric ? Number(numeric).toLocaleString() : '';
  };
  const escAttr = s => (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  const escText = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  completedRows.forEach(({ itemName, mission, index }) => {
    const row = document.createElement("tr");
    row.style.opacity = "0.75";

    const missionType = mission.contractType || 'acquisition';
    const isTransportRow = (missionType === 'courier' || missionType === 'hauling');
    const typeLabel = missionType.charAt(0).toUpperCase() + missionType.slice(1);
    const typeCellHTML = `<span class="mission-type-badge mission-type-${missionType}">${typeLabel}</span>`;

    // Faction display
    let factionCode = "";
    let factionCellHTML = "";
    if (mission.firstNameFull && mission.secondNameFull) {
      const firstMatch = mission.firstNameFull.match(/\(([^)]+)\)/);
      const secondMatch = mission.secondNameFull.match(/\(([^)]+)\)/);
      factionCode = `${firstMatch ? firstMatch[1] : ""}${secondMatch ? secondMatch[1] : ""}`.substring(0, 4);
      const cf = mission.firstNameFull.replace(/\s*\([^)]+\)/g, '').trim();
      const cs = mission.secondNameFull.replace(/\s*\([^)]+\)/g, '').trim();
      factionCellHTML = `<span class="faction-full">${factionCode} - ${cf} ${cs}</span><span class="faction-code">${factionCode}</span>`;
    } else {
      factionCode = ((mission.firstName || '').substring(0,2) + (mission.secondName || '').substring(0,2));
      factionCellHTML = `<span class="faction-full">${factionCode} - ${mission.firstName || ''} ${mission.secondName || ''}</span><span class="faction-code">${factionCode}</span>`;
    }
    if (mission.stationName) {
      let plain = mission.firstNameFull && mission.secondNameFull
        ? `${factionCode} - ${mission.firstNameFull.replace(/\s*\([^)]+\)/g,'').trim()} ${mission.secondNameFull.replace(/\s*\([^)]+\)/g,'').trim()}`
        : `${mission.firstName || ''} ${mission.secondName || ''}`.trim();
      const gpsBtn = mission.stationGPS
        ? ` <button class="gps-inline-btn" data-gps="${escAttr(mission.stationGPS)}" title="Copy station GPS">&#128205;</button>` : '';
      factionCellHTML = `<span class="station-name tooltip-container">${escText(mission.stationName)}${gpsBtn}<span class="tooltip-text">${escText(plain)}</span></span>`;
    }

    // Player Base display
    let playerBaseCellHTML = '';
    if (mission.playerBase) {
      const gpsBtn = mission.playerBaseGPS
        ? ` <button class="gps-inline-btn" data-gps="${escAttr(mission.playerBaseGPS)}" title="Copy base GPS">&#128205;</button>` : '';
      playerBaseCellHTML = `${escText(mission.playerBase)}${gpsBtn}`;
    }

    const data = [
      '',
      isTransportRow ? '' : getItemWithCategory(itemName, mission.itemCategory),
      isTransportRow ? '' : formatNumber(mission.amount),
      mission.payment ? formatNumber(mission.payment) : '',
      isTransportRow ? (mission.riskLevel || 'Low') : 'N/A',
      isTransportRow ? (mission.distance != null ? formatNumber(mission.distance) : '') : 'N/A',
      factionCellHTML,
      playerBaseCellHTML,
      mission.planet || '',
    ];

    data.forEach((cellData, cellIndex) => {
      const cell = document.createElement("td");
      if (cellIndex === 0) {
        cell.innerHTML = typeCellHTML;
      } else if (cellIndex === 1 && isTransportRow) {
        cell.innerHTML = escText(mission.cargoDescription || '—');
      } else if (cellIndex === 6 || cellIndex === 7) {
        cell.innerHTML = cellData;
      } else {
        cell.textContent = cellData;
      }
      row.appendChild(cell);
    });

    // Info cell
    const infoCell = document.createElement("td");
    infoCell.classList.add("info-cell");
    const dateFormatted = mission.dateAccepted
      ? `Mission Date: ${new Date(mission.dateAccepted).toLocaleDateString()}` : 'Mission Date: Not specified';
    let tooltipContent = dateFormatted;
    if (mission.description) tooltipContent += '\n\n' + mission.description;
    if (tooltipContent) {
      infoCell.classList.add("tooltip-container");
      infoCell.textContent = "ⓘ";
      infoCell.style.cursor = "help";
      infoCell.style.color = "#888";
      const tooltip = document.createElement("span");
      tooltip.classList.add("tooltip-text");
      tooltip.style.whiteSpace = "pre-wrap";
      tooltip.textContent = tooltipContent;
      infoCell.appendChild(tooltip);
    }
    row.appendChild(infoCell);

    // Produced (read-only indicator for completed missions)
    const producedCell = document.createElement("td");
    producedCell.style.textAlign = "center";
    producedCell.textContent = mission.produced ? "✓" : "✗";
    producedCell.style.color = mission.produced ? "#FF9800" : "#555";
    row.appendChild(producedCell);

    // Loaded (read-only indicator for completed missions)
    const loadedCell = document.createElement("td");
    loadedCell.style.textAlign = "center";
    loadedCell.textContent = mission.loaded ? "✓" : "✗";
    loadedCell.style.color = mission.loaded ? "#4CAF50" : "#555";
    row.appendChild(loadedCell);

    // Actions: Edit, Restore, Remove
    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.classList.add("edit-btn");
    editButton.onclick = () => loadMissionToForm(itemName, mission, index);
    actionsCell.appendChild(editButton);

    const restoreButton = document.createElement("button");
    restoreButton.textContent = "Restore";
    restoreButton.classList.add("restore-btn");
    restoreButton.onclick = function() {
      mission.completed = false;
      storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
      incrementChangeCounter(-1); // restoring cancels out the prior Complete (+1)
      reloadTableData();
    };
    actionsCell.appendChild(restoreButton);

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.classList.add("remove-btn");
    removeButton.onclick = function() {
      if (confirm("Permanently remove this completed mission?")) {
        window.SJFI_data.missions[itemName].splice(index, 1);
        if (window.SJFI_data.missions[itemName].length === 0) {
          delete window.SJFI_data.missions[itemName];
        }
        storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
        markDataDirty();
        reloadTableData();
      }
    };
    actionsCell.appendChild(removeButton);

    row.appendChild(actionsCell);
    table.appendChild(row);
  });

  div.appendChild(table);

  if (typeof applyColumnVisibility === 'function') {
    applyColumnVisibility();
  }
}

// Format time parts (for export filename)
function formatTimePart(part) {
  return part < 10 ? `0${part}` : part;
}

// Export JSON data
function JSONExport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = formatTimePart(now.getMonth() + 1);
  const day = formatTimePart(now.getDate());
  const hours = formatTimePart(now.getHours());
  const minutes = formatTimePart(now.getMinutes());
  const seconds = formatTimePart(now.getSeconds());

  // Format the filename using a template string
  const fullFilename = `SEAT_Missions_${year}-${month}-${day}_T_${hours}-${minutes}-${seconds}.json`;

  SJFIJSONExport(window.SJFI_data, fullFilename);
  markDataClean();
}

// Import JSON data
async function importJSONObjects(event) {
  const importedData = await SJFIJSONImport(event.target.files[0]);

  if (importedData) {
    // Validate imported data structure
    if (!importedData.missions) {
      alert("Invalid data format: Missing missions data");
      return;
    }
    
    // Confirm import
    const confirmed = confirm("This will replace all existing data. Continue?");
    if (!confirmed) return;
    
    window.SJFI_data = importedData;
    storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
    markDataDirty();
    reloadTableData();
    alert("Data imported successfully!");
  }
}

// Clear local storage
function clearLocalStorage() {
  if (confirm("Are you sure you want to delete ALL missions? This cannot be undone!")) {
    clearLocalStorageALLKeys();
    window.SJFI_data = { missions: {} };
    markDataClean();
    reloadTableData();
    alert("All data cleared successfully!");
  }
}

// Function to clear the item search field and reset dropdown
function clearItemSearch() {
  const select = document.getElementById('formAcquisitionItem');
  if (!select) return;
  select.selectedIndex = 0;
  if (select._sdUpdateDisplay) select._sdUpdateDisplay();
}

// Function to cancel editing and reset form to add mode
function cancelEdit() {
  // Clear editing state
  window.currentlyEditingMission = null;

  // Clear new optional fields before reset
  ['formStationName', 'formStationGPS', 'formPlayerBase', 'formPlayerBaseGPS', 'formCargoDescription'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Reset form
  document.getElementById('missionForm').reset();

  // Reset submit button text
  const submitButton = document.querySelector('#missionForm input[type="submit"]');
  submitButton.value = "Add Mission";

  // Hide edit mode indicator and cancel button
  document.getElementById('edit-mode-indicator').style.display = 'none';
  document.getElementById('cancel-edit-btn').style.display = 'none';

  // Reset to acquisition type
  switchContractType('acquisition');

  // Reload form dropdowns (also re-initializes searchable dropdowns)
  initializeFormDropdowns();
}

// Function to soft reset form - keeps planet and faction names, clears other fields
function softResetForm() {
  // Store current values to preserve
  const currentPlanet = document.getElementById("formPlanet").value;
  const currentFirstName = document.getElementById("formFirstName").value;
  const currentSecondName = document.getElementById("formSecondName").value;
  const currentStationName = document.getElementById("formStationName")?.value || "";
  const currentPlayerBase = document.getElementById("formPlayerBase")?.value || "";
  const currentContractType = document.getElementById("formContractType")?.value || "acquisition";

  // Reset the form completely
  document.getElementById('missionForm').reset();

  // Restore preserved values
  document.getElementById("formPlanet").value = currentPlanet;
  document.getElementById("formFirstName").value = currentFirstName;
  document.getElementById("formSecondName").value = currentSecondName;
  document.getElementById("formStationName").value = currentStationName;
  document.getElementById("formPlayerBase").value = currentPlayerBase;

  // Set today's date
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 10);
  document.getElementById('formDate').value = formattedDate;

  // Reset item dropdown to first entry (category header)
  const itemSelect = document.getElementById("formAcquisitionItem");
  itemSelect.selectedIndex = 0;
  if (itemSelect._sdUpdateDisplay) itemSelect._sdUpdateDisplay();

  // Update searchable dropdown display texts to match restored values
  setSearchableValue('formFirstName', currentFirstName);
  setSearchableValue('formSecondName', currentSecondName);

  // Restore the contract type toggle state (so adding multiple courier missions is smooth)
  switchContractType(currentContractType);
}

// Load mission data into form for editing
function loadMissionToForm(itemName, mission, index) {
  // Scroll to form section
  document.querySelector('.collapsible-section').scrollIntoView({ behavior: 'smooth' });
  
  // Set mission currently being edited
  window.currentlyEditingMission = {
    itemName: itemName,
    index: index
  };

  // Switch to the correct contract type first (shows/hides the right fields)
  const contractType = mission.contractType || 'acquisition';
  switchContractType(contractType);

  // ── Acquisition-specific fields ──────────────────────────────────────────
  if (contractType === 'acquisition') {
    const itemSelect = document.getElementById("formAcquisitionItem");
    const options = itemSelect.options;
    
    // Try to find the correct option by matching both value and category
    let foundOption = false;
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option.value === itemName) {
        if (mission.itemCategory) {
          const optionCategory = option.getAttribute('data-category');
          if (optionCategory === mission.itemCategory) {
            itemSelect.selectedIndex = i;
            foundOption = true;
            break;
          }
        } else {
          itemSelect.selectedIndex = i;
          foundOption = true;
          break;
        }
      }
    }
    if (!foundOption) {
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === itemName) { itemSelect.selectedIndex = i; break; }
      }
    }
    if (itemSelect._sdUpdateDisplay) itemSelect._sdUpdateDisplay();
    document.getElementById("formAmount").value = mission.amount || "";
  }

  // ── Transport-specific fields ─────────────────────────────────────────────
  const cargoEl = document.getElementById("formCargoDescription");
  if (cargoEl) cargoEl.value = mission.cargoDescription || "";
  const riskEl = document.getElementById("formRisk");
  if (riskEl && mission.riskLevel) riskEl.value = mission.riskLevel;
  const distEl = document.getElementById("formDistance");
  if (distEl) distEl.value = mission.distance != null ? mission.distance : "";
  document.getElementById("formPayment").value = mission.payment || "";
  
  // Set faction names
  if (mission.firstName) {
    const firstNameSelect = document.getElementById("formFirstName");
    for (let i = 0; i < firstNameSelect.options.length; i++) {
      if (firstNameSelect.options[i].value === mission.firstName) {
        firstNameSelect.selectedIndex = i;
        break;
      }
    }
  }
  
  if (mission.secondName) {
    const secondNameSelect = document.getElementById("formSecondName");
    for (let i = 0; i < secondNameSelect.options.length; i++) {
      if (secondNameSelect.options[i].value === mission.secondName) {
        secondNameSelect.selectedIndex = i;
        break;
      }
    }
  }
  
  // Set planet
  if (mission.planet) {
    const planetSelect = document.getElementById("formPlanet");
    for (let i = 0; i < planetSelect.options.length; i++) {
      if (planetSelect.options[i].value === mission.planet) {
        planetSelect.selectedIndex = i;
        break;
      }
    }
  }
  
  // Set date
  if (mission.dateAccepted) {
    document.getElementById("formDate").value = mission.dateAccepted;
  }
  
  // Set description
  document.getElementById("formDescription").value = mission.description || "";

  // Populate new optional fields
  document.getElementById("formStationName").value = mission.stationName || "";
  document.getElementById("formStationGPS").value = mission.stationGPS || "";
  document.getElementById("formPlayerBase").value = mission.playerBase || "";
  document.getElementById("formPlayerBaseGPS").value = mission.playerBaseGPS || "";

  // Update searchable dropdown display texts to match the native select values just set
  const firstSel = document.getElementById("formFirstName");
  if (firstSel._sdUpdateDisplay) firstSel._sdUpdateDisplay();
  const secondSel = document.getElementById("formSecondName");
  if (secondSel._sdUpdateDisplay) secondSel._sdUpdateDisplay();

  // Change submit button text to indicate editing
  const submitButton = document.querySelector('#missionForm input[type="submit"]');
  submitButton.value = "Update Mission";
  
  // Show edit mode indicator
  document.getElementById('edit-mode-indicator').style.display = '';
  
  // Show cancel button
  document.getElementById('cancel-edit-btn').style.display = '';
  
  // Expand form section if collapsed
  const formSection = document.querySelector('.collapsible-section');
  const formContent = formSection.querySelector('.collapsible-content');
  if (formContent.classList.contains('collapsed')) {
    formSection.querySelector('.collapsible-header').click();
  }
}

// Export functions and variables for use in the HTML file
window.storeFormData = storeFormData;
window.displayCurrentMissions = displayCurrentMissions;
window.reloadTableData = reloadTableData;
window.JSONExport = JSONExport;
window.importJSONObjects = importJSONObjects;
window.clearLocalStorage = clearLocalStorage;
window.SJFI_data = SJFI_data;
window.SJFI_storageKey = SJFI_storageKey;

// Function to update long press duration for all instances
function updateLongPressDuration(newDuration) {
  if (window.longPressInstances) {
    window.longPressInstances.forEach(instance => {
      if (instance.updateDuration) {
        instance.updateDuration(newDuration);
      }
    });
  }
}

// Export function for use by hamburger-menu.js
window.updateLongPressDuration = updateLongPressDuration;

// Table sorting functionality
function sortTable(columnIndex) {
  const table = document.getElementById("missions-table");
  if (!table) return;
  
  const rows = Array.from(table.querySelectorAll("tr")).slice(1); // Skip header row
  const headerCells = table.querySelectorAll("th");
  
  // Toggle sort direction if clicking the same column
  if (currentSortColumn === columnIndex) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortDirection = 'asc';
    
    // Reset all sort indicators
    headerCells.forEach(cell => {
      if (cell.classList.contains('sortable')) {
        cell.querySelector('.sort-icon').textContent = '↕';
      }
    });
  }
  
  // Set current sort column
  currentSortColumn = columnIndex;
  
  // Update sort indicator
  const headerCell = headerCells[columnIndex];
  if (headerCell.classList.contains('sortable')) {
    headerCell.querySelector('.sort-icon').textContent = currentSortDirection === 'asc' ? '↑' : '↓';
  }
  
  // Sort rows
  rows.sort((a, b) => {
    let aValue = a.cells[columnIndex].textContent.trim();
    let bValue = b.cells[columnIndex].textContent.trim();
    
    // Handle numeric values for Amount and Payment columns
    if (columnIndex === 1 || columnIndex === 2) {
      // Parse comma-formatted numbers properly by removing commas first
      // Handle empty strings as 0 for sorting purposes
      const aText = aValue.replace(/,/g, '');
      const bText = bValue.replace(/,/g, '');
      aValue = parseInt(aText) || 0;
      bValue = parseInt(bText) || 0;
      
      return currentSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle date values
    if (columnIndex === 5) {
      if (!aValue) return currentSortDirection === 'asc' ? -1 : 1;
      if (!bValue) return currentSortDirection === 'asc' ? 1 : -1;
      
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      
      return currentSortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    }
    
    // Default string comparison
    return currentSortDirection === 'asc' 
      ? aValue.localeCompare(bValue) 
      : bValue.localeCompare(aValue);
  });
  
  // Reorder table rows
  const tbody = table.querySelector("tbody") || table;
  
  // Remove all existing rows except the header
  while (tbody.childNodes.length > 1) {
    tbody.removeChild(tbody.lastChild);
  }
  
  // Add sorted rows
  rows.forEach(row => tbody.appendChild(row));
}
