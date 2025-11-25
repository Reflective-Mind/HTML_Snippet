import React, { useState, useRef, useEffect, useCallback } from 'react';

// Add CSS animation for snippet placement
if (typeof document !== 'undefined' && !document.getElementById('snippet-container-styles')) {
    const style = document.createElement('style');
    style.id = 'snippet-container-styles';
    style.textContent = `
        @keyframes snippetPlaceAnimation {
            0% {
                transform: scale(0.8) rotate(-2deg);
                opacity: 0;
            }
            50% {
                transform: scale(1.1) rotate(1deg);
            }
            100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
            }
        }
        
        .snippet-container.just-placed {
            animation: snippetPlaceAnimation 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .snippet-container:hover:not(.dragging) {
            transform: scale(1.02) !important;
            transition: all 0.2s ease !important;
        }
    `;
    document.head.appendChild(style);
}

// Color palette for snippet containers
const COLOR_PALETTE = [
    { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#667eea' },
    { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '#f5576c' },
    { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: '#4facfe' },
    { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', border: '#43e97b' },
    { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', border: '#fa709a' },
    { bg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', border: '#30cfd0' },
    { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', border: '#a8edea' },
    { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', border: '#ff9a9e' },
    { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', border: '#fcb69f' },
    { bg: 'linear-gradient(135deg, #ff8a80 0%, #ff5722 100%)', border: '#ff5722' },
    { bg: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', border: '#66a6ff' },
    { bg: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', border: '#a6c1ee' }
];

// Generate or get color for a snippet
const getSnippetColor = (snippetId) => {
    // If snippet already has a color, use it
    if (snippetId && typeof snippetId === 'string') {
        // Use a hash of the snippet ID to consistently pick a color
        let hash = 0;
        for (let i = 0; i < snippetId.length; i++) {
            hash = snippetId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % COLOR_PALETTE.length;
        return COLOR_PALETTE[index];
    }
    // Otherwise pick a random color
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
};

const SnippetContainer = ({ 
    snippet, 
    showPreview, 
    onUpdate,
    onError 
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startSize, setStartSize] = useState({ width: 0, height: 0 });
    const [position, setPosition] = useState(snippet.position || { x: 0, y: 0 });
    const [size, setSize] = useState(snippet.size || { width: 300, height: 200 });
    const [contentRendered, setContentRendered] = useState(false);
    const [snippetColor, setSnippetColor] = useState(() => getSnippetColor(snippet.id));
    const [justPlaced, setJustPlaced] = useState(true);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const scriptsRef = useRef([]);
    const gridSize = 20; // Grid size for snapping
    const debounceTimer = useRef(null);
    const updateDebounceTimer = useRef(null);

    // Ensure snippet has proper position and size
    useEffect(() => {
        if (!snippet.position) {
            console.log('No position found for snippet, using default');
            setPosition({ x: 0, y: 0 });
            // If this is a new snippet being placed, trigger animation
            setJustPlaced(true);
            setTimeout(() => setJustPlaced(false), 600);
        } else {
            setPosition(snippet.position);
        }
        
        if (!snippet.size) {
            console.log('No size found for snippet, using default');
            setSize({ width: 300, height: 200 });
        } else {
            setSize(snippet.size);
        }
        
        // Set color based on snippet ID for consistency
        setSnippetColor(getSnippetColor(snippet.id));
    }, [snippet.id]); // Only update when snippet ID changes to avoid loops

    // Initialize script content in the snippet after render
    useEffect(() => {
        // Reset contentRendered state when snippet content changes
        if (snippet.html) {
            setContentRendered(false);
        }
    }, [snippet.html]);

    // Clean up function to remove all scripts created by this component
    const cleanupScripts = useCallback(() => {
        // Remove any script elements tracked by this component
        if (scriptsRef.current.length > 0) {
            console.log(`Cleaning up ${scriptsRef.current.length} scripts for snippet ${snippet.id}`);
            
            scriptsRef.current.forEach(script => {
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            });
            
            // Reset the scripts array
            scriptsRef.current = [];
        }
    }, [snippet.id]);

    // Execute scripts when the content is mounted or changes
    useEffect(() => {
        if (contentRef.current && !contentRendered) {
            try {
                // Cleanup any existing scripts first
                cleanupScripts();
                
                // Initialize window functions if needed
                if (showPreview) {
                    window.isPreviewMode = true;
                }
                
                // Get all scripts from the content
                const scripts = contentRef.current.querySelectorAll('script:not([data-executed="true"])');
                
                if (scripts.length > 0) {
                    console.log(`Executing ${scripts.length} scripts for snippet ${snippet.id}`);
                    
                    // Execute each script
                    Array.from(scripts).forEach((script, index) => {
                        const newScript = document.createElement('script');
                        
                        // Copy all attributes
                        Array.from(script.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });
                        
                        // Copy content
                        newScript.textContent = script.textContent;
                        
                        // Mark as executed
                        newScript.setAttribute('data-executed', 'true');
                        newScript.setAttribute('data-snippet-id', snippet.id);
                        
                        // Track this script for cleanup
                        scriptsRef.current.push(newScript);
                        
                        // Replace original script or append to content
                        if (script.parentNode) {
                            script.parentNode.replaceChild(newScript, script);
                        } else {
                            contentRef.current.appendChild(newScript);
                        }
                        
                        console.log(`Executed script ${index + 1} for snippet ${snippet.id}`);
                    });
                }
                
                setContentRendered(true);
                console.log(`Content rendered for snippet ${snippet.id}`);
            } catch (err) {
                console.error('Error initializing snippet content:', err);
                if (onError) onError(`Failed to initialize snippet content: ${err.message}`);
            }
        }
    }, [snippet.id, snippet.html, showPreview, contentRendered, onError, cleanupScripts]);

    // Clean up scripts when component unmounts or snippet changes
    useEffect(() => {
        return () => {
            cleanupScripts();
            
            // Clear any pending debounce timers
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            
            if (updateDebounceTimer.current) {
                clearTimeout(updateDebounceTimer.current);
            }
            
            console.log(`Component cleanup for snippet ${snippet.id}`);
        };
    }, [snippet.id, cleanupScripts]);

    // Update local state when snippet prop changes
    useEffect(() => {
        if (snippet.position && !isDragging) {
            setPosition(snippet.position);
        }
        if (snippet.size && !isResizing) {
            setSize(snippet.size);
        }
    }, [snippet.position, snippet.size, isDragging, isResizing]);

    // Add event listeners for drag and resize
    useEffect(() => {
        if (!showPreview && onUpdate) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            // Clear any pending debounce
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            if (updateDebounceTimer.current) {
                clearTimeout(updateDebounceTimer.current);
            }
        };
    }, [isDragging, isResizing, showPreview, onUpdate, position, size]);

    const snapToGrid = (value) => Math.round(value / gridSize) * gridSize;

    // Debounced update to reduce server calls
    const debouncedUpdate = useCallback((updates) => {
        if (updateDebounceTimer.current) {
            clearTimeout(updateDebounceTimer.current);
        }
        
        updateDebounceTimer.current = setTimeout(() => {
            if (onUpdate) {
                onUpdate(snippet.id, updates);
            }
        }, 100); // 100ms debounce time
    }, [snippet.id, onUpdate]);

    const handleMouseDown = (e, action) => {
        if (showPreview || !onUpdate) return;

        e.preventDefault();
        e.stopPropagation();
        const rect = containerRef.current.getBoundingClientRect();

        if (action === 'drag') {
            setIsDragging(true);
            setStartPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        } else if (action === 'resize') {
            setIsResizing(true);
            setStartPos({
                x: e.clientX,
                y: e.clientY
            });
            setStartSize({
                width: rect.width,
                height: rect.height
            });
        }
    };

    const handleTouchStart = (e, action) => {
        if (showPreview || !onUpdate) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        
        if (action === 'drag') {
            setIsDragging(true);
            setStartPos({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            });
        } else if (action === 'resize') {
            setIsResizing(true);
            setStartPos({
                x: touch.clientX,
                y: touch.clientY
            });
            setStartSize({
                width: rect.width,
                height: rect.height
            });
        }
    };

    const handleMouseMove = (e) => {
        if ((!isDragging && !isResizing) || !onUpdate) return;

        try {
            const container = containerRef.current;
            if (!container) return;
            
            const parentRect = container.parentElement.getBoundingClientRect();

            if (isDragging) {
                const newX = snapToGrid(e.clientX - parentRect.left - startPos.x);
                const newY = snapToGrid(e.clientY - parentRect.top - startPos.y);

                // Ensure the snippet stays within the parent container
                const maxX = parentRect.width - container.offsetWidth;
                const maxY = parentRect.height - container.offsetHeight;
                
                const safeX = Math.max(0, Math.min(newX, maxX));
                const safeY = Math.max(0, Math.min(newY, maxY));
                
                // Update local state immediately for smooth UI
                setPosition({ x: safeX, y: safeY });
                
                // Debounced update to backend
                debouncedUpdate({
                    position: { x: safeX, y: safeY }
                });
            }

            if (isResizing) {
                const deltaWidth = e.clientX - startPos.x;
                const deltaHeight = e.clientY - startPos.y;

                const newWidth = snapToGrid(Math.max(100, startSize.width + deltaWidth));
                const newHeight = snapToGrid(Math.max(100, startSize.height + deltaHeight));

                // Ensure the snippet stays within reasonable bounds
                const maxWidth = Math.min(1200, parentRect.width - position.x);
                const maxHeight = Math.min(800, parentRect.height - position.y);
                
                const safeWidth = Math.min(newWidth, maxWidth);
                const safeHeight = Math.min(newHeight, maxHeight);
                
                // Update local state immediately for smooth UI
                setSize({ width: safeWidth, height: safeHeight });
                
                // Debounced update to backend
                debouncedUpdate({
                    size: { width: safeWidth, height: safeHeight }
                });
            }
        } catch (err) {
            console.error('Error updating snippet:', err);
            if (onError) onError('Failed to update snippet position/size');
            setIsDragging(false);
            setIsResizing(false);
        }
    };

    const handleTouchMove = (e) => {
        if ((!isDragging && !isResizing) || !onUpdate) return;
        
        e.preventDefault(); // Prevent scrolling while dragging
        
        try {
            const touch = e.touches[0];
            const container = containerRef.current;
            if (!container) return;
            
            const parentRect = container.parentElement.getBoundingClientRect();

            if (isDragging) {
                const newX = snapToGrid(touch.clientX - parentRect.left - startPos.x);
                const newY = snapToGrid(touch.clientY - parentRect.top - startPos.y);

                // Ensure the snippet stays within the parent container
                const maxX = parentRect.width - container.offsetWidth;
                const maxY = parentRect.height - container.offsetHeight;
                
                const safeX = Math.max(0, Math.min(newX, maxX));
                const safeY = Math.max(0, Math.min(newY, maxY));
                
                // Update local state immediately for smooth UI
                setPosition({ x: safeX, y: safeY });
                
                // Debounced update to backend
                debouncedUpdate({
                    position: { x: safeX, y: safeY }
                });
            }

            if (isResizing) {
                const deltaWidth = touch.clientX - startPos.x;
                const deltaHeight = touch.clientY - startPos.y;

                const newWidth = snapToGrid(Math.max(100, startSize.width + deltaWidth));
                const newHeight = snapToGrid(Math.max(100, startSize.height + deltaHeight));

                // Ensure the snippet stays within reasonable bounds
                const maxWidth = Math.min(1200, parentRect.width - position.x);
                const maxHeight = Math.min(800, parentRect.height - position.y);
                
                const safeWidth = Math.min(newWidth, maxWidth);
                const safeHeight = Math.min(newHeight, maxHeight);
                
                // Update local state immediately for smooth UI
                setSize({ width: safeWidth, height: safeHeight });
                
                // Debounced update to backend
                debouncedUpdate({
                    size: { width: safeWidth, height: safeHeight }
                });
            }
        } catch (err) {
            console.error('Error updating snippet on touch:', err);
            if (onError) onError('Failed to update snippet position/size');
            setIsDragging(false);
            setIsResizing(false);
        }
    };

    const handleMouseUp = () => {
        if (!isDragging && !isResizing) return;
        
        // Perform final update when releasing mouse
        if (isDragging && onUpdate) {
            console.log('Final position update:', position);
            onUpdate(snippet.id, { position });
        }
        
        if (isResizing && onUpdate) {
            console.log('Final size update:', size);
            onUpdate(snippet.id, { size });
        }
        
        setIsDragging(false);
        setIsResizing(false);
    };

    const handleTouchEnd = () => {
        if (!isDragging && !isResizing) return;
        
        // Perform final update when touch ends
        if (isDragging && onUpdate) {
            console.log('Final position update (touch):', position);
            onUpdate(snippet.id, { position });
        }
        
        if (isResizing && onUpdate) {
            console.log('Final size update (touch):', size);
            onUpdate(snippet.id, { size });
        }
        
        setIsDragging(false);
        setIsResizing(false);
    };

    return (
        <div
            ref={containerRef}
            className={`snippet-container ${isDragging ? 'dragging' : ''} ${showPreview ? 'preview-mode' : ''} ${justPlaced ? 'just-placed' : ''}`}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                border: showPreview ? 'none' : `3px solid ${snippetColor.border}`,
                background: showPreview ? 'white' : snippetColor.bg,
                padding: '10px',
                boxShadow: isDragging 
                    ? `0 10px 30px rgba(0,0,0,0.4), 0 0 20px ${snippetColor.border}40` 
                    : justPlaced
                        ? `0 8px 25px rgba(0,0,0,0.3), 0 0 15px ${snippetColor.border}60`
                        : `0 4px 12px rgba(0,0,0,0.15), 0 0 8px ${snippetColor.border}30`,
                borderRadius: '12px',
                cursor: (!showPreview && onUpdate) ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: 'none',
                zIndex: isDragging ? 100 : (justPlaced ? 50 : 10),
                transform: justPlaced ? 'scale(1)' : 'scale(1)'
            }}
            onMouseDown={(!showPreview && onUpdate) ? (e) => handleMouseDown(e, 'drag') : undefined}
            onTouchStart={(!showPreview && onUpdate) ? (e) => handleTouchStart(e, 'drag') : undefined}
        >
            <div 
                ref={contentRef}
                className="snippet-content"
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    position: 'relative'
                }}
                dangerouslySetInnerHTML={{ __html: snippet.html }} 
            />
            {!showPreview && onUpdate && (
                <>
                    <div 
                        className="snippet-controls"
                        style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            display: 'flex',
                            gap: '5px',
                            background: 'rgba(255,255,255,0.9)',
                            padding: '5px',
                            borderRadius: '4px',
                            zIndex: 100,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        <button
                            className="edit-button"
                            style={{
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '3px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                            onClick={() => onUpdate(snippet.id, { isEditing: true })}
                        >
                            Edit
                        </button>
                        <button
                            className="delete-button"
                            style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '3px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                if (window.confirm('Delete this snippet?')) {
                                    onUpdate(snippet.id, { delete: true });
                                }
                            }}
                        >
                            Delete
                        </button>
                    </div>
                    <div 
                        className="resize-handle"
                        style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '20px',
                            height: '20px',
                            cursor: 'se-resize',
                            background: 'linear-gradient(135deg, transparent 50%, #007bff 50%)',
                            borderRadius: '0 0 4px 0',
                            opacity: isDragging ? 0 : 0.7,
                            zIndex: 101
                        }}
                        onMouseDown={(e) => handleMouseDown(e, 'resize')}
                        onTouchStart={(e) => handleTouchStart(e, 'resize')}
                    />
                    <div className="snippet-info" style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '0',
                        fontSize: '10px',
                        color: '#999',
                        whiteSpace: 'nowrap'
                    }}>
                        {`Position: ${position.x},${position.y} | Size: ${size.width}x${size.height}`}
                    </div>
                </>
            )}
        </div>
    );
};

export default SnippetContainer; 