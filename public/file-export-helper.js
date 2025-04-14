/**
 * HTML Snippet Builder - File Export Helper
 * 
 * This script provides utilities for exporting 3D files (OBJ, MTL) from HTML snippets.
 * Include this script in your HTML snippet to enable file export functionality.
 * 
 * Usage:
 * 1. Include this script in your HTML: 
 *    <script src="/file-export-helper.js"></script>
 * 
 * 2. Use the exportOBJ and exportMTL functions to trigger downloads:
 *    <button onclick="exportOBJ(objContent, 'model.obj')">Download OBJ</button>
 *    <button onclick="exportMTL(mtlContent, 'materials.mtl')">Download MTL</button>
 */

(function() {
    // Check if we're in an iframe environment
    const isInIframe = window !== window.parent;
    
    // Setup export functions based on environment
    if (isInIframe) {
        console.log('File Export Helper: Running in iframe mode');
        
        // Wait for parent window to initialize the download helper
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'helper_loaded') {
                console.log('File Export Helper: Parent download helper loaded');
            }
        });
    } else {
        console.log('File Export Helper: Running in standalone mode');
    }
    
    /**
     * Generic file export function
     * @param {string|Blob} content - The file content
     * @param {string} fileName - The name of the file to save
     * @param {string} mimeType - The MIME type of the file
     */
    window.exportFile = function(content, fileName, mimeType) {
        if (typeof content === 'undefined') {
            console.error('File content is undefined');
            return false;
        }
        
        if (isInIframe && typeof window.parent.postMessage === 'function') {
            // Use the parent window's download handler if available
            window.parent.postMessage({
                type: 'download',
                fileContent: content,
                fileName: fileName,
                fileType: mimeType
            }, '*');
            return true;
        } else {
            // Fallback to direct download
            try {
                let blob;
                
                if (content instanceof Blob) {
                    blob = content;
                } else {
                    blob = new Blob([content], { type: mimeType || 'text/plain' });
                }
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                return true;
            } catch (e) {
                console.error('Export error:', e);
                return false;
            }
        }
    };
    
    /**
     * Export OBJ file
     * @param {string|Blob} content - The OBJ file content
     * @param {string} fileName - The name of the file (defaults to model.obj)
     */
    window.exportOBJ = function(content, fileName = 'model.obj') {
        return exportFile(content, fileName, 'model/obj');
    };
    
    /**
     * Export MTL file
     * @param {string|Blob} content - The MTL file content
     * @param {string} fileName - The name of the file (defaults to materials.mtl)
     */
    window.exportMTL = function(content, fileName = 'materials.mtl') {
        return exportFile(content, fileName, 'model/mtl');
    };
    
    /**
     * Universal downloader function (compatible with FileSaver.js pattern)
     */
    window.saveAs = function(content, fileName, opts) {
        let mimeType = null;
        if (opts && opts.type) {
            mimeType = opts.type;
        }
        return exportFile(content, fileName, mimeType);
    };
    
    // Let parent know we're ready
    if (isInIframe) {
        try {
            window.parent.postMessage({ type: 'fileExportHelperLoaded' }, '*');
        } catch (e) {
            console.warn('Could not notify parent window');
        }
    }
    
    console.log('File Export Helper loaded successfully');
})(); 