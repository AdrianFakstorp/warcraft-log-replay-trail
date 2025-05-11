import { state } from './constants.js';
import { isReplayPage, getReportInfoFromUrl, updateStatus } from './utils.js';
import { fetchReportData, setupNetworkListener } from './api.js';
import { createControlPanel } from './ui.js';

async function initialize() {
  console.log('Initializing on replay page');
  
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
  
  updateStatus('Fetching report data...');
  state.reportData = await fetchReportData();
  
  if (state.reportData) {
    findPlayersFromReportData();
  } else {
    updateStatus('Error: Failed to fetch report data');
    console.error('Failed to fetch report data and no fallback available');
  }
}

function findPlayersFromReportData() {
  if (!state.reportData || !state.reportData.friendlies) {
    updateStatus('Error: No player data found in report');
    console.error('Report data is missing friendlies array:', state.reportData);
    return;
  }
  
  const { fightId } = getReportInfoFromUrl();
  if (!fightId) {
    updateStatus('Error: Could not determine fight ID from URL');
    return;
  }
  
  console.log(`Looking for players in fight ${fightId}`);
  console.log('Report data structure:', Object.keys(state.reportData));
  console.log('Number of friendlies:', state.reportData.friendlies.length);
  
  const playersInFight = state.reportData.friendlies.filter(player => 
    player.fights && player.fights.includes(`.${fightId}.`)
  );
  
  console.log(`Found ${playersInFight.length} players in fight ${fightId}`);
  console.log('First few players:', playersInFight.slice(0, 3));
  
  if (playersInFight.length === 0) {
    updateStatus('No players found for this fight');
    return;
  }
  
  const formattedPlayerData = playersInFight.map((player, index) => ({
    name: player.name,
    id: player.id || `player-${index}`,
    type: player.type,
    server: player.server,
    icon: player.icon
  }));
  
  createControlPanel(formattedPlayerData);
}

// Initialize
setupNetworkListener();

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