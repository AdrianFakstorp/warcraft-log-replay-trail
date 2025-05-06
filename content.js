console.log('Warcraft Movement Trails extension loaded');

// Global variables to store position data
let positionData = {};
let selectedPlayerId = null;
let dataCollectionActive = false;
let overlayCreated = false;

// Check if we're on a replay page
function isReplayPage() {
  return window.location.href.includes('view=replay');
}

// Main initialization function
function initialize() {
  console.log('Initializing on replay page');
  
  // Wait for the replay container to be fully loaded
  const checkForReplayContainer = setInterval(() => {
    const replayContainer = document.querySelector('.replay-container');
    if (replayContainer) {
      clearInterval(checkForReplayContainer);
      console.log('Replay container found');
      
      // Setup UI controls and overlay
      createControls();
      createOverlay();
      
      // Set up event listeners for the replay timeline
      setupReplayListeners();
    }
  }, 500);
}

// Create UI controls for the extension
function createControls() {
  const controlPanel = document.createElement('div');
  controlPanel.id = 'wcl-trail-controls';
  controlPanel.innerHTML = `
    <div class="trail-control-header">Movement Trails</div>
    <div class="trail-control-item">
      <label for="player-select">Player:</label>
      <select id="player-select"></select>
    </div>
    <div class="trail-control-item">
      <button id="collect-data">Collect Movement Data</button>
    </div>
    <div class="trail-control-item">
      <label><input type="checkbox" id="show-trail" checked> Show Trail</label>
    </div>
  `;
  
  document.body.appendChild(controlPanel);
  
  // Add event listeners
  document.getElementById('collect-data').addEventListener('click', toggleDataCollection);
  document.getElementById('show-trail').addEventListener('change', toggleTrailVisibility);
  document.getElementById('player-select').addEventListener('change', (e) => {
    selectedPlayerId = e.target.value;
    updateTrailVisualization();
  });
  
  // Populate player dropdown (after a slight delay to ensure entities are loaded)
  setTimeout(populatePlayerDropdown, 1000);
}

// Create the overlay for visualizing trails
function createOverlay() {
  if (overlayCreated) return;
  
  const replayContainer = document.querySelector('.replay-container');
  if (!replayContainer) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'wcl-trail-overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '100';
  
  // Create SVG element for drawing trails
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.id = 'wcl-trail-svg';
  overlay.appendChild(svg);
  
  replayContainer.appendChild(overlay);
  overlayCreated = true;
  
  console.log('Trail overlay created');
}

// Populate the player selection dropdown
function populatePlayerDropdown() {
  const playerSelect = document.getElementById('player-select');
  const playerEntities = document.querySelectorAll('.entity[data-type="Player"]');
  
  if (playerEntities.length === 0) {
    console.log('No player entities found, trying again in 1 second');
    setTimeout(populatePlayerDropdown, 1000);
    return;
  }
  
  console.log(`Found ${playerEntities.length} player entities`);
  
  // Clear existing options
  playerSelect.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Select Player --';
  playerSelect.appendChild(defaultOption);
  
  // Add player options
  playerEntities.forEach(entity => {
    const playerId = entity.getAttribute('data-id');
    const playerName = entity.getAttribute('data-name') || `Player ${playerId}`;
    
    const option = document.createElement('option');
    option.value = playerId;
    option.textContent = playerName;
    playerSelect.appendChild(option);
  });
}

// Toggle data collection on/off
function toggleDataCollection() {
  const button = document.getElementById('collect-data');
  
  if (dataCollectionActive) {
    dataCollectionActive = false;
    button.textContent = 'Collect Movement Data';
    console.log('Data collection stopped');
  } else {
    dataCollectionActive = true;
    button.textContent = 'Stop Collection';
    console.log('Data collection started');
    
    // Initialize data for the selected player if not already present
    if (selectedPlayerId && !positionData[selectedPlayerId]) {
      positionData[selectedPlayerId] = [];
    }
  }
}

// Toggle trail visibility
function toggleTrailVisibility(e) {
  const svg = document.getElementById('wcl-trail-svg');
  if (svg) {
    svg.style.display = e.target.checked ? 'block' : 'none';
  }
}

