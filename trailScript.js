// This file contains the code that will be injected into the page
// It will be loaded as a web accessible resource

// Function to set up player trail tracking
function setupPlayerTrail(playerName) {
  // Array to store all positions (no limit now to show complete route)
  const positionHistory = [];
  
  // Store stationary points separately - places where player stood still
  const stationaryPoints = [];
  
  // Set initial visibility state
  window.trailVisible = true;
  
  // Config parameters for the trail visualization
  const config = {
    // Line appearance
    mainLineWidth: 4,
    mainLineOpacity: 0.8,
    outlineWidth: 6,
    outlineOpacity: 0.7,
    
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
  
  // Check if we've already modified the function
  if (!window.originalDrawActorAndInstance) {
    console.log(`Setting up trail for ${playerName}`);
    
    // Store the original function
    window.originalDrawActorAndInstance = window.drawActorAndInstance;
    
    // Create a wrapper function that adds a trail
    window.drawActorAndInstance = function(e, t, i, r, a) {
      // First call the original function to draw everything normally
      const result = window.originalDrawActorAndInstance.apply(this, arguments);
      
      // Check if this is the actor we're interested in
      if (t && t.name === playerName && i.drawX !== undefined && i.drawY !== undefined) {
        const currentPos = { 
          x: i.drawX, 
          y: i.drawY, 
          time: Date.now(),
          // Get current timestamp from replay if available
          replayTimestamp: window.currentReplayTimestamp || null
        };
        
        // Check if this is a new position (avoid duplicates from multiple redraws)
        const lastPos = positionHistory.length > 0 ? positionHistory[positionHistory.length - 1] : null;
        
        if (!lastPos) {
          // First position
          positionHistory.push(currentPos);
        } else if ((Math.abs(currentPos.x - lastPos.x) > 1 || Math.abs(currentPos.y - lastPos.y) > 1) && 
                  (currentPos.time - lastPos.time > 100)) {
          
          // If the player was stationary for enough time, add to stationary points
          const timeDiff = currentPos.time - lastPos.time;
          
          if (timeDiff >= config.stationaryThresholdMs && 
              Math.abs(currentPos.x - lastPos.x) < 5 && 
              Math.abs(currentPos.y - lastPos.y) < 5) {
            
            // Add to stationary points list with duration info
            stationaryPoints.push({
              x: lastPos.x,
              y: lastPos.y,
              duration: timeDiff,
              time: lastPos.time
            });
            
            console.log(`Player was stationary at (${lastPos.x.toFixed(0)}, ${lastPos.y.toFixed(0)}) for ${timeDiff}ms`);
          }
          
          // Add current position to history
          positionHistory.push(currentPos);
          
          // No longer limiting history size - we want to see the whole path
          console.log(`Updated ${playerName} trail, now has ${positionHistory.length} points, ${stationaryPoints.length} stationary points`);
        }
        
        // Only draw the trail if visibility is explicitly set to true
        if (window.trailVisible === true) {
          // Get canvas context (e is already the context)
          const ctx = e;
          
          // Save current context state
          ctx.save();
          
          // Use deep red color for the trail
          const trailColor = '125, 32, 39'; // #7D2027 converted to RGB
          const outlineColor = '45, 45, 45'; // #2D2D2D converted to RGB
          
          // Draw lines to connect all points (for a more continuous trail effect)
          if (positionHistory.length > 1) {
            // First draw the outline (wider stroke in dark gray)
            ctx.beginPath();
            ctx.moveTo(positionHistory[0].x, positionHistory[0].y);
            
            for (let i = 1; i < positionHistory.length; i++) {
              ctx.lineTo(positionHistory[i].x, positionHistory[i].y);
            }
            
            ctx.lineWidth = config.outlineWidth;
            ctx.strokeStyle = `rgba(${outlineColor}, ${config.outlineOpacity})`;
            ctx.stroke();
            
            // Then draw the main line (thinner, in deep red)
            ctx.beginPath();
            ctx.moveTo(positionHistory[0].x, positionHistory[0].y);
            
            for (let i = 1; i < positionHistory.length; i++) {
              ctx.lineTo(positionHistory[i].x, positionHistory[i].y);
            }
            
            ctx.lineWidth = config.mainLineWidth;
            ctx.strokeStyle = `rgba(${trailColor}, ${config.mainLineOpacity})`;
            ctx.stroke();
          }
          
          // Draw small dots for movement points (more subtle)
          positionHistory.forEach((pos) => {
            // Small circles for regular path
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, config.positionMarkerSize, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${trailColor}, ${config.positionMarkerOpacity})`;
            ctx.fill();
          });
          
          // Draw the path with only the start label
          if (positionHistory.length > 1) {
            // Draw "Start" label at the first position
            const startPos = positionHistory[0];
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw white outline for better visibility
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText('Start', startPos.x, startPos.y - 15);
            ctx.fillText('Start', startPos.x, startPos.y - 15);
            
            // Draw an arrow or marker pointing to the exact start point
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y - 10);
            ctx.lineTo(startPos.x - 5, startPos.y - 5);
            ctx.lineTo(startPos.x + 5, startPos.y - 5);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
          }
          
          // Draw larger circles for stationary points (much more noticeable)
          stationaryPoints.forEach((point) => {
            // Calculate size based on duration
            // Clamp duration between threshold and max
            const clampedDuration = Math.min(Math.max(point.duration, config.stationaryThresholdMs), config.maxStationaryTimeMs);
            
            // Map to size range
            const sizeRange = config.stationaryMarkerMaxSize - config.stationaryMarkerMinSize;
            const durationRange = config.maxStationaryTimeMs - config.stationaryThresholdMs;
            const sizeRatio = (clampedDuration - config.stationaryThresholdMs) / durationRange;
            
            const size = config.stationaryMarkerMinSize + (sizeRatio * sizeRange);
            
            // Stronger opacity for stationary points
            const opacity = config.stationaryMarkerOpacity;
            
            // Draw big outlined circle for stationary points
            // Outline
            ctx.beginPath();
            ctx.arc(point.x, point.y, size + 2, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${outlineColor}, ${opacity})`;
            ctx.fill();
            
            // Inner circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${trailColor}, ${opacity})`;
            ctx.fill();
            
            // Optional: Add a text label with duration in seconds
            if (size > 12) { // Only add text for larger circles
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
      }
      
      return result;
    };
    
    // Add a function to clear the trail
    window.clearPlayerTrail = function() {
      positionHistory.length = 0;
      stationaryPoints.length = 0;
      console.log(`Cleared ${playerName} position trail`);
    };
    
    console.log('Successfully intercepted drawActorAndInstance function');
    console.log(`Now creating a trail for actor with name "${playerName}"`);
    console.log('To clear the trail, run: window.clearPlayerTrail()');
    
    // Send message back to extension
    window.postMessage({
      type: 'wcl-trail-status',
      message: `Now tracking ${playerName}`,
      playerName: playerName,
      success: true
    }, '*');
  } else {
    // Already set up, just change the player
    console.log(`Changing tracked player to ${playerName}`);
    
    // Clear existing trail
    positionHistory.length = 0;
    stationaryPoints.length = 0;
    
    // Update tracking function with new player name
    window.drawActorAndInstance = function(e, t, i, r, a) {
      // First call the original function to draw everything normally
      const result = window.originalDrawActorAndInstance.apply(this, arguments);
      
      // Check if this is the actor we're interested in
      if (t && t.name === playerName && i.drawX !== undefined && i.drawY !== undefined) {
        const currentPos = { 
          x: i.drawX, 
          y: i.drawY, 
          time: Date.now(),
          // Get current timestamp from replay if available
          replayTimestamp: window.currentReplayTimestamp || null
        };
        
        // Check if this is a new position (avoid duplicates from multiple redraws)
        const lastPos = positionHistory.length > 0 ? positionHistory[positionHistory.length - 1] : null;
        
        if (!lastPos) {
          // First position
          positionHistory.push(currentPos);
        } else if ((Math.abs(currentPos.x - lastPos.x) > 1 || Math.abs(currentPos.y - lastPos.y) > 1) && 
                  (currentPos.time - lastPos.time > 100)) {
          
          // If the player was stationary for enough time, add to stationary points
          const timeDiff = currentPos.time - lastPos.time;
          
          if (timeDiff >= config.stationaryThresholdMs && 
              Math.abs(currentPos.x - lastPos.x) < 5 && 
              Math.abs(currentPos.y - lastPos.y) < 5) {
            
            // Add to stationary points list with duration info
            stationaryPoints.push({
              x: lastPos.x,
              y: lastPos.y,
              duration: timeDiff,
              time: lastPos.time
            });
            
            console.log(`Player was stationary at (${lastPos.x.toFixed(0)}, ${lastPos.y.toFixed(0)}) for ${timeDiff}ms`);
          }
          
          // Add current position to history
          positionHistory.push(currentPos);
          
          // No longer limiting history size - we want to see the whole path
          console.log(`Updated ${playerName} trail, now has ${positionHistory.length} points, ${stationaryPoints.length} stationary points`);
        }
        
        // Only draw the trail if visibility is explicitly set to true
        if (window.trailVisible === true) {
          // Get canvas context (e is already the context)
          const ctx = e;
          
          // Save current context state
          ctx.save();
          
          // Use deep red color for the trail
          const trailColor = '125, 32, 39'; // #7D2027 converted to RGB
          const outlineColor = '45, 45, 45'; // #2D2D2D converted to RGB
          
          // Draw lines to connect all points (for a more continuous trail effect)
          if (positionHistory.length > 1) {
            // First draw the outline (wider stroke in dark gray)
            ctx.beginPath();
            ctx.moveTo(positionHistory[0].x, positionHistory[0].y);
            
            for (let i = 1; i < positionHistory.length; i++) {
              ctx.lineTo(positionHistory[i].x, positionHistory[i].y);
            }
            
            ctx.lineWidth = config.outlineWidth;
            ctx.strokeStyle = `rgba(${outlineColor}, ${config.outlineOpacity})`;
            ctx.stroke();
            
            // Then draw the main line (thinner, in deep red)
            ctx.beginPath();
            ctx.moveTo(positionHistory[0].x, positionHistory[0].y);
            
            for (let i = 1; i < positionHistory.length; i++) {
              ctx.lineTo(positionHistory[i].x, positionHistory[i].y);
            }
            
            ctx.lineWidth = config.mainLineWidth;
            ctx.strokeStyle = `rgba(${trailColor}, ${config.mainLineOpacity})`;
            ctx.stroke();
          }
          
          // Draw small dots for movement points (more subtle)
          positionHistory.forEach((pos) => {
            // Small circles for regular path
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, config.positionMarkerSize, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${trailColor}, ${config.positionMarkerOpacity})`;
            ctx.fill();
          });
          
          // Draw the path with only the start label
          if (positionHistory.length > 1) {
            // Draw "Start" label at the first position
            const startPos = positionHistory[0];
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw white outline for better visibility
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText('Start', startPos.x, startPos.y - 15);
            ctx.fillText('Start', startPos.x, startPos.y - 15);
            
            // Draw an arrow or marker pointing to the exact start point
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y - 10);
            ctx.lineTo(startPos.x - 5, startPos.y - 5);
            ctx.lineTo(startPos.x + 5, startPos.y - 5);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
          }
          
          // Draw larger circles for stationary points (much more noticeable)
          stationaryPoints.forEach((point) => {
            // Calculate size based on duration
            // Clamp duration between threshold and max
            const clampedDuration = Math.min(Math.max(point.duration, config.stationaryThresholdMs), config.maxStationaryTimeMs);
            
            // Map to size range
            const sizeRange = config.stationaryMarkerMaxSize - config.stationaryMarkerMinSize;
            const durationRange = config.maxStationaryTimeMs - config.stationaryThresholdMs;
            const sizeRatio = (clampedDuration - config.stationaryThresholdMs) / durationRange;
            
            const size = config.stationaryMarkerMinSize + (sizeRatio * sizeRange);
            
            // Stronger opacity for stationary points
            const opacity = config.stationaryMarkerOpacity;
            
            // Draw big outlined circle for stationary points
            // Outline
            ctx.beginPath();
            ctx.arc(point.x, point.y, size + 2, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${outlineColor}, ${opacity})`;
            ctx.fill();
            
            // Inner circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(${trailColor}, ${opacity})`;
            ctx.fill();
            
            // Optional: Add a text label with duration in seconds
            if (size > 12) { // Only add text for larger circles
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
      }
      
      return result;
    };
    
    console.log(`Now tracking ${playerName}`);
    window.postMessage({
      type: 'wcl-trail-status',
      message: `Now tracking ${playerName}`,
      playerName: playerName,
      success: true
    }, '*');
  }
}

// Function to receive messages from the content script
window.addEventListener('message', function(event) {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  console.log('Message received in trailScript:', event.data);

  if (event.data.type === 'wcl-trail-setup') {
    console.log('Received setup request from content script:', event.data);
    setupPlayerTrail(event.data.playerName);
  }
  
  // Handle replay time updates if provided by content script
  if (event.data.type === 'wcl-trail-timestamp') {
    window.currentReplayTimestamp = event.data.timestamp;
  }
  
  // Handle clear trail request - FIXED
  if (event.data.type === 'wcl-trail-clear') {
    console.log('Received clear trail request');
    if (typeof window.clearPlayerTrail === 'function') {
      window.clearPlayerTrail();
      window.postMessage({
        type: 'wcl-trail-status',
        message: 'Trail cleared'
      }, '*');
    } else {
      console.error('clearPlayerTrail function not found');
    }
  }
  
  // Handle visibility toggle - FIXED
  if (event.data.type === 'wcl-trail-visibility') {
    console.log(`Trail visibility set to: ${event.data.visible}`);
    window.trailVisible = event.data.visible;
    
    if (!window.trailVisible) {
      console.log('Trail hidden');
    } else {
      console.log('Trail shown');
    }
  }
});

console.log('Warcraft Logs Movement Trails: Script loaded');