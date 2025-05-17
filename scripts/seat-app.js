// SEAT Application Logic

// Initialize the application state
window.SJFI_storageKey = 'SEAT-DATA';

window.SJFI_data = {
  missions: {}
};

// Parse the JSON data - jsonDataString is loaded from SEAT-Data.js
const parsedData = JSON.parse(jsonDataString);
window.SE_Data_References = parsedData;

// Event handler when the DOM is fully loaded
window.onload = function() {
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
  
  // Set up collapsible sections
  setupCollapsibleSections();
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
        itemOption.textContent = `${items[item]}`;
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

  const firstNames = window.SE_Data_References.Metadata.Factions["First Name"];
  Object.keys(firstNames).forEach(name => {
    const option = document.createElement("option");
    option.value = firstNames[name];
    option.textContent = name; // Display the full name
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
    option.textContent = name; // Display the full name
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
  const formattedDate = today.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  document.getElementById('formDate').value = formattedDate;
  
  // Setup search functionality
  setupItemSearch();
  setupMissionSearch();
}

// Setup item search
function setupItemSearch() {
  const searchInput = document.getElementById('itemSearch');
  const selectElement = document.getElementById('formAcquisitionItem');
  
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
  const amount = document.getElementById("formAmount").value;
  const payment = document.getElementById("formPayment").value;
  const firstName = document.getElementById("formFirstName").value;
  const secondName = document.getElementById("formSecondName").value;
  const planet = document.getElementById("formPlanet").value;
  const dateAccepted = document.getElementById("formDate").value;
  
  // Form validation - only acquisition item and amount are mandatory
  if (!itemName || !amount) {
    alert("Please select an acquisition item and specify the amount");
    return;
  }

  // Create mission object with all details
  const mission = {
    amount: parseInt(amount),
    payment: payment ? parseInt(payment) : 0,
    firstName: firstName,
    secondName: secondName,
    planet: planet,
    dateAccepted: dateAccepted,
    // Add the full names for display
    firstNameFull: firstName ? document.querySelector(`#formFirstName option[value="${firstName}"]`)?.getAttribute('data-fullname') || "" : "",
    secondNameFull: secondName ? document.querySelector(`#formSecondName option[value="${secondName}"]`)?.getAttribute('data-fullname') || "" : ""
  };

  // Ensure there's an array for the item name and add the mission
  if (!window.SJFI_data.missions[itemName]) {
    window.SJFI_data.missions[itemName] = [];
  }

  window.SJFI_data.missions[itemName].push(mission);

  // Reset the form
  document.getElementById("formAcquisitionItem").selectedIndex = 0;
  document.getElementById("formAmount").value = "";
  document.getElementById("formPayment").value = "";
  document.getElementById("formFirstName").selectedIndex = 0;
  document.getElementById("formSecondName").selectedIndex = 0;
  document.getElementById("formPlanet").selectedIndex = 0;
  
  // Keep the current date
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 16);
  document.getElementById('formDate').value = formattedDate;
  
  // Update the table and save data
  reloadTableData();
  storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
  
  // Show confirmation
  alert("Mission added successfully!");
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

  // Check if there are any missions
  if (!window.SJFI_data.missions || Object.keys(window.SJFI_data.missions).length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No missions found. Add a mission using the form above.";
    emptyMessage.style.textAlign = "center";
    emptyMessage.style.padding = "20px";
    currentMissionListDiv.appendChild(emptyMessage);
    return;
  }

  const table = document.createElement("table");
  table.classList.add("missions-table");
  table.id = "missions-table";

  const headers = ["Item", "Amount", "Payment (€)", "Faction", "Planet", "Date", "Actions"];
  const headerRow = document.createElement("tr");
  
  headers.forEach((headerText, index) => {
    const header = document.createElement("th");
    
    // Don't make the Actions column sortable
    if (headerText !== "Actions") {
      header.classList.add("sortable");
      header.dataset.sortIndex = index;
      header.innerHTML = `${headerText} <span class="sort-icon">↕</span>`;
      
      // Add click event for sorting
      header.addEventListener('click', function() {
        sortTable(index);
      });
    } else {
      header.textContent = headerText;
    }
    
    headerRow.appendChild(header);
  });
  
  table.appendChild(headerRow);

  // Add table rows with mission data
  Object.keys(window.SJFI_data.missions).forEach(itemName => {
    const missionsForItem = window.SJFI_data.missions[itemName];
    
    missionsForItem.forEach((mission, index) => {
      const row = document.createElement("tr");
      
      // Format the faction name nicely
      let factionName = "";
      if (mission.firstName && mission.secondName) {
        // Extract the type code from second name (e.g., [B], [M], [T])
        const typeMatch = mission.secondNameFull ? mission.secondNameFull.match(/^\[([BMT])\]/) : null;
        const typeCode = typeMatch ? typeMatch[1] : "";
        
        // Format as FFSS - First name Second name [Type]
        factionName = `${mission.firstName}${mission.secondName} - ${mission.firstNameFull} ${mission.secondNameFull.replace(/^\[[BMT]\]\s*/, "")} [${typeCode}]`;
      } else {
        factionName = `${mission.firstName || ""} ${mission.secondName || ""}`;
      }
      
      // Format the date nicely
      const dateObject = mission.dateAccepted ? new Date(mission.dateAccepted) : null;
      const formattedDate = dateObject 
        ? `${dateObject.toLocaleDateString()}` 
        : mission.dateAccepted || '';

      // Add mission data to the row
      const data = [
        itemName,
        mission.amount || '',
        mission.payment ? `${mission.payment} €` : '',
        factionName,
        mission.planet || '',
        formattedDate,
      ];
      
      data.forEach(cellData => {
        const cell = document.createElement("td");
        cell.textContent = cellData;
        row.appendChild(cell);
      });
      
      // Add action buttons (delete)
      const actionsCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("danger");
      deleteButton.onclick = function() {
        if (confirm("Are you sure you want to delete this mission?")) {
          missionsForItem.splice(index, 1);
          // If no more missions for this item, remove the item
          if (missionsForItem.length === 0) {
            delete window.SJFI_data.missions[itemName];
          }
          storeJSONObjectsIntoKey(window.SJFI_storageKey, window.SJFI_data);
          reloadTableData();
        }
      };
      
      actionsCell.appendChild(deleteButton);
      row.appendChild(actionsCell);

      table.appendChild(row);
    });
  });

  currentMissionListDiv.appendChild(table);
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

// Export functions and variables for use in the HTML file
window.storeFormData = storeFormData;
window.displayCurrentMissions = displayCurrentMissions;
window.reloadTableData = reloadTableData;
window.JSONExport = JSONExport;
window.importJSONObjects = importJSONObjects;
window.clearLocalStorage = clearLocalStorage;
window.SJFI_data = SJFI_data;
window.SJFI_storageKey = SJFI_storageKey;

// Table sorting functionality
let currentSortColumn = -1;
let currentSortDirection = 'asc';

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
      aValue = parseInt(aValue) || 0;
      bValue = parseInt(bValue) || 0;
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
