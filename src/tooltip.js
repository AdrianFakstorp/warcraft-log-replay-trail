import { formatTime } from './utils.js';

export function showTooltip(e) {
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
    tooltip.style.fontSize = '12px';
    document.body.appendChild(tooltip);
  }
  
  tooltip.textContent = `Time: ${time}`;
  tooltip.style.left = `${e.clientX + 10}px`;
  tooltip.style.top = `${e.clientY + 10}px`;
  tooltip.style.display = 'block';
}

export function hideTooltip() {
  const tooltip = document.getElementById('wcl-trail-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}