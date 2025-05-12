console.log('Warcraft Movement Trails extension loaded');

// Global variables
let playerData = {};
let reportData = null; // Store the full report data
let trailEnabled = true; // Flag to enable/disable trail drawing

// Check if we're on a replay page
function isReplayPage() {
  return window.location.href.includes('view=replay');
}

// Extract report code and fight ID from URL
function getReportInfoFromUrl() {
  const url = window.location.href;
  const reportMatch = url.match(/reports\/([^/?]+)/);
  const fightMatch = url.match(/fight=(\d+)/);
  
  return {
    reportCode: reportMatch ? reportMatch[1] : null,
    fightId: fightMatch ? fightMatch[1] : null
  };
}

// Fetch report data using the report code
async function fetchReportData() {
  const { reportCode, fightId } = getReportInfoFromUrl();
  if (!reportCode) {
    console.error('Could not extract report code from URL');
    return null;
  }

  console.log(`Attempting to fetch data for report: ${reportCode}, fight: ${fightId}`);

  try {
    // First try a direct API endpoint that might contain fight and player data
    const apiUrl = `https://www.warcraftlogs.com/reports/fights-and-participants/${reportCode}/0`;
    console.log(`Fetching from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch report data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched report data successfully');
    return data;
  } catch (error) {
    console.error('Error fetching report data:', error);
    
    // Fallback: try to extract data from the global variable if available
    if (window._reportData) {
      console.log('Using global report data');
      return window._reportData;
    }
    
    return null;
  }
}

// Load external script as a web accessible resource
function loadExternalScript() {
  // Get the URL of the script from the extension
  const scriptURL = chrome.runtime.getURL('trailScript.js');
  
  // Create script element
  const script = document.createElement('script');
  script.src = scriptURL;
  script.onload = function() {
    // Script has been loaded and executed
    console.log('Trail script loaded successfully');
    
    // Clean up - remove script element from DOM (optional)
    this.remove();
  };
  
  // Add to document to load it
  (document.head || document.documentElement).appendChild(script);
  
  console.log('Injected trail script from extension resources');
}

// Add debug logging to the sendMessageToPage function:
function sendMessageToPage(message) {
  console.log('Sending message to page:', message);
  window.postMessage(message, '*');
}

// Main initialization function
async function initialize() {
  console.log('Initializing on replay page');
  
  // Create indicator
  const indicator = document.createElement('div');
  indicator.id = 'wcl-trail-indicator';
  indicator.textContent = 'Movement Trails: Initializing...';
  indicator.style.position = 'fixed';
  indicator.style.top = '80px';
  indicator.style.right = '10px';
  indicator.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
  indicator.style.color = 'white';
  indicator.style.padding = '5px 10px';
  indicator.style.borderRadius = '3px';
  indicator.style.zIndex = '9999';
  indicator.style.fontFamily = 'Arial, sans-serif';
  indicator.style.fontSize = '12px';
  document.body.appendChild(indicator);
  
  // Load the external script
  loadExternalScript();
  
  // Try to get report data or generate mock data
  updateStatus('Getting player data...');
  reportData = await fetchReportData();
  
  if (reportData) {
    findPlayersFromReportData();
  } else {
    // Generate mock data for testing
    generateMockPlayers();
  }
  
  // Install message listener for messages from the page context
  window.addEventListener('message', function(event) {
    // We only accept messages from ourselves or the same origin
    if (event.source !== window) return;
    
    if (event.data.type === 'wcl-trail-status') {
      console.log('Received status from page script:', event.data.message);
      updateStatus(event.data.message);
    }
  });
  
  // Canvas will be detected by the observer
  updateStatus('Waiting for replay to load...');
}

// Find players from report data
function findPlayersFromReportData() {
  if (!reportData || !reportData.friendlies) {
    updateStatus('Error: No player data found in report');
    console.error('Report data is missing friendlies array:', reportData);
    // Generate mock data as fallback
    generateMockPlayers();
    return;
  }
  
  const { fightId } = getReportInfoFromUrl();
  if (!fightId) {
    updateStatus('Error: Could not determine fight ID from URL');
    generateMockPlayers();
    return;
  }
  
  console.log(`Looking for players in fight ${fightId}`);
  
  // Find players who participated in this fight
  console.log("Examining friendlies for fight participation:", reportData.friendlies.length);
  
  // Check the structure of the fights data
  if (reportData.friendlies.length > 0) {
    console.log("Example fights data structure:", reportData.friendlies[0].fights);
  }
  
  // Filter players who participated in this fight
  const playersInFight = reportData.friendlies.filter(player => {
    // Check if player has fights data
    if (!player.fights) {
      return false;
    }
    
    // Different data formats might exist
    if (Array.isArray(player.fights)) {
      // Format 1: Array of fight objects
      return player.fights.some(fight => 
        (fight.id === parseInt(fightId)) || 
        (fight.id === fightId) ||
        (fight === parseInt(fightId)) ||
        (fight === fightId)
      );
    } else if (typeof player.fights === 'string') {
      // Format 2: String with comma-separated fight IDs (`.1.,.2.,.3.`)
      return player.fights.includes(`.${fightId}.`);
    } else if (typeof player.fights === 'object') {
      // Format 3: Object with fight IDs as keys
      return player.fights[fightId] !== undefined;
    }
    
    return false;
  }).slice(0, 20); // Limit to 20 players for performance
  
  console.log(`Found ${playersInFight.length} players for fight ${fightId}`);
  
  if (playersInFight.length === 0) {
    updateStatus(`No players found for fight ID: ${fightId}`);
    console.warn(`Could not find any players for fight ID: ${fightId}`);
    console.log("Data structure received:", JSON.stringify(reportData.friendlies[0], null, 2).substring(0, 500) + "...");
    
    // Fallback option 1: Try all players as fallback
    if (reportData.friendlies && reportData.friendlies.length > 0) {
      console.log("Falling back to using all players");
      const allPlayers = reportData.friendlies.slice(0, 20);
      createControlPanel(allPlayers);
      return;
    }
    
    // Fallback option 2: Generate mock data if no players at all
    generateMockPlayers();
    return;
  }
  
  // Format the player data for our dropdown
  const formattedPlayerData = playersInFight.map((player, index) => ({
    name: player.name,
    id: player.id || `player-${index}`,
    type: player.type,
    server: player.server || '',
    icon: player.icon || ''
  }));
  
  createControlPanel(formattedPlayerData);
}

// Generate mock player data for testing
function generateMockPlayers() {
  const classes = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid', 'Death Knight'];
  const mockPlayers = [];
  
  for (let i = 1; i <= 20; i++) {
    const classIndex = i % classes.length;
    mockPlayers.push({
      name: `Player${i}`,
      id: `mock-player-${i}`,
      type: classes[classIndex],
      server: 'MockRealm',
      icon: ''
    });
  }
  
  console.log('Generated mock player data:', mockPlayers);
  createControlPanel(mockPlayers);
}

// Update status message
function updateStatus(message) {
  const statusElement = document.getElementById('status-message');
  const indicator = document.getElementById('wcl-trail-indicator');
  
  if (statusElement) {
    statusElement.textContent = message;
  }
  
  if (indicator) {
    indicator.textContent = `Movement Trails: ${message}`;
  }
  
  console.log(`Status update: ${message}`);
}

// Create the control panel
function createControlPanel(players) {
  console.log('Creating control panel with players:', players.length);
  
  // Update the indicator
  const indicator = document.getElementById('wcl-trail-indicator');
  if (indicator) {
    indicator.textContent = 'Movement Trails: Ready';
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 1s';
    }, 3000);
  }
  
  // Remove existing control panel if any
  const existingPanel = document.getElementById('wcl-trail-controls');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // Create a new control panel
  const controlPanel = document.createElement('div');
  controlPanel.id = 'wcl-trail-controls';
  
  // Sort players alphabetically
  const sortedPlayers = players && players.length > 0 
    ? [...players].sort((a, b) => a.name.localeCompare(b.name))
    : [];
  
  controlPanel.innerHTML = `
    <div class="trail-control-header">
      Movement Trails
      <button class="trail-minimize-button" title="Minimize">−</button>
    </div>
    <div class="trail-control-content">
      <div id="show-trail-container">
        <input type="checkbox" id="show-trail" checked> 
        <label for="show-trail">Show Trails</label>
      </div>
      <div class="trail-control-item">
        <div id="player-checklist">
          ${sortedPlayers.length > 0 
            ? sortedPlayers.map(player => {
                return `
                  <div class="player-checkbox-item">
                    <label>
                      <input type="checkbox" class="player-checkbox" data-player-id="${player.id}" data-player-name="${player.name}"> 
                      <span>${player.name}</span>
                    </label>
                  </div>
                `;
              }).join('')
            : '<div>No players found for this fight</div>'
          }
        </div>
      </div>
      <div class="trail-control-item">
        <button id="clear-all-trails" disabled>
          Clear All Trails
        </button>
      </div>
      <div class="info-text">
        Check players to show their movement trails throughout the replay.
        <br><br>
        Brighter spots indicate areas where players stood still for longer periods.
      </div>
      <div id="status-message">Waiting for replay to load...</div>
    </div>
  `;
  
  document.body.appendChild(controlPanel);
  
  // Store player data
  if (sortedPlayers.length > 0) {
    sortedPlayers.forEach((player) => {
      playerData[player.id] = player;
    });
    
    updateStatus(`Found ${sortedPlayers.length} players`);
  } else {
    updateStatus('No players found for this fight');
  }
  
  // Add event listeners to each checkbox
  const checkboxes = document.querySelectorAll('.player-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handlePlayerCheckboxToggle);
  });
  
  // Add event listener for the clear all button
  document.getElementById('clear-all-trails').addEventListener('click', function() {
    console.log('Clearing all trails');
    
    // Send message to clear all trails
    sendMessageToPage({
      type: 'wcl-trail-clear-all'
    });
    
    // Uncheck all checkboxes
    document.querySelectorAll('.player-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Disable clear all button
    this.disabled = true;
    
    updateStatus('Cleared all trails');
  });
  
  // Show/hide trail toggle handler
  document.getElementById('show-trail').addEventListener('change', function(e) {
    trailEnabled = e.target.checked;
    console.log(`Toggling trail visibility to: ${trailEnabled}`);
    
    // Send message to the injected script
    sendMessageToPage({
      type: 'wcl-trail-visibility',
      visible: trailEnabled
    });
    
    updateStatus(`Trails ${trailEnabled ? 'shown' : 'hidden'}`);
  });
  
  // Minimize button functionality
  const minimizeButton = controlPanel.querySelector('.trail-minimize-button');
  minimizeButton.addEventListener('click', function() {
    const isCurrentlyCollapsed = controlPanel.classList.contains('collapsed');
    
    if (isCurrentlyCollapsed) {
      // If it's collapsed, expand it
      controlPanel.classList.remove('collapsed');
      this.textContent = '−';
      this.title = 'Minimize';
    } else {
      // If it's expanded, collapse it
      controlPanel.classList.add('collapsed');
      this.textContent = '+';
      this.title = 'Expand';
    }
  });
  
  // Make the panel draggable
  makeDraggable(controlPanel);
}

// Make an element draggable by its header
function makeDraggable(element) {
  const header = element.querySelector('.trail-control-header');
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', function(e) {
    // Only start dragging if we didn't click the minimize button
    if (e.target.classList.contains('trail-minimize-button')) {
      return;
    }
    
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    
    // Add noselect class to prevent text selection during drag
    element.classList.add('noselect');
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    // Update position
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));
    
    element.style.left = boundedX + 'px';
    element.style.top = boundedY + 'px';
    element.style.right = 'auto'; // Override the default right positioning
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('noselect');
    }
  });
}

// Make an element draggable by its header
function makeDraggable(element) {
  const header = element.querySelector('.trail-control-header');
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', function(e) {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    
    // Add noselect class to prevent text selection during drag
    element.classList.add('noselect');
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    // Update position
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));
    
    element.style.left = boundedX + 'px';
    element.style.top = boundedY + 'px';
    element.style.right = 'auto'; // Override the default right positioning
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('noselect');
    }
  });
}


// Handle player checkbox toggle
function handlePlayerCheckboxToggle(e) {
  const checkbox = e.target;
  const playerId = checkbox.getAttribute('data-player-id');
  const playerName = checkbox.getAttribute('data-player-name');
  const isChecked = checkbox.checked;
  const clearAllButton = document.getElementById('clear-all-trails');
  
  if (isChecked) {
    console.log(`Adding trail for ${playerName}`);
    
    // Send message to the injected script to setup trail for this player
    sendMessageToPage({
      type: 'wcl-trail-setup',
      playerName: playerName,
      playerColor: getPlayerColor(playerId) // We'll add a function to get a unique color for each player
    });
    
    // Enable the clear all button if at least one player is checked
    clearAllButton.disabled = false;
    
    updateStatus(`Added trail for ${playerName}`);
  } else {
    console.log(`Removing trail for ${playerName}`);
    
    // Send message to remove trail for this player
    sendMessageToPage({
      type: 'wcl-trail-remove',
      playerName: playerName
    });
    
    // Check if any players are still checked
    const anyChecked = [...document.querySelectorAll('.player-checkbox')].some(cb => cb.checked);
    clearAllButton.disabled = !anyChecked;
    
    updateStatus(`Removed trail for ${playerName}`);
  }
}

// Function to get a unique color for each player
function getPlayerColor(playerId) {
  // List of distinct colors for different players
  const colors = [
    '125, 32, 39',    // Deep red
    '26, 118, 210',   // Blue
    '76, 175, 80',    // Green
    '156, 39, 176',   // Purple
    '255, 152, 0',    // Orange
    '3, 169, 244',    // Light blue
    '233, 30, 99',    // Pink
    '255, 87, 34',    // Deep orange
    '0, 150, 136',    // Teal
    '63, 81, 181',    // Indigo
    '33, 150, 243',   // Blue
    '139, 195, 74',   // Light green
    '158, 158, 158',  // Grey
    '96, 125, 139',   // Blue grey
    '121, 85, 72',    // Brown
    '255, 193, 7',    // Amber
    '0, 188, 212',    // Cyan
    '103, 58, 183',   // Deep purple
    '244, 67, 54',    // Red
    '255, 235, 59'    // Yellow
  ];
  
  // Generate a consistent index for this player
  const index = parseInt(playerId.replace(/\D/g, '')) % colors.length;
  
  return colors[index];
}

// Set up a mutation observer to monitor for canvas and game UI elements
function setupCanvasObserver() {
  console.log('Setting up canvas observer');
  
  // Create mutation observer to detect when the canvas is added to the DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check for canvas elements
        const canvasElements = document.querySelectorAll('canvas');
        if (canvasElements.length > 0) {
          console.log(`Canvas elements found (${canvasElements.length})`);
          
          // Send a message to check for the draw function
          sendMessageToPage({
            type: 'wcl-trail-check',
            check: 'drawActorAndInstance'
          });
          
          observer.disconnect();
          break;
        }
      }
    }
  });
  
  // Start observing the document for added nodes
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize if we're on a replay page
if (isReplayPage()) {
  console.log('On replay page, initializing...');
  setTimeout(initialize, 1000);
  setupCanvasObserver();
}

// Listen for URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (isReplayPage()) {
      console.log('Navigated to replay page');
      setTimeout(initialize, 1000);
      setupCanvasObserver();
    }
  }
}).observe(document, {subtree: true, childList: true});

console.log('Warcraft Movement Trails extension loaded');