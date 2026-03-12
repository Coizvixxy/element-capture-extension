# Element Capture - Chrome Extension

A Chrome extension that allows you to capture specific HTML elements (divs, sections, etc.) from any webpage, rather than capturing the entire page or just the visible screen.

## Features

- ✅ **Targeted Capture**: Click on any element to capture only that specific part
- ✅ **Live Preview**: Hover over elements to see what will be captured
- ✅ **Clipboard Support**: Copy captures directly to clipboard
- ✅ **Download Support**: Save captures as PNG files
- ✅ **High Quality**: Uses device pixel ratio for sharp images
- ✅ **Element Info**: Shows tag name, class, and ID on hover

## How to Use

1. **Install the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `element-capture-extension` folder

2. **Capture an Element**:
   - Navigate to any webpage
   - Click the Element Capture extension icon in the toolbar
   - Click "Start Capturing"
   - Hover over any element to highlight it
   - Click on the element you want to capture
   - The image will be automatically downloaded and/or copied to clipboard

3. **Cancel Capturing**:
   - Press `Esc` key or click "Cancel" in the popup

## Options

In the extension popup, you can choose:
- **Copy to clipboard**: Automatically copy captures to clipboard
- **Download as file**: Save captures as PNG files

## Technical Details

### Files

- `manifest.json`: Extension configuration
- `popup.html/css/js`: Extension popup interface
- `content.js/css`: Content script that runs on web pages
- `icons/`: Extension icons

### How It Works

1. When you click "Start Capturing", the content script adds event listeners to the page
2. As you move your mouse, elements are highlighted with a blue border
3. When you click, the extension uses `html2canvas` library to render the element as an image
4. The image is converted to PNG and downloaded/copied based on your settings

### Dependencies

- **html2canvas**: Library for capturing DOM elements as images (loaded from CDN)

## Permissions

- `activeTab`: Access to the current tab to inject content scripts
- `downloads`: Download captured images (optional, for download feature)

## Privacy

This extension:
- ✅ Does NOT collect any data
- ✅ Does NOT communicate with external servers (except loading html2canvas from CDN)
- ✅ Works entirely locally in your browser
- ✅ Does NOT track your browsing activity

## Development

To modify the extension:

1. Make changes to any files
2. Go to `chrome://extensions/`
3. Click the reload icon on the Element Capture extension card
4. Test your changes on a webpage

## Troubleshooting

**Extension not working?**
- Refresh the webpage after installing
- Check browser console for errors
- Try reinstalling the extension

**Can't capture certain elements?**
- Some elements with complex CSS or iframes may not capture perfectly
- Try capturing a parent element instead

**Clipboard not working?**
- Some browsers may require additional permissions for clipboard access
- Make sure you've granted clipboard permissions when prompted

## License

MIT License - Feel free to modify and distribute

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
