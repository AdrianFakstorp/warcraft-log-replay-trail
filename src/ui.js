import { state } from './constants.js';
import { updateStatus } from './utils.js';
import { startCollection } from './tracking.js';

export function createControlPanel(players) {
  console.log('Creating control panel with players:', players.length);
  
  const indicator = document.getElementById('wcl-trail-indicator');
  if (indicator) {
    indicator.textContent = 'Movement Trails: Ready';
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 1s';
    }, 3000);
  }
  
  const existingPanel = document.getElementById('wcl-trail-controls');
  if (existingPanel) {
    existingPanel.remove();
  }
  
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
  
  if (players && players.length > 0) {
    players.sort((a, b) => a.name.localeCompare(b.name));
    
    const playerSelect = document.getElementById('player-select');
    
    players.forEach((player) => {
      const option = document.createElement('option');
      option.value = player.id;
      
      let displayName = player.name;
      if (player.type) {
        displayName += ` (${player.type})`;
      }
      
      option.textContent = displayName;
      playerSelect.appendChild(option);
      
      state.playerData[player.id] = player;
    });
    
    updateStatus(`Found ${players.length} players`);
    
    playerSelect.addEventListener('change', handlePlayerSelection);
  } else {
    updateStatus('No players found for this fight');
  }
  
  document.getElementById('collect-data').addEventListener('click', startCollection);
  document.getElementById('show-trail').addEventListener('change', toggleTrail);
  document.getElementById('exclusive-player').addEventListener('change', function(e) {
    const selectedPlayerId = document.getElementById('player-select').value;
    if (selectedPlayerId) {
      const player = state.playerData[selectedPlayerId];
      if (e.target.checked) {
        toggleOffOtherPlayers(player.name);
      } else {
        enableAllLegendItems();
      }
    }
  });
}

export function handlePlayerSelection(e) {
  const selectedPlayerId = e.target.value;
  
  if (!selectedPlayerId) {
    return;
  }
  
  const player = state.playerData[selectedPlayerId];
  console.log(`Selected player: ${player.name}`);
  
  const exclusiveCheckbox = document.getElementById('exclusive-player');
  if (exclusiveCheckbox && exclusiveCheckbox.checked) {
    toggleOffOtherPlayers(player.name);
  }
  
  updateStatus(`Selected ${player.name}`);
}

export function toggleOffOtherPlayers(selectedPlayerName) {
  console.log(`Toggling off other players except ${selectedPlayerName}`);
  
  const legendItems = document.querySelectorAll('.replay-legend-item.friendly');
  console.log(`Found ${legendItems.length} legend items`);
  
  legendItems.forEach(item => {
    const nameElement = item.querySelector('.replay-legend-name');
    if (!nameElement) return;
    
    const playerName = nameElement.textContent.trim();
    console.log(`Processing legend item: ${playerName}`);
    
    if (playerName !== selectedPlayerName) {
      const isVisible = !nameElement.style.textDecoration || !nameElement.style.textDecoration.includes('line-through');
      
      if (isVisible) {
        console.log(`Toggling off: ${playerName}`);
        item.click();
      }
    } else {
      const isVisible = !nameElement.style.textDecoration || !nameElement.style.textDecoration.includes('line-through');
      
      if (!isVisible) {
        console.log(`Toggling on selected player: ${playerName}`);
        item.click();
      }
    }
  });
}

export function enableAllLegendItems() {
  console.log('Re-enabling all legend items');
  
  const legendItems = document.querySelectorAll('.replay-legend-item.friendly');
  
  legendItems.forEach(item => {
    const nameElement = item.querySelector('.replay-legend-name');
    if (!nameElement) return;
    
    const isHidden = nameElement.style.textDecoration && nameElement.style.textDecoration.includes('line-through');
    
    if (isHidden) {
      console.log(`Re-enabling: ${nameElement.textContent.trim()}`);
      item.click();
    }
  });
}

export function toggleTrail(e) {
  const visible = e.target.checked;
  const trailOverlay = document.getElementById('wcl-trail-svg');
  if (trailOverlay) {
    trailOverlay.style.display = visible ? 'block' : 'none';
  }
  updateStatus(`Trail visibility: ${visible ? 'On' : 'Off'}`);
}