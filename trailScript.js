// This file contains the code that will be injected into the page
// It will be loaded as a web accessible resource

// Object to store trails for multiple players
const playerTrails = {};

// Modify the setupPlayerTrail function to take a color parameter
function setupPlayerTrail(playerName, playerColor = '125, 32, 39') {
  // Check if this player already has a trail
  if (playerTrails[playerName]) {
    console.log(`Trail for ${playerName} already exists, updating color to ${playerColor}`);
    playerTrails[playerName].color = playerColor;
    return;
  }
  
  console.log(`Setting up trail for ${playerName} with color ${playerColor}`);
  
  // Create a new trail object for this player
  playerTrails[playerName] = {
    positionHistory: [],
    stationaryPoints: [],
    color: playerColor,
    visible: true
  };
  
  // Set initial global visibility state if not already set
  if (window.trailsVisible === undefined) {
    window.trailsVisible = true;
  }
  
  // Check if we've already modified the function
  if (!window.originalDrawActorAndInstance) {
    console.log('Intercepting drawActorAndInstance function');
    
    // Store the original function
    window.originalDrawActorAndInstance = window.drawActorAndInstance;
    
    // Create a wrapper function that adds trails for all tracked players
    window.drawActorAndInstance = function(e, t, i, r, a) {
      // First call the original function to draw everything normally
      const result = window.originalDrawActorAndInstance.apply(this, arguments);
      
      // Don't draw anything if visibility is off
      if (!window.trailsVisible) {
        return result;
      }
      
      // Check if this is one of our tracked actors
      if (t && t.name && playerTrails[t.name] && i.drawX !== undefined && i.drawY !== undefined) {
        const playerName = t.name;
        const trail = playerTrails[playerName];
        
        // Skip if this specific trail is hidden
        if (!trail.visible) {
          return result;
        }
        
        const currentPos = { 
          x: i.drawX, 
          y: i.drawY, 
          time: Date.now(),
          // Get current timestamp from replay if available
          replayTimestamp: window.currentReplayTimestamp || null
        };
        
        // Check if this is a new position (avoid duplicates from multiple redraws)
        const lastPos = trail.positionHistory.length > 0 ? 
          trail.positionHistory[trail.positionHistory.length - 1] : null;
        
        if (!lastPos) {
          // First position
          trail.positionHistory.push(currentPos);
        } else if ((Math.abs(currentPos.x - lastPos.x) > 1 || Math.abs(currentPos.y - lastPos.y) > 1) && 
                  (currentPos.time - lastPos.time > 100)) {
          
          // Check for stationary points
          const timeDiff = currentPos.time - lastPos.time;
          
          if (timeDiff >= config.stationaryThresholdMs && 
              Math.abs(currentPos.x - lastPos.x) < 5 && 
              Math.abs(currentPos.y - lastPos.y) < 5) {
            
            // Add to stationary points list with duration info
            trail.stationaryPoints.push({
              x: lastPos.x,
              y: lastPos.y,
              duration: timeDiff,
              time: lastPos.time
            });
            
            console.log(`${playerName} was stationary at (${lastPos.x.toFixed(0)}, ${lastPos.y.toFixed(0)}) for ${timeDiff}ms`);
          }
          
          // Add current position to history
          trail.positionHistory.push(currentPos);
          
          console.log(`Updated ${playerName} trail, now has ${trail.positionHistory.length} points, ${trail.stationaryPoints.length} stationary points`);
        }
        
        // Draw the trail
        drawPlayerTrail(e, playerName, trail);
      }
      
      return result;
    };
    
    console.log('Successfully intercepted drawActorAndInstance function');
  }
  
  // Send confirmation message back to extension
  window.postMessage({
    type: 'wcl-trail-status',
    message: `Now tracking ${playerName}`,
    playerName: playerName,
    success: true
  }, '*');
}

// Config parameters for the trail visualization
const config = {
  // Line appearance
  mainLineWidth: 4,
  mainLineOpacity: 0.8,
  outlineWidth: 6,
  outlineOpacity: 0.5,
  
  // Regular position markers
  positionMarkerSize: 4,
  positionMarkerOpacity: 0.5,
  
  // Stationary position markers (where player stopped)
  stationaryMarkerMinSize: 8,   // Minimum size for stationary markers
  stationaryMarkerMaxSize: 20,  // Maximum size for stationary markers
  stationaryMarkerOpacity: 0.7, // Base opacity for stationary markers
  
  // Time thresholds
  stationaryThresholdMs: 500,   // Time in one spot to be considered "stationary"
  maxStationaryTimeMs: 5000     // Time for maximum stationary marker size
};

