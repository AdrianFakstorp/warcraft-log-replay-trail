// Check if we're on a Warcraft Logs replay page
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    
    if (currentUrl.includes('warcraftlogs.com')) {
      if (currentUrl.includes('view=replay')) {
        document.body.innerHTML += '<p style="color: #28a745;">You are on a Warcraft Logs replay page. The extension should be active.</p>';
      } else {
        document.body.innerHTML += '<p style="color: #ffc107;">You are on Warcraft Logs, but not on a replay page. Navigate to a replay view to use this extension.</p>';
      }
    } else {
      document.body.innerHTML += '<p style="color: #dc3545;">You are not on Warcraft Logs. Navigate there to use this extension.</p>';
    }
  });