// Set up event listeners for the replay
function setupReplayListeners() {
  // We'll observe changes to player positions during replay
  const observer = new MutationObserver(mutations => {
    if (!dataCollectionActive || !selectedPlayerId) return;
    
    // Find the selected player entity
    const playerEntity = document.querySelector(`.entity[data-id="${selectedPlayerId}"]`);
    if (!playerEntity) return;
    
    // Get the current time from the replay timeline
    const currentTime = getCurrentReplayTime();
    
    // Extract position from the player entity's style
    const position = extractPlayerPosition(playerEntity);
    if (!position) return;
    
    // Store the position data
    positionData[selectedPlayerId].push({
      time: currentTime,
      x: position.x,
      y: position.y
    });
    
    // Update the visualization
    updateTrailVisualization();
  });
  
  // Start observing the replay container for changes
  const replayContainer = document.querySelector('.replay-container');
  if (replayContainer) {
    observer.observe(replayContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
    
    console.log('Replay observer set up');
  }
}

// Extract player position from DOM element
function extractPlayerPosition(playerElement) {
  if (!playerElement) return null;
  
  const style = playerElement.getAttribute('style');
  if (!style) return null;
  
  // Extract transform values (this regex needs to be adjusted based on actual DOM inspection)
  const transformMatch = style.match(/transform:\s*translate\(([^,]+),\s*([^)]+)\)/);
  if (!transformMatch || transformMatch.length < 3) return null;
  
  const x = parseFloat(transformMatch[1]);
  const y = parseFloat(transformMatch[2]);
  
  return { x, y };
}

// Get current replay time in seconds
function getCurrentReplayTime() {
  const timeElement = document.querySelector('.timeline-time');
  if (!timeElement) return 0;
  
  // Parse time display (format: MM:SS.ms)
  const timeText = timeElement.textContent;
  const timeParts = timeText.split(':');
  
  if (timeParts.length !== 2) return 0;
  
  const minutes = parseInt(timeParts[0], 10);
  const seconds = parseFloat(timeParts[1]);
  
  return minutes * 60 + seconds;
}

// Update the trail visualization
function updateTrailVisualization() {
  if (!selectedPlayerId || !positionData[selectedPlayerId]) return;
  
  const svg = document.getElementById('wcl-trail-svg');
  if (!svg) return;
  
  // Clear existing trail
  svg.innerHTML = '';
  
  const points = positionData[selectedPlayerId];
  if (points.length < 2) return;
  
  // Create path element for the trail
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  // Generate path data
  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i].x} ${points[i].y}`;
  }
  
  path.setAttribute('d', pathData);
  path.setAttribute('stroke', 'rgba(255, 0, 0, 0.7)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  
  svg.appendChild(path);
  
  // Add time markers along the path
  addTimeMarkers(svg, points);
}

// Add time markers and hover functionality
function addTimeMarkers(svg, points) {
  // Add a marker every N points
  const markerInterval = Math.max(1, Math.floor(points.length / 10));
  
  for (let i = 0; i < points.length; i += markerInterval) {
    const point = points[i];
    
    // Create marker circle
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', point.x);
    marker.setAttribute('cy', point.y);
    marker.setAttribute('r', '4');
    marker.setAttribute('fill', 'rgba(255, 255, 0, 0.7)');
    
    // Create invisible larger circle for hover detection
    const hoverArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hoverArea.setAttribute('cx', point.x);
    hoverArea.setAttribute('cy', point.y);
    hoverArea.setAttribute('r', '12');
    hoverArea.setAttribute('fill', 'transparent');
    hoverArea.setAttribute('data-time', formatTime(point.time));
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

// Format time in MM:SS.ms format
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(1);
  return `${minutes}:${remainingSeconds.padStart(4, '0')}`;
}

// Start the extension if we're on a replay page
if (isReplayPage()) {
  initialize();
}

// Listen for URL changes to detect when navigating to a replay page
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (isReplayPage()) {
      initialize();
    }
  }
}).observe(document, {subtree: true, childList: true});