// Separate function to draw a player's trail
function drawPlayerTrail(ctx, playerName, trail) {
  // Save current context state
  ctx.save();
  
  // Use the player's color
  const trailColor = trail.color;
  const outlineColor = '45, 45, 45'; // Dark gray outline for all trails
  
  // Draw lines to connect all points
  if (trail.positionHistory.length > 1) {
    // First draw the outline (wider stroke in dark gray)
    ctx.beginPath();
    ctx.moveTo(trail.positionHistory[0].x, trail.positionHistory[0].y);
    
    for (let i = 1; i < trail.positionHistory.length; i++) {
      ctx.lineTo(trail.positionHistory[i].x, trail.positionHistory[i].y);
    }
    
    ctx.lineWidth = config.outlineWidth;
    ctx.strokeStyle = `rgba(${outlineColor}, ${config.outlineOpacity})`;
    ctx.stroke();
    
    // Then draw the main line in player's color
    ctx.beginPath();
    ctx.moveTo(trail.positionHistory[0].x, trail.positionHistory[0].y);
    
    for (let i = 1; i < trail.positionHistory.length; i++) {
      ctx.lineTo(trail.positionHistory[i].x, trail.positionHistory[i].y);
    }
    
    ctx.lineWidth = config.mainLineWidth;
    ctx.strokeStyle = `rgba(${trailColor}, ${config.mainLineOpacity})`;
    ctx.stroke();
  }
  
  // Draw small dots for movement points
  trail.positionHistory.forEach((pos) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, config.positionMarkerSize, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(${trailColor}, ${config.positionMarkerOpacity})`;
    ctx.fill();
  });
  
  // Draw the start label
  if (trail.positionHistory.length > 1) {
    const startPos = trail.positionHistory[0];
    
    // Draw player name at start
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = `rgba(${trailColor}, 1.0)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw shadow/outline for better visibility
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(playerName, startPos.x, startPos.y - 15);
    ctx.fillText(playerName, startPos.x, startPos.y - 15);
    
    // Draw an arrow pointing to the start
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y - 10);
    ctx.lineTo(startPos.x - 5, startPos.y - 5);
    ctx.lineTo(startPos.x + 5, startPos.y - 5);
    ctx.closePath();
    ctx.fillStyle = `rgba(${trailColor}, 1.0)`;
    ctx.fill();
  }
  
  // Draw larger circles for stationary points
  trail.stationaryPoints.forEach((point) => {
    // Calculate size based on duration
    const clampedDuration = Math.min(Math.max(point.duration, config.stationaryThresholdMs), config.maxStationaryTimeMs);
    
    // Map to size range
    const sizeRange = config.stationaryMarkerMaxSize - config.stationaryMarkerMinSize;
    const durationRange = config.maxStationaryTimeMs - config.stationaryThresholdMs;
    const sizeRatio = (clampedDuration - config.stationaryThresholdMs) / durationRange;
    
    const size = config.stationaryMarkerMinSize + (sizeRatio * sizeRange);
    const opacity = config.stationaryMarkerOpacity;
    
    // Draw outline
    ctx.beginPath();
    ctx.arc(point.x, point.y, size + 2, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(${outlineColor}, ${opacity})`;
    ctx.fill();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(${trailColor}, ${opacity})`;
    ctx.fill();
    
    // Add duration text for larger circles
    if (size > 12) {
      ctx.font = '10px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(point.duration / 1000).toFixed(1)}s`, point.x, point.y);
    }
  });
  
  // Restore context state
  ctx.restore();
}

// Add new function to remove a player's trail
function removePlayerTrail(playerName) {
  if (playerTrails[playerName]) {
    console.log(`Removing trail for ${playerName}`);
    delete playerTrails[playerName];
    
    window.postMessage({
      type: 'wcl-trail-status',
      message: `Removed trail for ${playerName}`,
      playerName: playerName,
      success: true
    }, '*');
    
    return true;
  }
  
  console.log(`No trail found for ${playerName}`);
  return false;
}

// Update the clear function to clear all trails
function clearAllTrails() {
  console.log('Clearing all trails');
  
  // Reset all player trails
  Object.keys(playerTrails).forEach(playerName => {
    delete playerTrails[playerName];
  });
  
  window.postMessage({
    type: 'wcl-trail-status',
    message: 'All trails cleared',
    success: true
  }, '*');
}

// Update event listener to handle new message types
window.addEventListener('message', function(event) {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  console.log('Message received in trailScript:', event.data);

  switch (event.data.type) {
    case 'wcl-trail-setup':
      setupPlayerTrail(event.data.playerName, event.data.playerColor);
      break;
      
    case 'wcl-trail-remove':
      removePlayerTrail(event.data.playerName);
      break;
      
    case 'wcl-trail-clear-all':
      clearAllTrails();
      break;
      
    case 'wcl-trail-visibility':
      window.trailsVisible = event.data.visible;
      console.log(`Trail visibility set to: ${window.trailsVisible}`);
      break;
      
    case 'wcl-trail-timestamp':
      window.currentReplayTimestamp = event.data.timestamp;
      break;
      
    case 'wcl-trail-clear':
      // For backward compatibility
      clearAllTrails();
      break;
  }
});

console.log('Warcraft Logs Movement Trails: Script loaded');