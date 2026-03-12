// Element Capture Content Script
// This script runs in the context of web pages and handles element selection/capture

(function() {
  'use strict';

  let isCapturing = false;
  let highlightedElement = null;
  let options = {
    copyToClipboard: true,
    downloadFile: true
  };

  // Create highlight overlay
  const overlay = document.createElement('div');
  overlay.id = 'element-capture-overlay';
  overlay.style.cssText = `
    position: absolute;
    border: 3px solid #667eea;
    background: rgba(102, 126, 234, 0.1);
    pointer-events: none;
    z-index: 2147483647;
    display: none;
    box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
  `;
  document.body.appendChild(overlay);

  // Create info tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'element-capture-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    z-index: 2147483648;
    pointer-events: none;
    display: none;
    white-space: nowrap;
  `;
  document.body.appendChild(tooltip);

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'startCapturing':
        startCapturing(request.options);
        sendResponse({ success: true });
        return true;

      case 'stopCapturing':
        stopCapturing();
        sendResponse({ success: true });
        return true;

      case 'getStatus':
        sendResponse({ isCapturing });
        return true;
    }
  });

  function startCapturing(opts) {
    isCapturing = true;
    options = { ...options, ...opts };
    document.body.style.cursor = 'crosshair';
    showNotification('Element Capture: Move your mouse over an element and click to capture it');

    // Add event listeners
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
  }

  function stopCapturing() {
    isCapturing = false;
    document.body.style.cursor = '';
    hideOverlay();
    hideTooltip();

    // Remove event listeners
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
    document.removeEventListener('click', handleClick);
    document.removeEventListener('keydown', handleKeyDown);

    showNotification('Element Capture stopped');
  }

  function handleMouseOver(e) {
    if (!isCapturing) return;

    const element = e.target;
    if (element === overlay || element === tooltip) return;

    highlightElement(element);
  }

  function handleMouseOut(e) {
    if (!isCapturing) return;
    hideOverlay();
    hideTooltip();
  }

  function handleClick(e) {
    if (!isCapturing) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    if (element === overlay || element === tooltip) return;

    captureElement(element);
    stopCapturing();
  }

  function handleKeyDown(e) {
    if (!isCapturing) return;

    if (e.key === 'Escape') {
      stopCapturing();
    }
  }

  function highlightElement(element) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    overlay.style.display = 'block';
    overlay.style.top = (rect.top + scrollTop) + 'px';
    overlay.style.left = (rect.left + scrollLeft) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    // Show tooltip with element info
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? '.' + element.className.split(' ').join('.') : '';
    const id = element.id ? '#' + element.id : '';
    tooltip.textContent = `Click to capture: ${tagName}${id}${className}`;
    tooltip.style.display = 'block';

    // Position tooltip near mouse
    tooltip.style.left = (rect.right + 10) + 'px';
    tooltip.style.top = (rect.top + 10) + 'px';

    highlightedElement = element;
  }

  function hideOverlay() {
    overlay.style.display = 'none';
    highlightedElement = null;
  }

  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  async function captureElement(element) {
    showNotification('Capturing element...');

    try {
      // Use html2canvas library for screenshot
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        logging: false
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showNotification('Failed to capture element', 'error');
          return;
        }

        // Create file name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `element-capture-${timestamp}.png`;

        // Download if enabled
        if (options.downloadFile) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }

        // Copy to clipboard if enabled
        if (options.copyToClipboard) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showNotification('✓ Element captured and copied to clipboard!', 'success');
          } catch (err) {
            console.error('Clipboard error:', err);
            showNotification('✓ Element captured (downloaded)', 'success');
          }
        } else {
          showNotification('✓ Element captured!', 'success');
        }
      }, 'image/png');

    } catch (error) {
      console.error('Capture error:', error);
      showNotification('Failed to capture element: ' + error.message, 'error');
    }
  }

  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'element-capture-notification';
    notification.textContent = message;

    // Apply styles based on type
    const bgColor = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 2147483649;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;

    // Add animation keyframes
    if (!document.getElementById('element-capture-styles')) {
      const style = document.createElement('style');
      style.id = 'element-capture-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove after delay
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

})();
