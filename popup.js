// Popup state
let isCapturing = false;

// DOM elements
const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');
const copyToClipboardCheckbox = document.getElementById('copyToClipboard');
const downloadFileCheckbox = document.getElementById('downloadFile');
const statusDiv = document.getElementById('status');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  startBtn.addEventListener('click', startCapturing);
  cancelBtn.addEventListener('click', stopCapturing);

  // Check if already capturing (in case popup was reopened)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
      if (response && response.isCapturing) {
        showCapturingState();
      }
    });
  });
});

function startCapturing() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'startCapturing',
      options: {
        copyToClipboard: copyToClipboardCheckbox.checked,
        downloadFile: downloadFileCheckbox.checked
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error: Please refresh the page and try again', 'error');
        return;
      }

      if (response && response.success) {
        showCapturingState();
        showStatus('Hover over any element to capture it', 'info');
        window.close();
      }
    });
  });
}

function stopCapturing() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCapturing' }, (response) => {
      showIdleState();
      showStatus('Capturing cancelled', 'info');
    });
  });
}

function showCapturingState() {
  isCapturing = true;
  startBtn.style.display = 'none';
  cancelBtn.style.display = 'flex';
}

function showIdleState() {
  isCapturing = false;
  startBtn.style.display = 'flex';
  cancelBtn.style.display = 'none';
}

function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;

  // Clear status after 3 seconds
  setTimeout(() => {
    if (statusDiv.textContent === message) {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }
  }, 3000);
}
