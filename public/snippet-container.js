// Browser-compatible SnippetContainer class
class SnippetContainer {
    constructor(snippet, showPreview = false, onUpdate = () => {}, onError = () => {}) {
        this.snippet = snippet;
        this.showPreview = showPreview;
        this.onUpdate = onUpdate;
        this.onError = onError;
        this.isDragging = false;
        this.isResizing = false;
        this.startPos = { x: 0, y: 0 };
        this.startSize = { width: 0, height: 0 };
        this.gridSize = 20;
        
        this.container = document.createElement('div');
        this.setupContainer();
        this.setupEventListeners();
    }

    setupContainer() {
        this.container.className = `snippet-container ${this.showPreview ? 'preview-mode' : ''}`;
        this.container.style.position = 'absolute';
        this.container.style.left = `${this.snippet.position.x}px`;
        this.container.style.top = `${this.snippet.position.y}px`;
        this.container.style.width = `${this.snippet.size.width}px`;
        this.container.style.height = `${this.snippet.size.height}px`;
        this.container.style.cursor = 'grab';

        const content = document.createElement('div');
        content.className = 'snippet-content';
        content.innerHTML = this.snippet.html;
        this.container.appendChild(content);

        if (!this.showPreview) {
            const controls = document.createElement('div');
            controls.className = 'snippet-controls';
            controls.innerHTML = `
                <button class="edit-button">Edit</button>
                <div class="snippet-resize-handle"></div>
            `;
            this.container.appendChild(controls);
        }
    }

    setupEventListeners() {
        if (this.showPreview) return;

        this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'drag'));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());

        const resizeHandle = this.container.querySelector('.snippet-resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.handleMouseDown(e, 'resize');
            });
        }

        const editButton = this.container.querySelector('.edit-button');
        if (editButton) {
            editButton.addEventListener('click', () => {
                this.onUpdate(this.snippet.id, { isEditing: true });
            });
        }
    }

    snapToGrid(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    handleMouseDown(e, action) {
        if (this.showPreview) return;

        e.preventDefault();
        const rect = this.container.getBoundingClientRect();

        if (action === 'drag') {
            this.isDragging = true;
            this.startPos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.container.style.cursor = 'grabbing';
        } else if (action === 'resize') {
            this.isResizing = true;
            this.startPos = {
                x: e.clientX,
                y: e.clientY
            };
            this.startSize = {
                width: rect.width,
                height: rect.height
            };
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging && !this.isResizing) return;

        try {
            const parentRect = this.container.parentElement.getBoundingClientRect();

            if (this.isDragging) {
                const newX = this.snapToGrid(e.clientX - parentRect.left - this.startPos.x);
                const newY = this.snapToGrid(e.clientY - parentRect.top - this.startPos.y);

                const maxX = parentRect.width - this.container.offsetWidth;
                const maxY = parentRect.height - this.container.offsetHeight;

                const x = Math.max(0, Math.min(newX, maxX));
                const y = Math.max(0, Math.min(newY, maxY));

                this.container.style.left = `${x}px`;
                this.container.style.top = `${y}px`;

                this.onUpdate(this.snippet.id, {
                    position: { x, y }
                });
            }

            if (this.isResizing) {
                const deltaWidth = e.clientX - this.startPos.x;
                const deltaHeight = e.clientY - this.startPos.y;

                const width = this.snapToGrid(Math.max(100, this.startSize.width + deltaWidth));
                const height = this.snapToGrid(Math.max(100, this.startSize.height + deltaHeight));

                this.container.style.width = `${width}px`;
                this.container.style.height = `${height}px`;

                this.onUpdate(this.snippet.id, {
                    size: { width, height }
                });
            }
        } catch (err) {
            this.onError('Failed to update snippet position/size');
            this.isDragging = false;
            this.isResizing = false;
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
        this.container.style.cursor = 'grab';
    }

    mount(parent) {
        parent.appendChild(this.container);
    }

    unmount() {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
}

// Make the class available globally
window.SnippetContainer = SnippetContainer; 