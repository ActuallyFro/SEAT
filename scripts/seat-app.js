// SEAT Application Logic

// Initialize the application state
window.SJFI_storageKey = 'SEAT-DATA';

window.SJFI_data = {
  missions: {}
};

// Global array to track LongPress instances for updating duration
window.longPressInstances = [];

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
  
  // Clear storage button
  document.getElementById('clear-storage').addEventListener('click', clearLocalStorage);
  
  // Cancel edit button
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
  
  // Set up collapsible sections after all other UI elements are ready
  setupCollapsibleSections();
}

// Setup collapsible sections
function setupCollapsibleSections() {
  // Add collapsible functionality to the "Add Mission" section
  convertToCollapsible('missionForm', 'Add Mission');
  
  // Add collapsible functionality to the "Current Mission List" section
  convertToCollapsible('missionListContainer', 'Current Mission List');
  
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
}

// Initialize all dropdowns
function initializeFormDropdowns() {
  pageSetupFormCreateItemSelectList();
  pageSetupPlanetSelectList();
  pageSetupFactionFirstNameSelectList();
  pageSetupFactionSecondNameSelectList();
  
  // Set today's date as default
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 10); // Format: YYYY-MM-DD (date only, no time)
  document.getElementById('formDate').value = formattedDate;
  
  // Setup search functionality
  setupItemSearch();
  setupMissionSearch();
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

