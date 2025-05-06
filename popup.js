// Simple functionality for the popup
console.log('Popup script loaded');

// Check if we're on a Warcraft Logs page
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  const currentUrl = tabs[0].url;
  const isWarcraftLogs = currentUrl.includes('warcraftlogs.com');
  
  if (!isWarcraftLogs) {
    document.body.innerHTML += '<p style="color: #d9534f;">You are not on Warcraft Logs. Navigate there to use this extension.</p>';
  }
});