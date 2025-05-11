export function isReplayPage() {
  return window.location.href.includes('view=replay');
}

export function getReportInfoFromUrl() {
  const url = window.location.href;
  const reportMatch = url.match(/reports\/([^/?]+)/);
  const fightMatch = url.match(/fight=(\d+)/);
  
  return {
    reportCode: reportMatch ? reportMatch[1] : null,
    fightId: fightMatch ? fightMatch[1] : null
  };
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function updateStatus(message) {
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

export function getCurrentReplayTime() {
  // Method 1: Look for the replay time counter
  const timeElement = document.getElementById('replay-current-time') || 
                     document.querySelector('.timeline-time') ||
                     document.querySelector('[data-replay-time]');
  
  if (timeElement) {
    const timeText = timeElement.textContent.trim();
    
    // Parse MM:SS format
    const parts = timeText.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    }
    
    // Try to parse as seconds
    const seconds = parseFloat(timeText);
    if (!isNaN(seconds)) {
      return seconds;
    }
  }
  
  // Method 2: Look for timeline position
  const timeline = document.querySelector('.timeline-bar, .timeline-progress');
  if (timeline) {
    const width = timeline.offsetWidth;
    const progress = parseFloat(timeline.style.width) / 100;
    // Assumes fight duration is available somewhere
    const duration = getFightDuration();
    if (duration) {
      return duration * progress;
    }
  }
  
  return 0;
}

export function getFightDuration() {
  const durationElement = document.getElementById('replay-fight-duration') ||
                         document.querySelector('.fight-duration');
  
  if (durationElement) {
    const durationText = durationElement.textContent.trim();
    const parts = durationText.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
  }
  
  // Fallback: check if duration is in a global variable
  if (window.fightDuration) {
    return window.fightDuration;
  }
  
  return null;
}