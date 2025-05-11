// This file is just a loader for our modular code
// Chrome extensions can't use ES6 modules directly in content scripts
// So we inject a script tag that loads our module

(function() {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = chrome.runtime.getURL('src/init.js');
  document.head.appendChild(script);
})();