// Save form data
function storeFormData() {
  const itemName = document.getElementById("formAcquisitionItem").value;
  const amountValue = document.getElementById("formAmount").value;
  const paymentValue = document.getElementById("formPayment").value;
  const firstName = document.getElementById("formFirstName").value;
  const secondName = document.getElementById("formSecondName").value;
  const planet = document.getElementById("formPlanet").value;
  const dateAccepted = document.getElementById("formDate").value;
  const description = document.getElementById("formDescription").value;

  // Form validation
  if (!itemName || !amountValue) {
    alert("Please select an acquisition item and specify the amount."); // This alert is for validation failure
    return;
  }

  // Validate amount - ensure it's a positive integer
  const numericAmount = parseInt(amountValue.toString().replace(/\D/g, ''));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    alert("Please enter a valid positive number for the amount.");
    return;
  }

  // Validate payment - ensure it's a non-negative integer or empty
  let numericPayment = 0;
  if (paymentValue && paymentValue.toString().trim() !== '') {
    numericPayment = parseInt(paymentValue.toString().replace(/\D/g, ''));
    if (isNaN(numericPayment) || numericPayment < 0) {
      alert("Please enter a valid non-negative number for payment, or leave it blank for 0.");
      return;
    }
  }

  // Create mission object with all details
  const mission = {
    amount: numericAmount,
    payment: numericPayment,
    firstName: firstName,
    secondName: secondName,
    planet: planet,
    dateAccepted: dateAccepted,
    description: description,
    produced: false, // Default to not produced
    loaded: false, // Default to not loaded
    // Store category information from the actually selected option
    itemCategory: document.getElementById("formAcquisitionItem").selectedOptions[0]?.getAttribute('data-category') || "",
    firstNameFull: firstName ? document.querySelector(`#formFirstName option[value="${firstName}"]`)?.getAttribute('data-fullname') || "" : "",
    secondNameFull: secondName ? document.querySelector(`#formSecondName option[value="${secondName}"]`)?.getAttribute('data-fullname') || "" : ""
  };
  
  // Check if we're editing an existing mission or adding a new one
  if (window.currentlyEditingMission) {
    const { itemName: oldItemName, index } = window.currentlyEditingMission;
    
    // Preserve the loaded and produced status from the original mission
    if (window.SJFI_data.missions[oldItemName] && 
        window.SJFI_data.missions[oldItemName][index]) {
      mission.loaded = window.SJFI_data.missions[oldItemName][index].loaded;
      mission.produced = window.SJFI_data.missions[oldItemName][index].produced;
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
}

// Load data from localStorage
function loadFormData() {
  let formData = loadJSONObjectsFromKey(window.SJFI_storageKey);

  if (formData !== null) {
    window.SJFI_data = formData;
  }
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
  const headers = ["Item", "Amount", "Payment", "Faction", "Planet", "Info", "Produced", "Loaded", "Actions"];
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

  // Find the item's category to create a proper item display name
  function getItemWithCategory(itemName, itemCategory) {
    // If we have the category stored, use it
    if (itemCategory) {
      if ((itemCategory === "Ores" || itemCategory === "Ingots") && 
          !itemName.includes(itemCategory.slice(0, -1))) {
        return `${itemName} ${itemCategory.slice(0, -1)}`;
      }
      return itemName;
    }
    
    // Fallback - search through all categories
    // CRITICAL: Try Ingots first, then Ores to prioritize Ingots when both exist
    const categoryOrder = ["Ingots", "Ores", "Components", "Tools"];
    
    for (const category of categoryOrder) {
      const items = window.SE_Data_References.Contract["Acquisition Request Item"][category];
      if (!items) continue;
      
      // Check if this item exists in this category
      for (const item of Object.keys(items)) {
        if (items[item] === itemName) {
          // For ores and ingots, append the category if not already in the name
          if ((category === "Ores" || category === "Ingots") && !itemName.includes(category.slice(0, -1))) {
            return `${itemName} ${category.slice(0, -1)}`; // Remove the 's' from "Ores" or "Ingots"
          }
          // For Components and Tools, we leave as is since they already have descriptive names
          return itemName;
        }
      }
    }
    
    return itemName; // Fallback to original name if not found
  }

  // Add table rows with mission data
  Object.keys(window.SJFI_data.missions).forEach(itemName => {
    const missionsForItem = window.SJFI_data.missions[itemName];
    
    missionsForItem.forEach((mission, index) => {
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

      // Add mission data to the row with proper item name
      const formatNumber = (num) => {
        // Remove all non-numeric characters, then add 1000-comma separation
        const numeric = String(num).replace(/[^\d]/g, '');
        return numeric ? Number(numeric).toLocaleString() : '';
      };

      const data = [
        getItemWithCategory(itemName, mission.itemCategory),
        formatNumber(mission.amount),
        mission.payment ? formatNumber(mission.payment) : '',
        factionDisplay, // Use the new factionDisplay HTML string
        mission.planet || '',
      ];
      
      data.forEach((cellData, cellIndex) => {
        const cell = document.createElement("td");
        if (cellIndex === 3) { // Faction column
          cell.innerHTML = cellData; // Set as HTML for the spans
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
      };
      
      loadedCell.appendChild(loadedButton);
      row.appendChild(loadedCell);
      
      // Add action buttons (only remove button, edit functionality available via double-click)
      const actionsCell = document.createElement("td");
      
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
    reloadTableData();
    alert("Data imported successfully!");
  }
}

// Clear local storage
function clearLocalStorage() {
  if (confirm("Are you sure you want to delete ALL missions? This cannot be undone!")) {
    clearLocalStorageALLKeys();
    window.SJFI_data = { missions: {} };
    reloadTableData();
    alert("All data cleared successfully!");
  }
}

// Function to clear the item search field and reset dropdown
function clearItemSearch() {
  const searchInput = document.getElementById('itemSearch');
  const clearButton = document.getElementById('itemSearchClear');
  
  if (searchInput) {
    searchInput.value = '';
    // Remove clear button visibility
    if (clearButton) {
      clearButton.classList.remove('visible');
    }
    // Reset the dropdown options to show all items
    const selectElement = document.getElementById('formAcquisitionItem');
    if (selectElement) {
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
            itemOption.value = `${items[item]}`;
            itemOption.textContent = `${items[item]}`;
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
  }
}

// Function to cancel editing and reset form to add mode
function cancelEdit() {
  // Clear editing state
  window.currentlyEditingMission = null;
  
  // Reset form
  document.getElementById('missionForm').reset();
  
  // Clear item search
  clearItemSearch();
  
  // Reset submit button text
  const submitButton = document.querySelector('#missionForm input[type="submit"]');
  submitButton.value = "Add Mission";
  
  // Hide edit mode indicator and cancel button
  document.getElementById('edit-mode-indicator').style.display = 'none';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  
  // Reload form dropdowns to ensure they're properly populated
  initializeFormDropdowns();
}

// Function to soft reset form - keeps planet and faction names, clears other fields
function softResetForm() {
  // Store current values to preserve
  const currentPlanet = document.getElementById("formPlanet").value;
  const currentFirstName = document.getElementById("formFirstName").value;
  const currentSecondName = document.getElementById("formSecondName").value;
  
  // Reset the form completely
  document.getElementById('missionForm').reset();
  
  // Clear item search
  clearItemSearch();
  
  // Restore preserved values
  document.getElementById("formPlanet").value = currentPlanet;
  document.getElementById("formFirstName").value = currentFirstName;
  document.getElementById("formSecondName").value = currentSecondName;
  
  // Set today's date
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 10);
  document.getElementById('formDate').value = formattedDate;
  
  // Ensure first item is selected (index 0 should be a category header)
  document.getElementById("formAcquisitionItem").selectedIndex = 0;
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
  
  // Populate form fields with mission data
  const itemSelect = document.getElementById("formAcquisitionItem");
  const options = itemSelect.options;
  
  // Try to find the correct option by matching both value and category
  let foundOption = false;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    // Check if value matches and category matches (if we have stored category)
    if (option.value === itemName) {
      if (mission.itemCategory) {
        // If we have a stored category, make sure it matches
        const optionCategory = option.getAttribute('data-category');
        if (optionCategory === mission.itemCategory) {
          itemSelect.selectedIndex = i;
          foundOption = true;
          break;
        }
      } else {
        // No stored category, just use first match (fallback for older data)
        itemSelect.selectedIndex = i;
        foundOption = true;
        break;
      }
    }
  }
  
  // If we couldn't find a match with category, fall back to first value match
  if (!foundOption) {
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === itemName) {
        itemSelect.selectedIndex = i;
        break;
      }
    }
  }
  
  document.getElementById("formAmount").value = mission.amount || "";
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
