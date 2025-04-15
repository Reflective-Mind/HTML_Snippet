import React, { useState, useRef, useEffect, useCallback } from 'react';

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
        } else {
            setPosition(snippet.position);
        }
        
        if (!snippet.size) {
            console.log('No size found for snippet, using default');
            setSize({ width: 300, height: 200 });
        } else {
            setSize(snippet.size);
        }
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
            className={`snippet-container ${isDragging ? 'dragging' : ''} ${showPreview ? 'preview-mode' : ''}`}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                border: showPreview ? 'none' : '1px solid #ccc',
                background: 'white',
                padding: '10px',
                boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.1)',
                borderRadius: '4px',
                cursor: (!showPreview && onUpdate) ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: isDragging ? 'none' : 'box-shadow 0.3s ease',
                userSelect: 'none',
                zIndex: isDragging ? 100 : 10 // Increase z-index when dragging
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