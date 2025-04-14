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
    const containerRef = useRef(null);
    const gridSize = 20; // Grid size for snapping

    // Ensure snippet has proper position and size
    useEffect(() => {
        if (!snippet.position) {
            console.log('No position found for snippet, using default');
            snippet.position = { x: 0, y: 0 };
        }
        if (!snippet.size) {
            console.log('No size found for snippet, using default');
            snippet.size = { width: 300, height: 200 };
        }
    }, [snippet]);

    // Log container dimensions for debugging
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            console.log(`Snippet ${snippet.id} dimensions:`, {
                position: snippet.position,
                size: snippet.size,
                actualDimensions: {
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left
                }
            });
        }
    }, [snippet.id, snippet.position, snippet.size]);

    useEffect(() => {
        // Add event listeners for drag and resize
        if (!showPreview && onUpdate) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, showPreview, onUpdate]);

    const snapToGrid = (value) => Math.round(value / gridSize) * gridSize;

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
                const maxX = parentRect.width - container.offsetWidth - 10; // 10px buffer
                const maxY = parentRect.height - container.offsetHeight - 10; // 10px buffer

                onUpdate(snippet.id, {
                    position: {
                        x: Math.max(0, Math.min(newX, maxX)),
                        y: Math.max(0, Math.min(newY, maxY))
                    }
                });
            }

            if (isResizing) {
                const deltaWidth = e.clientX - startPos.x;
                const deltaHeight = e.clientY - startPos.y;

                const newWidth = snapToGrid(Math.max(100, startSize.width + deltaWidth));
                const newHeight = snapToGrid(Math.max(100, startSize.height + deltaHeight));

                // Ensure the snippet stays within the parent container
                const maxWidth = Math.max(300, parentRect.width - snippet.position.x - 40); // 40px buffer
                const maxHeight = Math.max(200, parentRect.height - snippet.position.y - 40); // 40px buffer

                onUpdate(snippet.id, {
                    size: {
                        width: Math.min(newWidth, maxWidth),
                        height: Math.min(newHeight, maxHeight)
                    }
                });
            }
        } catch (err) {
            console.error('Error updating snippet:', err);
            if (onError) onError('Failed to update snippet position/size');
            setIsDragging(false);
            setIsResizing(false);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // Ensure snippet has valid position and size
    const safePosition = snippet.position || { x: 0, y: 0 };
    const safeSize = snippet.size || { width: 300, height: 200 };

    return (
        <div
            ref={containerRef}
            className={`snippet-container ${isDragging ? 'dragging' : ''} ${showPreview ? 'preview-mode' : ''}`}
            style={{
                position: 'absolute',
                left: safePosition.x,
                top: safePosition.y,
                width: safeSize.width,
                height: safeSize.height,
                border: showPreview ? 'none' : '1px solid #ccc',
                background: 'white',
                padding: '10px',
                boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.1)',
                borderRadius: '4px',
                cursor: (!showPreview && onUpdate) ? (isDragging ? 'grabbing' : 'grab') : 'default',
                transition: 'box-shadow 0.3s ease',
                userSelect: 'none',
                zIndex: isDragging ? 100 : 10 // Increase z-index when dragging
            }}
            onMouseDown={(!showPreview && onUpdate) ? (e) => handleMouseDown(e, 'drag') : undefined}
        >
            <div 
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
                    />
                    <div className="snippet-info" style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '0',
                        fontSize: '10px',
                        color: '#999',
                        whiteSpace: 'nowrap'
                    }}>
                        {`Position: ${safePosition.x},${safePosition.y} | Size: ${safeSize.width}x${safeSize.height}`}
                    </div>
                </>
            )}
        </div>
    );
};

export default SnippetContainer; 