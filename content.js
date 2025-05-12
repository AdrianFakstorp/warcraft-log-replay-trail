console.log('Warcraft Movement Trails extension loaded');

// Global variables
let playerData = {};
let selectedPlayerId = null;
let reportData = null; // Store the full report data
let selectedPlayerName = null; // Store the name of the currently selected player
let positionHistory = []; // Array to store previous positions
const maxTrailLength = 20; // How many previous positions to show in the trail
let originalDrawActorAndInstance = null; // Store the original draw function
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
  
  // Style the control panel
  controlPanel.style.position = 'fixed';
  controlPanel.style.top = '120px';
  controlPanel.style.right = '10px';
  controlPanel.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
  controlPanel.style.color = 'white';
  controlPanel.style.padding = '10px';
  controlPanel.style.borderRadius = '5px';
  controlPanel.style.zIndex = '9999';
  controlPanel.style.width = '200px';
  controlPanel.style.fontFamily = 'Arial, sans-serif';
  controlPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  
  controlPanel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.3); padding-bottom: 5px;">
      Movement Trails
    </div>
    <div style="margin-bottom: 10px;">
      <label for="player-select">Player:</label>
      <select id="player-select" style="width: 100%; padding: 4px; margin-top: 3px;">
        <option value="">-- Select Player --</option>
      </select>
    </div>
    <div style="margin-bottom: 10px;">
      <button id="view-player" style="width: 100%; padding: 5px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;" disabled>
        Track Player
      </button>
    </div>
    <div style="margin-bottom: 10px;">
      <button id="clear-trail" style="width: 100%; padding: 5px; background-color: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;" disabled>
        Clear Trail
      </button>
    </div>
    <div style="font-size: 11px; color: #aaa; margin-top: 10px; margin-bottom: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 5px;">
      The trail shows the complete movement path of the selected player throughout the replay.
      <br><br>
      Brighter spots indicate areas where the player stood still for longer periods.
    </div>
    <div id="status-message" style="font-size: 12px; color: #999; margin-top: 10px;"></div>
  `;
  
  document.body.appendChild(controlPanel);
  
  // Populate player select dropdown if we found players
  if (players && players.length > 0) {
    // Sort players alphabetically
    players.sort((a, b) => a.name.localeCompare(b.name));
    
    const playerSelect = document.getElementById('player-select');
    
    // Add player options
    players.forEach((player) => {
      const option = document.createElement('option');
      option.value = player.id;
      
      // Format the display name with class if available
      let displayName = player.name;
      if (player.type) {
        displayName += ` (${player.type})`;
      }
      
      option.textContent = displayName;
      playerSelect.appendChild(option);
      
      // Store player data
      playerData[player.id] = player;
    });
    
    updateStatus(`Found ${players.length} players`);
    
    // Add change event listener to the dropdown
    playerSelect.addEventListener('change', handlePlayerSelection);
  } else {
    updateStatus('No players found for this fight');
  }
  
  // Add event listeners
  // And when a player is tracked, enable the clear button:
  document.getElementById('view-player').addEventListener('click', function() {
  const selectElement = document.getElementById('player-select');
  const selectedPlayerId = selectElement.value;
  
  if (selectedPlayerId) {
    const player = playerData[selectedPlayerId];
    selectedPlayerName = player.name;
    updateStatus(`Tracking ${player.name}...`);
    
    // Send message to the injected script
    sendMessageToPage({
      type: 'wcl-trail-setup',
      playerName: player.name
    });
    
    // Enable the clear button
    document.getElementById('clear-trail').disabled = false;
  }
  });
  
// Update the clear trail button handler:
document.getElementById('clear-trail').addEventListener('click', function() {
  if (selectedPlayerName) {
    console.log('Sending clear trail request');
    // Send message to clear the trail
    sendMessageToPage({
      type: 'wcl-trail-clear'
    });
    
    updateStatus(`Cleared trail for ${selectedPlayerName}`);
  } else {
    console.log('No player selected for clearing trail');
  }
});
  
  // Add toggle for trail visibility
  const trailToggle = document.createElement('div');
  trailToggle.style.marginBottom = '10px';
  trailToggle.innerHTML = `
    <label style="display: flex; align-items: center;">
      <input type="checkbox" id="show-trail" checked style="margin-right: 5px;"> 
      Show Trail
    </label>
  `;
  controlPanel.insertBefore(trailToggle, document.getElementById('status-message').previousElementSibling);
  
  // Update the show/hide trail toggle handler:
  document.getElementById('show-trail').addEventListener('change', function(e) {
  trailEnabled = e.target.checked;
  console.log(`Toggling trail visibility to: ${trailEnabled}`);
  
  // Send message to the injected script
  sendMessageToPage({
    type: 'wcl-trail-visibility',
    visible: trailEnabled
  });
  
  updateStatus(`Trail ${trailEnabled ? 'shown' : 'hidden'}`);
  });
}

// Update the handlePlayerSelection function to enable/disable the clear button properly:
function handlePlayerSelection(e) {
  const selectElement = e.target;
  const selectedId = selectElement.value;
  const viewButton = document.getElementById('view-player');
  const clearButton = document.getElementById('clear-trail');
  
  // If no player selected, disable the buttons
  if (!selectedId) {
    viewButton.disabled = true;
    clearButton.disabled = true;
    selectedPlayerName = null;
    return;
  }
  
  // Enable the view button
  viewButton.disabled = false;
  
  const player = playerData[selectedId];
  console.log(`Selected player: ${player.name}`);
  
  // Update status
  updateStatus(`Selected ${player.name}`);
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