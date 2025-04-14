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
            snippet.position = { x: 0, y: 0 };
        }
        if (!snippet.size) {
            snippet.size = { width: 300, height: 200 };
        }
    }, [snippet]);

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
    }, [isDragging, isResizing, showPreview]);

    const snapToGrid = (value) => Math.round(value / gridSize) * gridSize;

    const handleMouseDown = (e, action) => {
        if (showPreview || !onUpdate) return;

        e.preventDefault();
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
                const maxX = parentRect.width - container.offsetWidth;
                const maxY = parentRect.height - container.offsetHeight;

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
                const maxWidth = parentRect.width - snippet.position.x;
                const maxHeight = parentRect.height - snippet.position.y;

                onUpdate(snippet.id, {
                    size: {
                        width: Math.min(newWidth, maxWidth),
                        height: Math.min(newHeight, maxHeight)
                    }
                });
            }
        } catch (err) {
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
                cursor: (!showPreview && onUpdate) ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onMouseDown={onUpdate ? (e) => handleMouseDown(e, 'drag') : undefined}
        >
            <div 
                className="snippet-content"
                dangerouslySetInnerHTML={{ __html: snippet.html }} 
            />
            {!showPreview && onUpdate && (
                <div className="snippet-controls">
                    <button
                        className="edit-button"
                        onClick={() => onUpdate(snippet.id, { isEditing: true })}
                    >
                        Edit
                    </button>
                    <div 
                        className="snippet-resize-handle"
                        onMouseDown={(e) => handleMouseDown(e, 'resize')}
                    />
                </div>
            )}
        </div>
    );
};

export default SnippetContainer; 