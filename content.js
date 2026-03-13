// Element Capture Content Script
// This script runs in the context of web pages and handles element selection/capture

(function() {
  'use strict';

  let isCapturing = false;
  let captureMode = 'click'; // 'click' or 'multi'
  let highlightedElement = null;
  let options = {
    copyToClipboard: true,
    downloadFile: true
  };

  // Multi selection state
  let selectedElements = [];
  let numberOverlays = []; // Number badges for selected elements

  // Create highlight overlay (for click mode)
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

  // Create confirm button (for multi mode)
  const confirmBtn = document.createElement('div');
  confirmBtn.id = 'element-capture-confirm-btn';
  confirmBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 14px 28px;
    border-radius: 30px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 2147483650;
    display: none;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    user-select: none;
  `;
  confirmBtn.textContent = '✓ Done (0 selected)';
  confirmBtn.addEventListener('click', () => {
    if (selectedElements.length > 0) {
      captureMultipleElements(selectedElements);
      stopCapturing();
    }
  });
  confirmBtn.addEventListener('mouseenter', () => {
    confirmBtn.style.transform = 'translateX(-50%) scale(1.05)';
    confirmBtn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
  });
  confirmBtn.addEventListener('mouseleave', () => {
    confirmBtn.style.transform = 'translateX(-50%) scale(1)';
    confirmBtn.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
  });
  document.body.appendChild(confirmBtn);

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
        startCapturing(request.mode, request.options);
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

  function startCapturing(mode, opts) {
    isCapturing = true;
    captureMode = mode || 'click';
    options = { ...options, ...opts };

    if (captureMode === 'multi') {
      document.body.style.cursor = 'pointer';
      showNotification('Multi Select: Click elements to add them (1, 2, 3...), press Enter when done');
      confirmBtn.style.display = 'block';
      updateConfirmButton();
    } else {
      document.body.style.cursor = 'crosshair';
      showNotification('Element Capture: Click on an element to capture it');
    }

    // Add event listeners (use capture phase to prevent page interactions)
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
  }

  function stopCapturing() {
    isCapturing = false;
    captureMode = 'click';
    document.body.style.cursor = '';
    hideOverlay();
    hideTooltip();
    confirmBtn.style.display = 'none';
    clearNumberOverlays();
    selectedElements = [];

    // Remove event listeners
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('mousedown', handleMouseDown, true);
    document.removeEventListener('keydown', handleKeyDown);

    showNotification('Element Capture stopped');
  }

  function handleMouseOver(e) {
    if (!isCapturing) return;

    const element = e.target;
    if (element === overlay || element === tooltip || element === confirmBtn) return;

    if (captureMode === 'click') {
      highlightElement(element);
    } else {
      // Multi mode - show preview highlight
      previewHighlight(element);
    }
  }

  function handleMouseOut(e) {
    if (!isCapturing) return;

    if (captureMode === 'click') {
      hideOverlay();
      hideTooltip();
    }
    // In multi mode, we keep the number overlays visible
  }

  function handleMouseDown(e) {
    if (!isCapturing) return;

    const element = e.target;
    if (element === overlay || element === tooltip || element === confirmBtn) return;

    // Prevent any default action and stop propagation
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  function handleClick(e) {
    if (!isCapturing) return;

    const element = e.target;
    if (element === overlay || element === tooltip || element === confirmBtn) return;

    e.preventDefault();
    e.stopPropagation();

    if (captureMode === 'click') {
      captureElement(element);
      stopCapturing();
    } else {
      // Multi mode - toggle selection
      toggleElementSelection(element);
    }
  }

  function handleKeyDown(e) {
    if (!isCapturing) return;

    if (e.key === 'Escape') {
      stopCapturing();
    } else if (e.key === 'Enter' && captureMode === 'multi') {
      if (selectedElements.length > 0) {
        captureMultipleElements(selectedElements);
        stopCapturing();
      }
    }
  }

  function toggleElementSelection(element) {
    // Check if already selected
    const index = selectedElements.indexOf(element);

    if (index !== -1) {
      // Already selected - remove it
      selectedElements.splice(index, 1);
      removeNumberOverlay(index);
      // Re-number remaining elements
      updateAllNumberOverlays();
    } else {
      // Not selected - add it
      selectedElements.push(element);
      createNumberOverlay(element, selectedElements.length);
    }

    updateConfirmButton();
  }

  function createNumberOverlay(element, number) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Create highlight border
    const border = document.createElement('div');
    border.className = 'element-capture-number-border';
    border.style.cssText = `
      position: absolute;
      border: 3px solid #4caf50;
      background: rgba(76, 175, 80, 0.15);
      pointer-events: none;
      z-index: 2147483646;
    `;
    border.style.top = (rect.top + scrollTop) + 'px';
    border.style.left = (rect.left + scrollLeft) + 'px';
    border.style.width = rect.width + 'px';
    border.style.height = rect.height + 'px';
    document.body.appendChild(border);

    // Create number badge
    const badge = document.createElement('div');
    badge.className = 'element-capture-number-badge';
    badge.style.cssText = `
      position: absolute;
      top: ${rect.top + scrollTop - 12}px;
      left: ${rect.left + scrollLeft - 12}px;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    `;
    badge.textContent = number;
    document.body.appendChild(badge);

    numberOverlays.push({ border, badge, element });
  }

  function removeNumberOverlay(index) {
    if (numberOverlays[index]) {
      numberOverlays[index].border.remove();
      numberOverlays[index].badge.remove();
      numberOverlays.splice(index, 1);
    }
  }

  function updateAllNumberOverlays() {
    // Clear all overlays
    clearNumberOverlays();
    // Recreate with new numbers
    selectedElements.forEach((el, i) => {
      createNumberOverlay(el, i + 1);
    });
  }

  function clearNumberOverlays() {
    numberOverlays.forEach(({ border, badge }) => {
      border.remove();
      badge.remove();
    });
    numberOverlays = [];
  }

  function updateConfirmButton() {
    const count = selectedElements.length;
    confirmBtn.textContent = count > 0
      ? `✓ Done (${count} selected)`
      : '✓ Done (click elements to select)';
    confirmBtn.style.background = count > 0
      ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
      : 'linear-gradient(135deg, #999 0%, #777 100%)';
  }

  function previewHighlight(element) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    overlay.style.display = 'block';
    overlay.style.top = (rect.top + scrollTop) + 'px';
    overlay.style.left = (rect.left + scrollLeft) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    // Check if already selected
    const index = selectedElements.indexOf(element);
    if (index !== -1) {
      tooltip.textContent = `Click to deselect (#${index + 1})`;
    } else {
      const tagName = element.tagName.toLowerCase();
      tooltip.textContent = `Click to select as #${selectedElements.length + 1}`;
    }
    tooltip.style.display = 'block';
    tooltip.style.left = (rect.right + 10) + 'px';
    tooltip.style.top = (rect.top + 10) + 'px';
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

    const tagName = element.tagName.toLowerCase();
    const className = element.className ? '.' + element.className.split(' ').join('.') : '';
    const id = element.id ? '#' + element.id : '';
    tooltip.textContent = `Click to capture: ${tagName}${id}${className}`;
    tooltip.style.display = 'block';
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

  // ========== CAPTURE FUNCTIONS ==========

  async function captureElement(element) {
    showNotification('Capturing element...');

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showNotification('Failed to capture element', 'error');
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `element-capture-${timestamp}.png`;

        if (options.downloadFile) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }

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

  async function captureMultipleElements(elements) {
    if (elements.length === 0) return;

    showNotification(`Capturing ${elements.length} element${elements.length !== 1 ? 's' : ''}...`);

    try {
      // Store computed styles and positions before capturing
      const elementData = [];
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      // Calculate bounding box and store element info
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const absTop = rect.top + scrollTop;
        const absLeft = rect.left + scrollLeft;

        minX = Math.min(minX, absLeft);
        minY = Math.min(minY, absTop);
        maxX = Math.max(maxX, absLeft + rect.width);
        maxY = Math.max(maxY, absTop + rect.height);

        elementData.push({
          element: el,
          rect: rect,
          absTop: absTop,
          absLeft: absLeft
        });
      }

      const padding = 20;
      const totalWidth = maxX - minX + padding * 2;
      const totalHeight = maxY - minY + padding * 2;
      const scale = window.devicePixelRatio || 1;

      // Capture each element individually using html2canvas
      const capturedCanvases = [];
      for (const data of elementData) {
        try {
          const canvas = await html2canvas(data.element, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            scale: scale,
            logging: false
          });
          capturedCanvases.push({
            canvas: canvas,
            x: data.absLeft - minX + padding,
            y: data.absTop - minY + padding
          });
        } catch (err) {
          console.error('Error capturing element:', err);
        }
      }

      if (capturedCanvases.length === 0) {
        showNotification('Failed to capture elements', 'error');
        return;
      }

      // Create final canvas combining all captures
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = totalWidth * scale;
      finalCanvas.height = totalHeight * scale;
      const ctx = finalCanvas.getContext('2d');

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Draw each captured element onto the final canvas
      for (const captured of capturedCanvases) {
        ctx.drawImage(
          captured.canvas,
          captured.x * scale,
          captured.y * scale,
          captured.canvas.width,
          captured.canvas.height
        );
      }

      // Convert to blob
      finalCanvas.toBlob(async (blob) => {
        if (!blob) {
          showNotification('Failed to capture elements', 'error');
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `element-capture-${timestamp}.png`;

        if (options.downloadFile) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }

        if (options.copyToClipboard) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showNotification(`✓ ${elements.length} element${elements.length !== 1 ? 's' : ''} captured and copied!`, 'success');
          } catch (err) {
            console.error('Clipboard error:', err);
            showNotification(`✓ ${elements.length} element${elements.length !== 1 ? 's' : ''} captured!`, 'success');
          }
        } else {
          showNotification(`✓ ${elements.length} element${elements.length !== 1 ? 's' : ''} captured!`, 'success');
        }
      }, 'image/png');

    } catch (error) {
      console.error('Capture error:', error);
      showNotification('Failed to capture elements: ' + error.message, 'error');
    }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'element-capture-notification';
    notification.textContent = message;

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
      max-width: 350px;
    `;

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

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

})();
