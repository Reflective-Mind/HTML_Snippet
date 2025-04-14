# Viewport Positioning and File Export Fixes

This document explains the fixes implemented for two issues in the HTML Snippet Builder:

1. **Viewport Positioning Issue**: Snippets positioned on the left of the admin view appeared in the middle for viewers.
2. **File Export Functionality**: Export of OBJ and MTL files wasn't working, unlike in Wix snippets.

## 1. Viewport Positioning Fix

### Problem
When placing snippets in the admin interface, their positioning would appear differently in the viewer interface. Specifically, snippets placed on the left side would appear centered when viewed by regular users.

### Solution
We implemented a responsive positioning system that:

- Uses percentage-based positioning in preview/viewer mode
- Maintains pixel-based positioning in admin/edit mode
- Dynamically converts between these two modes when rendering snippets
- Keeps track of original pixel positions for consistent editing

### Key Changes:
- Modified `renderSnippets()` to calculate percentage-based positions based on container dimensions
- Updated `setupDragAndResize()` to handle container boundaries better
- Added viewport-aware positioning that scales with different screen sizes
- Improved CSS for better responsive behavior

## 2. File Export Functionality

### Problem
The application couldn't export OBJ and MTL files from HTML snippets, while the same snippets in Wix could perform these exports successfully.

### Solution
We implemented a comprehensive file download system that:

- Allows HTML snippets to export files through a messaging system
- Supports OBJ and MTL file formats specifically
- Provides compatibility with common libraries like FileSaver.js
- Works through iframe boundaries securely

### Key Changes:
- Added `file-export-helper.js` script for snippet authors to include
- Implemented messaging system between iframes and main application
- Created download proxy endpoints in the server
- Modified security settings to allow file downloads
- Updated iframe sandbox attributes to permit download operations

## How to Use

### Responsive Positioning
This works automatically. No changes needed to your snippets.

### File Export Functionality
To enable file exports in your HTML snippets:

1. Include the helper script in your snippet HTML:
   ```html
   <script src="/file-export-helper.js"></script>
   ```

2. Use the provided functions to trigger downloads:
   ```javascript
   // Export OBJ file
   exportOBJ(objContent, 'model.obj');
   
   // Export MTL file
   exportMTL(mtlContent, 'materials.mtl');
   
   // Export any other file
   exportFile(fileContent, 'filename.ext', 'mime/type');
   ```

## Sample HTML Snippet
A sample 3D model with export functionality is available at:
```
/samples/3d-model-export.html
```

You can add this to any page to test the export functionality.

## Technical Details

The file export system works through a combination of:

1. **Message Passing**: Uses the browser's `postMessage` API to communicate between iframes and the parent window
2. **Blob Creation**: Converts string or binary data to downloadable Blobs
3. **URL Creation**: Uses `URL.createObjectURL()` to generate download links
4. **DOM Manipulation**: Creates temporary download links to trigger the browser's download mechanism

The positioning system works through:

1. **Container Dimensions**: Measures the snippet container at render time
2. **Percentage Calculation**: Converts absolute pixel positions to percentage-based positions
3. **Conditional Rendering**: Applies different positioning strategies based on preview mode
4. **Position Tracking**: Maintains original pixel positions for edit mode 