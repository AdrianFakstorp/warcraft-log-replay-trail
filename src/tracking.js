import { state } from './constants.js';
import { updateStatus, formatTime, getCurrentReplayTime } from './utils.js';
import { showTooltip, hideTooltip } from './tooltip.js';

export function clearTrail() {
  const container = document.getElementById('wcl-trail-container');
  if (container) {
    container.remove();
  }
}

export function setupTrailOverlay() {
  const existingOverlay = document.getElementById('wcl-trail-container');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  const containerSelectors = [
    '#position-graph-contents',
    '#position-graph',
    '.position-graph',
    '[id*="replay-canvas"]',
    '.replay-container',
    '.map-container',
    '#replay',
    '[class*="replay"]'
  ];
  
  let replayContainer = null;
  
  for (const selector of containerSelectors) {
    replayContainer = document.querySelector(selector);
    if (replayContainer) {
      console.log(`Found replay container using selector: ${selector}`);
      break;
    }
  }
  
  if (!replayContainer) {
    console.error('Could not find replay container with any known selector');
    updateStatus('Error: Could not find replay view');
    return;
  }
  
  console.log('Found replay container:', replayContainer);
  
  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'wcl-trail-container';
  overlayContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
  `;
  
  if (replayContainer.style.position !== 'absolute' && replayContainer.style.position !== 'relative') {
    replayContainer.style.position = 'relative';
  }
  replayContainer.appendChild(overlayContainer);
  
  console.log('Trail overlay created and attached to:', replayContainer);
}

export function findPlayerPosition(playerName) {
  console.log(`Looking for player: ${playerName}`);
  
  // Method 1: Look for position-graph specific elements
  const positionGraph = document.getElementById('position-graph-contents');
  if (positionGraph) {
    console.log('Found position-graph-contents');
    
    const actors = positionGraph.querySelectorAll('[id*="actor-"], .actor, .player-icon');
    console.log(`Found ${actors.length} actor elements in position graph`);
    
    for (const actor of actors) {
      console.log('Checking actor:', actor.id || actor.className, actor.title || actor.getAttribute('data-name'));
      
      if (actor.title === playerName || 
          actor.getAttribute('data-name') === playerName ||
          actor.getAttribute('data-actor-name') === playerName ||
          (actor.textContent && actor.textContent.includes(playerName))) {
        
        const style = window.getComputedStyle(actor);
        const transform = style.transform;
        
        if (transform && transform !== 'none') {
          console.log('Found player with transform:', transform);
          return parseTransform(transform);
        }
        
        if (style.position === 'absolute' && (style.left || style.top)) {
          console.log('Found player with absolute position:', style.left, style.top);
          return {
            x: parseFloat(style.left) || 0,
            y: parseFloat(style.top) || 0
          };
        }
      }
    }
  }
  
  // Additional methods follow the same pattern...
  return null;
}

export function parseTransform(transform) {
  const translateMatch = transform.match(/translate(?:3d)?\(([^,]+),\s*([^,)]+)/);
  if (translateMatch) {
    return {
      x: parseFloat(translateMatch[1]),
      y: parseFloat(translateMatch[2])
    };
  }
  
  const matrixMatch = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
    if (values.length === 6) {
      return { x: values[4], y: values[5] };
    } else if (values.length === 16) {
      return { x: values[12], y: values[13] };
    }
  }
  
  return null;
}

export function createTrailMarker(x, y, time) {
  let trailContainer = document.getElementById('wcl-trail-container');
  if (!trailContainer) {
    const replayContainer = document.getElementById('position-graph') ||
                          document.getElementById('position-graph-contents') ||
                          document.querySelector('.replay-container');
    
    if (!replayContainer) {
      console.error('Could not find replay container');
      return;
    }
    
    trailContainer = document.createElement('div');
    trailContainer.id = 'wcl-trail-container';
    trailContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    replayContainer.appendChild(trailContainer);
  }
  
  const marker = document.createElement('div');
  marker.className = 'trail-marker';
  marker.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: 8px;
    height: 8px;
    background-color: rgba(255, 0, 0, 0.6);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 3px rgba(255, 0, 0, 0.8);
  `;
  
  marker.setAttribute('data-time', formatTime(time));
  marker.addEventListener('mouseover', (e) => showTooltip(e));
  marker.addEventListener('mouseout', hideTooltip);
  
  trailContainer.appendChild(marker);
  
  if (!state.positionData[state.selectedPlayerId]) {
    state.positionData[state.selectedPlayerId] = [];
  }
  
  const positions = state.positionData[state.selectedPlayerId];
  if (positions.length >= 2) {
    connectMarkers(
      positions[positions.length - 2],
      positions[positions.length - 1],
      trailContainer
    );
  }
}

export function connectMarkers(pos1, pos2, container) {
  let svg = container.querySelector('svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    container.insertBefore(svg, container.firstChild);
  }
  
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', pos1.x);
  line.setAttribute('y1', pos1.y);
  line.setAttribute('x2', pos2.x);
  line.setAttribute('y2', pos2.y);
  line.setAttribute('stroke', 'rgba(255, 0, 0, 0.4)');
  line.setAttribute('stroke-width', '2');
  
  svg.appendChild(line);
}

export function startPlayerTracking(player) {
  console.log(`Starting tracking for player: ${player.name}`);
  
  state.positionData[state.selectedPlayerId] = [];
  
  if (state.trackingInterval) {
    clearInterval(state.trackingInterval);
    state.trackingInterval = null;
  }
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target;
        if (element.title === player.name || 
            element.getAttribute('data-name') === player.name ||
            (element.textContent && element.textContent.includes(player.name))) {
          console.log('Player element style changed:', element);
        }
      }
    }
  });
  
  const replayArea = document.getElementById('position-graph-contents') || 
                    document.getElementById('position-graph');
  if (replayArea) {
    observer.observe(replayArea, {
      attributes: true,
      attributeFilter: ['style', 'transform'],
      subtree: true
    });
  }
  
  state.trackingInterval = setInterval(() => {
    if (!state.isCollecting || state.selectedPlayerId !== player.id) {
      clearInterval(state.trackingInterval);
      state.trackingInterval = null;
      observer.disconnect();
      return;
    }
    
    const position = findPlayerPosition(player.name);
    
    if (position) {
      const time = getCurrentReplayTime();
      
      state.positionData[state.selectedPlayerId].push({
        x: position.x,
        y: position.y,
        time: time
      });
      
      createTrailMarker(position.x, position.y, time);
    } else {
      console.log('No position found for player at time:', getCurrentReplayTime());
    }
  }, 500);
}

export function startCollection() {
  if (state.isCollecting) {
    state.isCollecting = false;
    if (state.trackingInterval) {
      clearInterval(state.trackingInterval);
      state.trackingInterval = null;
    }
    
    const button = document.getElementById('collect-data');
    button.textContent = 'Collect Movement Data';
    button.style.backgroundColor = '#4CAF50';
    updateStatus('Data collection stopped');
    return;
  }
  
  const playerSelect = document.getElementById('player-select');
  const selectedIndex = playerSelect.value;
  
  if (!selectedIndex) {
    updateStatus('Please select a player');
    return;
  }
  
  const player = state.playerData[selectedIndex];
  state.selectedPlayerId = selectedIndex;
  state.isCollecting = true;
  
  const button = document.getElementById('collect-data');
  button.textContent = 'Stop Collection';
  button.style.backgroundColor = '#f44336';
  
  updateStatus(`Starting to track ${player.name}...`);
  
  state.positionData[state.selectedPlayerId] = [];
  clearTrail();
  setupTrailOverlay();
  startPlayerTracking(player);
}