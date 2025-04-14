import React, { useState, useRef, useEffect } from 'react';

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
    const gridSize = 20; // Grid size for snapping
    const debounceTimer = useRef(null);

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

    // Execute scripts when the content is mounted or changes
    useEffect(() => {
        if (contentRef.current && !contentRendered) {
            try {
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
    }, [snippet.id, snippet.html, showPreview, contentRendered, onError]);

    // Clean up scripts when component unmounts
    useEffect(() => {
        return () => {
            // Remove any script elements added by this snippet
            const snippetScripts = document.querySelectorAll(`script[data-snippet-id="${snippet.id}"]`);
            snippetScripts.forEach(script => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            });
            console.log(`Cleaned up scripts for snippet ${snippet.id}`);
        };
    }, [snippet.id]);

    // Update local state when snippet prop changes
    useEffect(() => {
        if (snippet.position && !isDragging) {
            setPosition(snippet.position);
        }
        if (snippet.size && !isResizing) {
            setSize(snippet.size);
        }
    }, [snippet.position, snippet.size, isDragging, isResizing]);

    // Add global mouse and touch event listeners
    useEffect(() => {
        // Define event handler references to use for both adding and removing
        const mouseMoveHandler = (e) => handleMouseMove(e);
        const mouseUpHandler = (e) => handleMouseUp(e);
        const touchMoveHandler = (e) => handleTouchMove(e);
        const touchEndHandler = (e) => handleTouchEnd(e);
        
        if (isDragging || isResizing) {
            // Add event listeners to document level to capture events outside component
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
            document.addEventListener('touchmove', touchMoveHandler, { passive: false });
            document.addEventListener('touchend', touchEndHandler);
            
            // Log that we've attached handlers
            console.log(`Event handlers attached for snippet ${snippet.id}`);
        }
        
        // Make sure to clean up handlers properly
        return () => {
            // Clean up event listeners when component unmounts or state changes
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
            
            // Clear any pending debounce
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
            
            // Also make sure to clean up if the component unmounts while dragging
            if (isDragging || isResizing) {
                document.body.classList.remove('snippet-dragging');
                console.log(`Event handlers cleaned up for snippet ${snippet.id}`);
            }
        };
    }, [isDragging, isResizing, snippet.id]);

    const snapToGrid = (value) => Math.round(value / gridSize) * gridSize;

    // Debounced update to reduce server calls
    const debouncedUpdate = (updates) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        debounceTimer.current = setTimeout(() => {
            if (onUpdate) {
                onUpdate(snippet.id, updates);
            }
        }, 100); // 100ms debounce time
    };

    const handleMouseDown = (e, action) => {
        if (showPreview || !onUpdate) return;

        e.preventDefault();
        e.stopPropagation();
        
        // Get dimensions directly from the DOM element
        const rect = containerRef.current.getBoundingClientRect();
        
        // Add dragging class to body to prevent text selection while dragging
        document.body.classList.add('snippet-dragging');

        if (action === 'drag') {
            // Set visual feedback immediately
            setIsDragging(true);
            containerRef.current.style.cursor = 'grabbing';
            containerRef.current.style.zIndex = '100';
            
            setStartPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        } else if (action === 'resize') {
            // Set visual feedback immediately
            setIsResizing(true);
            containerRef.current.style.zIndex = '100';
            
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
        
        // Add dragging class to body to prevent screen movement
        document.body.classList.add('snippet-dragging');
        
        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        
        if (action === 'drag') {
            // Set visual feedback immediately
            setIsDragging(true);
            containerRef.current.style.zIndex = '100';
            
            setStartPos({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            });
        } else if (action === 'resize') {
            // Set visual feedback immediately
            setIsResizing(true);
            containerRef.current.style.zIndex = '100';
            
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
        
        try {
            // Reset cursor and other styles
            if (containerRef.current) {
                containerRef.current.style.cursor = '';
                containerRef.current.style.zIndex = '';
            }
            
            // Remove dragging class from body
            document.body.classList.remove('snippet-dragging');
            
            // Perform final update when releasing mouse
            if (isDragging && onUpdate) {
                console.log('Final position update:', position);
                onUpdate(snippet.id, { position });
            }
            
            if (isResizing && onUpdate) {
                console.log('Final size update:', size);
                onUpdate(snippet.id, { size });
            }
        } catch (err) {
            console.error('Error in mouse up handler:', err);
            if (onError) onError('Failed to update final position/size');
        } finally {
            // Always reset dragging/resizing state even if error occurs
            setIsDragging(false);
            setIsResizing(false);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging && !isResizing) return;
        
        try {
            // Reset visual styles
            if (containerRef.current) {
                containerRef.current.style.zIndex = '';
            }
            
            // Remove dragging class from body
            document.body.classList.remove('snippet-dragging');
            
            // Update backend when touch ends
            if (isDragging && onUpdate) {
                console.log('Final position update (touch):', position);
                onUpdate(snippet.id, { position });
            }
            
            if (isResizing && onUpdate) {
                console.log('Final size update (touch):', size);
                onUpdate(snippet.id, { size });
            }
        } catch (err) {
            console.error('Error in touch end handler:', err);
            if (onError) onError('Failed to update final position/size');
        } finally {
            // Always reset state even if error occurs
            setIsDragging(false);
            setIsResizing(false);
        }
    };

    // Function to safely execute HTML with scripts
    const executeHtml = (htmlContent) => {
        // Create a temporary div to parse the HTML
        const div = document.createElement('div');
        div.innerHTML = htmlContent;
        
        // Execute all scripts
        const scripts = div.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            const newScript = document.createElement('script');
            
            // Copy attributes
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copy content
            newScript.innerHTML = script.innerHTML;
            
            // Flag as executed
            newScript.setAttribute('data-executed', 'true');
        }
        
        return div.innerHTML;
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
                touchAction: 'none', // Prevent browser handling of touch gestures
                zIndex: isDragging || isResizing ? 100 : 10
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