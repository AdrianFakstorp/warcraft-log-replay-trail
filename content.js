console.log('Warcraft Movement Trails extension loaded');

// Global variables
let playerData = {};
let positionData = {};
let isCollecting = false;
let selectedPlayerId = null;
let reportData = null; // Store the full report data
let trackingInterval = null;

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
  
  // Try to get report data
  updateStatus('Fetching report data...');
  reportData = await fetchReportData();
  
  if (reportData) {
    findPlayersFromReportData();
  } else {
    updateStatus('Error: Failed to fetch report data');
    console.error('Failed to fetch report data and no fallback available');
  }
}

// Find players from report data
function findPlayersFromReportData() {
  if (!reportData || !reportData.friendlies) {
    updateStatus('Error: No player data found in report');
    console.error('Report data is missing friendlies array:', reportData);
    return;
  }
  
  const { fightId } = getReportInfoFromUrl();
  if (!fightId) {
    updateStatus('Error: Could not determine fight ID from URL');
    return;
  }
  
  console.log(`Looking for players in fight ${fightId}`);
  console.log('Report data structure:', Object.keys(reportData));
  console.log('Number of friendlies:', reportData.friendlies.length);
  
  // Find players who participated in this fight
  const playersInFight = reportData.friendlies.filter(player => 
    player.fights && player.fights.includes(`.${fightId}.`)
  );
  
  console.log(`Found ${playersInFight.length} players in fight ${fightId}`);
  console.log('First few players:', playersInFight.slice(0, 3));
  
  if (playersInFight.length === 0) {
    updateStatus('No players found for this fight');
    return;
  }
  
  // Format the player data for our dropdown
  const formattedPlayerData = playersInFight.map((player, index) => ({
    name: player.name,
    id: player.id || `player-${index}`,
    type: player.type,
    server: player.server,
    icon: player.icon
  }));
  
  createControlPanel(formattedPlayerData);
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
      <button id="collect-data" style="width: 100%; padding: 5px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">
        Collect Movement Data
      </button>
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: flex; align-items: center;">
        <input type="checkbox" id="show-trail" checked style="margin-right: 5px;"> 
        Show Trail
      </label>
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: flex; align-items: center;">
        <input type="checkbox" id="exclusive-player" checked style="margin-right: 5px;"> 
        Show Selected Player Only
      </label>
    </div>
    <div id="status-message" style="font-size: 12px; color: #999; margin-top: 10px;"></div>
  `;
  
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
  document.getElementById('collect-data').addEventListener('click', startCollection);
  document.getElementById('show-trail').addEventListener('change', toggleTrail);
  document.getElementById('exclusive-player').addEventListener('change', function(e) {
    // When toggling the checkbox, either show only selected player or show all
    const selectedPlayerId = document.getElementById('player-select').value;
    if (selectedPlayerId) {
      const player = playerData[selectedPlayerId];
      if (e.target.checked) {
        toggleOffOtherPlayers(player.name);
      } else {
        enableAllLegendItems();
      }
    }
  });
}

// Handle player selection in the dropdown
function handlePlayerSelection(e) {
  const selectedPlayerId = e.target.value;
  
  // If no player selected, do nothing
  if (!selectedPlayerId) {
    return;
  }
  
  const player = playerData[selectedPlayerId];
  console.log(`Selected player: ${player.name}`);
  
  // Check if we should show only this player
  const exclusiveCheckbox = document.getElementById('exclusive-player');
  if (exclusiveCheckbox && exclusiveCheckbox.checked) {
    toggleOffOtherPlayers(player.name);
  }
  
  // Update status
  updateStatus(`Selected ${player.name}`);
}

// Function to toggle off all players in the replay legend except the selected one
function toggleOffOtherPlayers(selectedPlayerName) {
  console.log(`Toggling off other players except ${selectedPlayerName}`);
  
  // Find all items in the replay legend
  const legendItems = document.querySelectorAll('.replay-legend-item.friendly');
  console.log(`Found ${legendItems.length} legend items`);
  
  // Process each legend item
  legendItems.forEach(item => {
    // Get the player name from the legend item
    const nameElement = item.querySelector('.replay-legend-name');
    if (!nameElement) return;
    
    const playerName = nameElement.textContent.trim();
    console.log(`Processing legend item: ${playerName}`);
    
    // If this is not the selected player, toggle it off
    if (playerName !== selectedPlayerName) {
      // Check if the item is currently visible (no strikethrough style)
      const isVisible = !nameElement.style.textDecoration || !nameElement.style.textDecoration.includes('line-through');
      
      if (isVisible) {
        console.log(`Toggling off: ${playerName}`);
        // Click the item to toggle it off
        item.click();
      }
    } else {
      // This is our selected player, make sure it's visible
      const isVisible = !nameElement.style.textDecoration || !nameElement.style.textDecoration.includes('line-through');
      
      if (!isVisible) {
        console.log(`Toggling on selected player: ${playerName}`);
        // Click the item to toggle it on
        item.click();
      }
    }
  });
}

// Function to re-enable all legend items that were disabled
function enableAllLegendItems() {
  console.log('Re-enabling all legend items');
  
  // Find all items in the replay legend
  const legendItems = document.querySelectorAll('.replay-legend-item.friendly');
  
  // Process each legend item
  legendItems.forEach(item => {
    // Get the player name from the legend item
    const nameElement = item.querySelector('.replay-legend-name');
    if (!nameElement) return;
    
    // Check if the item is currently hidden (has strikethrough style)
    const isHidden = nameElement.style.textDecoration && nameElement.style.textDecoration.includes('line-through');
    
    if (isHidden) {
      console.log(`Re-enabling: ${nameElement.textContent.trim()}`);
      // Click the item to toggle it on
      item.click();
    }
  });
}

// Toggle trail visibility
function toggleTrail(e) {
  const visible = e.target.checked;
  const trailOverlay = document.getElementById('wcl-trail-svg');
  if (trailOverlay) {
    trailOverlay.style.display = visible ? 'block' : 'none';
  }
  updateStatus(`Trail visibility: ${visible ? 'On' : 'Off'}`);
}

// Start collecting movement data
function startCollection() {
  // If already collecting, stop
  if (isCollecting) {
    isCollecting = false;
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    
    const button = document.getElementById('collect-data');
    button.textContent = 'Collect Movement Data';
    button.style.backgroundColor = '#4CAF50';
    updateStatus('Data collection stopped');
    return;
  }
  
  // Get the selected player
  const playerSelect = document.getElementById('player-select');
  const selectedIndex = playerSelect.value;
  
  if (!selectedIndex) {
    updateStatus('Please select a player');
    return;
  }
  
  const player = playerData[selectedIndex];
  selectedPlayerId = selectedIndex;
  isCollecting = true;
  
  // Update button
  const button = document.getElementById('collect-data');
  button.textContent = 'Stop Collection';
  button.style.backgroundColor = '#f44336';
  
  updateStatus(`Starting to track ${player.name}...`);
  
  // Clear previous position data
  positionData[selectedPlayerId] = [];
  
  // Set up the trail overlay
  setupTrailOverlay();
  
  // Start tracking player position
  startPlayerTracking(player);
}

// Set up the trail overlay
function setupTrailOverlay() {
  // Remove existing overlay
  const existingOverlay = document.getElementById('wcl-trail-container');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  // Find the replay canvas element - this is the main area where the replay is shown
  const replayCanvas = document.getElementById('replay-canvas') || 
                      document.querySelector('canvas[id*="replay"]') ||
                      document.querySelector('.replay-canvas');
  
  // If we can't find the canvas directly, look for the container
  let replayContainer = replayCanvas ? replayCanvas.parentElement : null;
  
  if (!replayContainer) {
    // Look for replay container by common class names
    replayContainer = document.querySelector('.replay-container') || 
                      document.querySelector('.map-container') ||
                      document.querySelector('[class*="replay"]') ||
                      document.querySelector('#replay');
  }
  
  // If still not found, look for a large positioned div that might be the container
  if (!replayContainer) {
    const possibleContainers = Array.from(document.querySelectorAll('div[style*="position"]'))
      .filter(div => {
        const rect = div.getBoundingClientRect();
        return rect.width > 300 && rect.height > 300;
      });
    
    // Sort by area (largest first)
    possibleContainers.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return (bRect.width * bRect.height) - (aRect.width * aRect.height);
    });
    
    if (possibleContainers.length > 0) {
      replayContainer = possibleContainers[0];
    }
  }
  
  if (!replayContainer) {
    console.error('Could not find replay container');
    updateStatus('Error: Could not find replay view');
    return;
  }
  
  console.log('Found replay container:', replayContainer);
  
  // Create overlay container
  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'wcl-trail-container';
  overlayContainer.style.position = 'absolute';
  overlayContainer.style.top = '0';
  overlayContainer.style.left = '0';
  overlayContainer.style.width = '100%';
  overlayContainer.style.height = '100%';
  overlayContainer.style.pointerEvents = 'none';
  overlayContainer.style.zIndex = '50';
  
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'wcl-trail-svg';
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  
  // Add the SVG to the container
  overlayContainer.appendChild(svg);
  
  // Add the container to the replay container
  if (replayContainer.style.position !== 'absolute' && replayContainer.style.position !== 'relative') {
    replayContainer.style.position = 'relative';
  }
  replayContainer.appendChild(overlayContainer);
  
  console.log('Trail overlay created');
}

// Start tracking player position
function startPlayerTracking(player) {
  console.log(`Starting tracking for player: ${player.name}`);
  
  // Initialize position data
  positionData[selectedPlayerId] = [];
  
  // Function to find entities that might be the player
  function findPlayerEntities() {
    // Look for any element that has the player name
    const nameElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent.trim() === player.name
    );
    
    // Look for elements with transform style (they move)
    const movingElements = document.querySelectorAll('[style*="transform"]');
    
    return {
      nameElements,
      movingElements
    };
  }
  
  // Set up a timer to periodically check for player position
  trackingInterval = setInterval(() => {
    if (!isCollecting || selectedPlayerId !== player.id) {
      clearInterval(trackingInterval);
      trackingInterval = null;
      return;
    }
    
    // Find player entities
    const { nameElements, movingElements } = findPlayerEntities();
    
    // Try to find position based on name elements first
    let foundPosition = null;
    
    for (const el of nameElements) {
      // Check if this element or any parent has a transform
      let current = el;
      for (let i = 0; i < 5 && current; i++) {
        const style = current.getAttribute('style') || '';
        const position = extractPositionFromTransform(style);
        if (position) {
          foundPosition = position;
          break;
        }
        current = current.parentElement;
      }
      
      if (foundPosition) break;
    }
    
    // If no position found from name elements, try all moving elements
    // This is less accurate but may work
    if (!foundPosition && movingElements.length > 0) {
      // Just use the first moving element as a fallback
      const style = movingElements[0].getAttribute('style') || '';
      foundPosition = extractPositionFromTransform(style);
    }
    
    if (foundPosition) {
      // Get current time
      const time = getCurrentReplayTime();
      
      // Add to position data
      positionData[selectedPlayerId].push({
        x: foundPosition.x,
        y: foundPosition.y,
        time: time
      });
      
      // Update the trail
      updateTrail(selectedPlayerId);
    }
  }, 100); // Check every 100ms
}

// Extract position from transform style
function extractPositionFromTransform(style) {
  if (!style) return null;
  
  const transformMatch = style.match(/transform\s*:\s*translate\(\s*([^,]+),\s*([^)]+)\)/i);
  
  if (transformMatch && transformMatch.length >= 3) {
    const x = parseFloat(transformMatch[1]);
    const y = parseFloat(transformMatch[2]);
    return { x, y };
  }
  
  return null;
}

// Get current replay time
function getCurrentReplayTime() {
  const timeElement = document.querySelector('.timeline-time');
  if (!timeElement) return 0;
  
  const timeText = timeElement.textContent.trim();
  const parts = timeText.split(':');
  
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  
  return 0;
}

// Update the trail visualization
function updateTrail(playerId) {
  const positions = positionData[playerId];
  if (!positions || positions.length < 2) return;
  
  const svg = document.getElementById('wcl-trail-svg');
  if (!svg) return;
  
  // Clear existing path
  svg.innerHTML = '';
  
  // Create path element
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  // Generate path data
  let pathData = `M ${positions[0].x} ${positions[0].y}`;
  for (let i = 1; i < positions.length; i++) {
    pathData += ` L ${positions[i].x} ${positions[i].y}`;
  }
  
  // Set path attributes
  path.setAttribute('d', pathData);
  path.setAttribute('stroke', 'rgba(255, 0, 0, 0.7)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  
  // Add path to SVG
  svg.appendChild(path);
  
  // Add time markers
  const interval = Math.max(1, Math.floor(positions.length / 10));
  for (let i = 0; i < positions.length; i += interval) {
    const pos = positions[i];
    
    // Create marker circle
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', pos.x);
    marker.setAttribute('cy', pos.y);
    marker.setAttribute('r', '4');
    marker.setAttribute('fill', 'rgba(255, 255, 0, 0.7)');
    
    // Create larger invisible circle for hover detection
    const hoverArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hoverArea.setAttribute('cx', pos.x);
    hoverArea.setAttribute('cy', pos.y);
    hoverArea.setAttribute('r', '10');
    hoverArea.setAttribute('fill', 'transparent');
    hoverArea.setAttribute('data-time', formatTime(pos.time));
    hoverArea.style.pointerEvents = 'all';
    
    // Add tooltip on hover
    hoverArea.addEventListener('mouseover', showTooltip);
    hoverArea.addEventListener('mouseout', hideTooltip);
    
    svg.appendChild(marker);
    svg.appendChild(hoverArea);
  }
}

// Show tooltip with time information
function showTooltip(e) {
  const time = e.target.getAttribute('data-time');
  
  let tooltip = document.getElementById('wcl-trail-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'wcl-trail-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px';
    tooltip.style.borderRadius = '3px';
    tooltip.style.zIndex = '9999';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.fontSize = '12px';
    document.body.appendChild(tooltip);
  }
  
  tooltip.textContent = `Time: ${time}`;
  tooltip.style.left = `${e.clientX + 10}px`;
  tooltip.style.top = `${e.clientY + 10}px`;
  tooltip.style.display = 'block';
}

// Hide the tooltip
function hideTooltip() {
  const tooltip = document.getElementById('wcl-trail-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

// Format time (MM:SS)
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Create a function to intercept network requests
// This helps us capture the report data from network requests
function setupNetworkListener() {
  // Create an XHR proxy to intercept all AJAX requests
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    // Check if this is a request for report data
    if (typeof url === 'string') {
      if (url.includes('/reports/') && 
         (url.includes('/fights') || url.includes('/summary-graph/') || url.includes('/tables/'))) {
        
        console.log(`Monitoring XHR request to: ${url}`);
        
        this.addEventListener('load', function() {
          try {
            const data = JSON.parse(this.responseText);
            
            // Check if this response has the data we need
            if (data && data.fights && data.friendlies) {
              console.log('Found report data in XHR response!');
              reportData = data;
              
              // If we're already initialized, update with this data
              if (document.getElementById('wcl-trail-controls')) {
                findPlayersFromReportData();
              }
            }
          } catch (e) {
            console.error('Error parsing intercepted response:', e);
          }
        });
      }
    }
    return originalXhrOpen.apply(this, arguments);
  };
  
  // Also try to find the data in any known global variables
  window.addEventListener('load', function() {
    // Check common variable names that might contain report data
    const globalVars = ['_reportData', 'reportData', 'wclData', 'pageData'];
    
    for (const varName of globalVars) {
      if (window[varName] && window[varName].fights && window[varName].friendlies) {
        console.log(`Found report data in global variable: ${varName}`);
        reportData = window[varName];
        break;
      }
    }
    
    // Look for any variable that might contain our data
    // This is more aggressive but might find hidden data
    for (const key in window) {
      try {
        const value = window[key];
        if (value && typeof value === 'object' && value.fights && value.friendlies) {
          console.log(`Found potential report data in global variable: ${key}`);
          reportData = value;
          break;
        }
      } catch (e) {
        // Ignore errors from accessing certain properties
      }
    }
  });
}

// Set up the network listener
setupNetworkListener();

// Initialize if we're on a replay page
if (isReplayPage()) {
  console.log('On replay page, initializing...');
  setTimeout(initialize, 1000);
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
    }
  }
}).observe(document, {subtree: true, childList: true});

console.log('Warcraft Movement Trails extension loaded');