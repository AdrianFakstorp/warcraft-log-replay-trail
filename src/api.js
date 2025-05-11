import { getReportInfoFromUrl } from './utils.js';
import { state } from './constants.js';

export async function fetchReportData() {
  const { reportCode, fightId } = getReportInfoFromUrl();
  if (!reportCode) {
    console.error('Could not extract report code from URL');
    return null;
  }

  console.log(`Attempting to fetch data for report: ${reportCode}, fight: ${fightId}`);

  try {
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
    
    if (window._reportData) {
      console.log('Using global report data');
      return window._reportData;
    }
    
    return null;
  }
}

export function setupNetworkListener() {
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      if (url.includes('/reports/') && 
         (url.includes('/fights') || url.includes('/summary-graph/') || url.includes('/tables/'))) {
        
        console.log(`Monitoring XHR request to: ${url}`);
        
        this.addEventListener('load', function() {
          try {
            const data = JSON.parse(this.responseText);
            
            if (data && data.fights && data.friendlies) {
              console.log('Found report data in XHR response!');
              state.reportData = data;
              
              if (document.getElementById('wcl-trail-controls')) {
                // Need to re-run player finding logic here
                // This is handled in init.js
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
  
  window.addEventListener('load', function() {
    const globalVars = ['_reportData', 'reportData', 'wclData', 'pageData'];
    
    for (const varName of globalVars) {
      if (window[varName] && window[varName].fights && window[varName].friendlies) {
        console.log(`Found report data in global variable: ${varName}`);
        state.reportData = window[varName];
        break;
      }
    }
    
    for (const key in window) {
      try {
        const value = window[key];
        if (value && typeof value === 'object' && value.fights && value.friendlies) {
          console.log(`Found potential report data in global variable: ${key}`);
          state.reportData = value;
          break;
        }
      } catch (e) {
        // Ignore errors
      }
    }
  });
}