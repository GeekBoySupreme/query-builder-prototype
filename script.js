class QueryBuilder {
    constructor() {
        this.pills = [];
        this.suggestions = [
            { type: 'filter', key: 'status', value: 'active', description: 'Active users' },
            { type: 'filter', key: 'status', value: 'inactive', description: 'Inactive users' },
            { type: 'filter', key: 'age', value: '>25', description: 'Users over 25' },
            { type: 'filter', key: 'location', value: 'SF', description: 'Users in San Francisco' },
            { type: 'filter', key: 'role', value: 'admin', description: 'Admin users' },
            { type: 'combination', value: 'status:active location:SF', description: 'Active users in SF' },
            { type: 'combination', value: 'role:admin status:active', description: 'Active admins' }
        ];

        this.hoveredPillIndex = -1; // Track hovered pill index
        this.contextMenu = null; // Store reference to context menu

        this.slashCommands = [
            { type: 'command', value: '/history', description: 'Show search history' },
            { type: 'command', value: '/views', description: 'Show saved views' },
            { type: 'command', value: '/help', description: 'Show available commands' }
        ];

        this.history = [
            { type: 'history', value: 'status:active role:admin', description: 'Last used: Active admins' },
            { type: 'history', value: 'age:>25 location:SF', description: 'Last used: SF users over 25' }
        ];

        this.views = [
            { type: 'view', value: 'status:active', description: 'Active Users View' },
            { type: 'view', value: 'role:admin status:active', description: 'Active Admins View' }
        ];

        this.selectedSuggestionIndex = -1;
        this.suggestionCategory = '';
        this.suggestionItems = [];

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.inputContainer = document.querySelector('.input-container');
        this.pillsContainer = document.querySelector('.pills-container');
        this.input = document.querySelector('#queryInput');
        this.suggestionsContainer = document.querySelector('.suggestions-container');
        this.suggestionsHeader = document.querySelector('.suggestions-header');
        this.suggestionsList = document.querySelector('.suggestions-list');

        if (!this.inputContainer || !this.input || !this.pillsContainer ||
            !this.suggestionsContainer || !this.suggestionsHeader || !this.suggestionsList) {
            console.error('Required DOM elements not found');
            return;
        }

        // Set styles for proper wrapping and inline flow
        this.inputContainer.style.display = 'block';
        this.inputContainer.style.padding = '4px';
        this.inputContainer.style.lineHeight = '2';  // Ensure consistent line height

        this.pillsContainer.style.display = 'inline';
        this.pillsContainer.style.whiteSpace = 'normal';
        this.pillsContainer.style.verticalAlign = 'top';

        this.input.style.display = 'inline-block';
        this.input.style.verticalAlign = 'top';
        this.input.style.minWidth = '100px';
        this.input.style.margin = '6px 4px';
        this.input.style.minWidth = '200px';

        // Create context menu element
        this.createContextMenu();

        // Add document-level keyboard event listener for Cmd+Backspace on hover
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace' && this.hoveredPillIndex !== -1) {
                e.preventDefault();
                this.removePill(this.hoveredPillIndex);
                this.hoveredPillIndex = -1; // Reset hover index after removal
                if (this.hoveredPillIndex > 0) {
                    const prevElement = this.pillsContainer.children[this.hoveredPillIndex - 1];
                    if (prevElement && prevElement.classList.contains('pill')) {
                        this.focusPill(prevElement, 'end');
                    }
                }
            }
        });

        // Add context menu event listener
        this.inputContainer.addEventListener('contextmenu', (e) => this.handleContextMenu(e));

        // Add click outside listener to hide context menu
        document.addEventListener('click', () => {
            if (this.contextMenu) {
                this.contextMenu.style.display = 'none';
            }
        });

        this.updatePlaceholder();
        this.setupEventListeners();
        this.showInitialSuggestions();
    }

    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.display = 'none';
        this.contextMenu.style.position = 'fixed'; // Use fixed positioning
        this.contextMenu.style.zIndex = '1000'; // Ensure high z-index
        this.contextMenu.style.background = 'white';
        this.contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        this.contextMenu.style.borderRadius = '4px';
        this.contextMenu.style.padding = '4px 0';
        this.contextMenu.style.minWidth = '150px';

        this.contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="copy">Copy Content</div>
            <div class="context-menu-item" data-action="clear">Clear All</div>
        `;

        // Add styles for menu items
        const menuItems = this.contextMenu.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.style.transition = 'background-color 0.2s';

            // Add hover event listeners
            item.addEventListener('mouseover', () => {
                item.style.backgroundColor = '#f0f0f0';
            });
            item.addEventListener('mouseout', () => {
                item.style.backgroundColor = 'transparent';
            });
        });

        // Add click handlers for menu items
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'copy') {
                    this.copyContent();
                } else if (action === 'clear') {
                    this.clearAll();
                }
                this.contextMenu.style.display = 'none';
            });
        });

        document.body.appendChild(this.contextMenu);
    }

    handleContextMenu(e) {
        e.preventDefault();

        // Position the menu at exact click coordinates
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.position = 'fixed'; // Use fixed positioning
        this.contextMenu.style.zIndex = '1000'; // Ensure high z-index

        // Get cursor position
        let left = e.clientX;
        let top = e.clientY;

        // Adjust menu position to stay within viewport
        const menuWidth = this.contextMenu.offsetWidth;
        const menuHeight = this.contextMenu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Ensure menu stays within horizontal bounds
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth;
        }

        // Ensure menu stays within vertical bounds
        if (top + menuHeight > windowHeight) {
            top = windowHeight - menuHeight;
        }

        // Apply the calculated position
        this.contextMenu.style.left = `${left}px`;
        this.contextMenu.style.top = `${top}px`;
    }

    copyContent() {
        const content = this.getAllContent();
        navigator.clipboard.writeText(content).then(() => {
            // Optional: Show a brief success message
            const originalText = this.contextMenu.querySelector('[data-action="copy"]').textContent;
            this.contextMenu.querySelector('[data-action="copy"]').textContent = 'Copied!';
            setTimeout(() => {
                this.contextMenu.querySelector('[data-action="copy"]').textContent = originalText;
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy text:', err);
        });
    }

    clearAll() {
        // Clear all pills
        while (this.pillsContainer.firstChild) {
            this.pillsContainer.removeChild(this.pillsContainer.firstChild);
        }
        this.pills = [];
        this.input.value = '';
        this.updatePlaceholder();
        this.showInitialSuggestions();
        this.input.focus(); // Ensure input gets focus after clearing
    }

    updatePlaceholder() {
        this.input.placeholder = this.pills.length === 0 ?
            'Type to search, / for commands' :
            'Add another filter...';
    }

    showInitialSuggestions() {
        if (this.pills.length === 0) {
            this.showSuggestions([
                ...this.suggestions.filter(s => s.type === 'combination'),
                ...this.history,
                ...this.views,
                ...this.slashCommands
            ], 'Suggested Filters');
        }
    }

    setupEventListeners() {
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleInputKeyDown(e));
        this.input.addEventListener('focus', () => {
            this.showInitialSuggestions();
        });

        // Show suggestions when typing starts
        this.input.addEventListener('input', () => {
            if (this.input.value.length > 0) {
                this.suggestionsContainer.style.display = 'block';
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.inputContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        this.inputContainer.addEventListener('click', (e) => {
            if (e.target === this.inputContainer || e.target === this.pillsContainer) {
                this.input.focus();
                this.showInitialSuggestions();
            }
        });
    }

    handleInput(e) {
        const value = e.target.value;
        this.updatePlaceholder();

        if (value.startsWith('/')) {
            this.showSuggestions(
                this.slashCommands.filter(cmd => cmd.value.startsWith(value)),
                'Available Commands'
            );
        } else if (value === '/history') {
            this.showSuggestions(this.history, 'Search History');
        } else if (value === '/views') {
            this.showSuggestions(this.views, 'Saved Views');
        } else if (value.includes(':')) {
            const [key] = value.split(':');
            const filtered = this.suggestions.filter(sugg =>
                sugg.type === 'filter' && sugg.key.startsWith(key.toLowerCase())
            );
            this.showSuggestions(filtered, 'Matching Filters');
        } else if (value.length > 0) {
            const filtered = this.suggestions.filter(sugg =>
                sugg.type === 'filter' && sugg.key.toLowerCase().includes(value.toLowerCase())
            );
            this.showSuggestions(filtered, 'Available Filters');
        } else {
            this.showInitialSuggestions();
        }

        // Handle special characters and operators
        if (value.endsWith(' ')) {
            const text = value.trim();
            if (text.toUpperCase() === 'AND' || text.toUpperCase() === 'OR') {
                this.addPill(text.toUpperCase(), 'operator');
                this.input.value = '';
                this.showInitialSuggestions();
            } else if (text.includes(':')) {
                this.addPill(text);
                this.input.value = '';
                this.showInitialSuggestions();
            }
        } else if (value === '(' || value === ')') {
            // Handle brackets - insert them directly without creating pills
            const bracketSpan = document.createElement('span');
            bracketSpan.className = 'bracket';
            bracketSpan.textContent = value;
            bracketSpan.style.color = '#0066cc'; // Blue color for brackets
            bracketSpan.style.margin = '0 2px';
            this.pillsContainer.appendChild(bracketSpan);
            this.input.value = '';
        }
    }

    handleInputKeyDown(e) {
        if (this.suggestionsContainer.style.display !== 'none') {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedSuggestionIndex = Math.min(
                        this.selectedSuggestionIndex + 1,
                        this.suggestionItems.length - 1
                    );
                    this.updateSelectedSuggestion();
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                    this.updateSelectedSuggestion();
                    break;

                case 'Enter':
                    if (this.selectedSuggestionIndex !== -1) {
                        e.preventDefault();
                        this.handleSuggestionSelection();
                    }
                    break;
            }
        }

        if (e.key === 'Backspace' && !this.input.value) {
            e.preventDefault();
            const lastElement = this.pillsContainer.lastElementChild;
            if (lastElement) {
                if (lastElement.classList.contains('pill')) {
                    // Instead of removing, focus on the last pill
                    this.focusPill(lastElement, 'end');
                } else if (lastElement.classList.contains('bracket')) {
                    lastElement.remove();
                }
            }
            this.showInitialSuggestions();
        } else if (e.key === 'ArrowLeft' && this.input.selectionStart === 0 && this.pillsContainer.children.length > 0) {
            e.preventDefault();
            const lastElement = this.pillsContainer.lastElementChild;
            if (lastElement.classList.contains('pill')) {
                this.focusPill(lastElement, 'end');
            }
        }
    }

    handlePillKeyDown(e, index) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const pill = e.target;
        const pillContent = pill.textContent || '';

        // Handle Cmd+Backspace (Mac) or Ctrl+Backspace (Windows)
        if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
            e.preventDefault();
            this.removePill(index);
            if (index > 0) {
                const prevElement = this.pillsContainer.children[index - 1];
                if (prevElement.classList.contains('pill')) {
                    this.focusPill(prevElement, 'end');
                }
            } else {
                this.input.focus();
            }
            return;
        }

        switch (e.key) {
            case 'Backspace': {
                // If there's a selection, let the default deletion happen
                if (selection.toString().length > 0) {
                    return;
                }

                // If at start of pill and pill is empty
                if (range.startOffset === 0 && pillContent.trim().length === 0) {
                    e.preventDefault();
                    this.removePill(index);
                    if (index > 0) {
                        const prevElement = this.pillsContainer.children[index - 1];
                        if (prevElement.classList.contains('pill')) {
                            this.focusPill(prevElement, 'end');
                        }
                    } else {
                        this.input.focus();
                    }
                }
                // Otherwise, let the normal backspace behavior happen within the pill
                break;
            }
            case 'ArrowLeft': {
                if (range.startOffset === 0) {
                    e.preventDefault();
                    if (index > 0) {
                        const prevPill = this.pillsContainer.children[index - 1];
                        this.focusPill(prevPill, 'end');
                    }
                }
                break;
            }

            case 'ArrowRight': {
                if (range.startOffset === pillContent.length) {
                    e.preventDefault();
                    if (index < this.pills.length - 1) {
                        const nextPill = this.pillsContainer.children[index + 1];
                        this.focusPill(nextPill, 'start');
                    } else {
                        this.input.focus();
                    }
                }
                break;
            }
        }
    }

    focusPill(pill, position = 'end') {
        if (!pill) return;

        // Focus the pill immediately
        pill.focus();

        // Set cursor position
        const selection = window.getSelection();
        const range = document.createRange();

        // Ensure the pill has content to focus on
        if (!pill.firstChild) {
            pill.appendChild(document.createTextNode(''));
        }

        const textNode = pill.firstChild;
        const length = textNode.length;

        if (position === 'start') {
            range.setStart(textNode, 0);
            range.setEnd(textNode, 0);
        } else {
            range.setStart(textNode, length);
            range.setEnd(textNode, length);
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    handleSuggestionSelection() {
        if (this.selectedSuggestionIndex === -1) return;

        const selectedItem = this.suggestionItems[this.selectedSuggestionIndex];
        if (!selectedItem) return;

        this.handleSuggestionClick(selectedItem);
    }

    handleSuggestionClick(item) {
        if (item.type === 'command') {
            switch (item.value) {
                case '/history':
                    this.showSuggestions(this.history, 'Search History');
                    break;
                case '/views':
                    this.showSuggestions(this.views, 'Saved Views');
                    break;
                case '/help':
                    this.showSuggestions(this.slashCommands, 'Available Commands');
                    break;
            }
        } else if (item.type === 'combination' || item.type === 'history' || item.type === 'view') {
            this.pillsContainer.innerHTML = '';
            this.pills = [];
            const filters = item.value.split(' ');
            filters.forEach(filter => this.addPill(filter));
        } else {
            this.addPill(`${item.key}:${item.value}`);
        }
        this.input.value = '';
        this.showInitialSuggestions();
        this.input.focus();
    }

    showSuggestions(items, category) {
        this.suggestionItems = items;
        this.suggestionCategory = category;
        this.selectedSuggestionIndex = -1;

        this.suggestionsHeader.textContent = category;
        this.suggestionsList.innerHTML = '';

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div class="suggestion-main">${item.value}</div>
                <div class="suggestion-description">${item.description}</div>
            `;
            div.addEventListener('click', () => this.handleSuggestionClick(item));
            this.suggestionsList.appendChild(div);
        });

        this.suggestionsContainer.style.display = 'block';
    }

    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
        this.selectedSuggestionIndex = -1;
    }

    updateSelectedSuggestion() {
        const items = this.suggestionsList.children;
        Array.from(items).forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedSuggestionIndex);
        });
    }

    addPill(text, type = 'filter') {
        if (!text.trim()) return;

        const pill = document.createElement('div');
        pill.className = 'pill';
        if (type === 'operator') {
            pill.className += ' operator-pill';
            pill.style.backgroundColor = '#FF9800'; // Orange background for operators
            pill.style.color = 'white';
        }
        pill.contentEditable = true;
        pill.spellcheck = false;
        pill.textContent = text;
        pill.style.display = 'inline-block';
        pill.style.verticalAlign = 'top';
        pill.style.margin = '0 4px 0 0';

        // Store the index on the pill element
        const pillIndex = this.pills.length;
        pill.dataset.index = pillIndex;

        // Add keyboard navigation event listener with correct index
        pill.addEventListener('keydown', (e) => this.handlePillKeyDown(e, pillIndex));

        // Add hover tracking
        pill.addEventListener('mouseover', () => {
            this.hoveredPillIndex = pillIndex;
        });
        pill.addEventListener('mouseout', () => {
            this.hoveredPillIndex = -1;
        });

        this.pillsContainer.appendChild(pill);
        this.pills.push({ text, type });
        this.updatePlaceholder();
    }

    removePill(index) {
        if (index < 0 || index >= this.pills.length) return;

        const pillElements = Array.from(this.pillsContainer.children);
        if (index < pillElements.length) {
            const pill = pillElements[index];
            pill.remove();
            this.pills.splice(index, 1);
            this.updatePlaceholder();

            if (this.pills.length === 0) {
                this.showInitialSuggestions();
            }
        }
    }

    getAllContent() {
        return [...this.pills, this.input.value].filter(Boolean).join(' ');
    }
}

// Initialize the QueryBuilder when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QueryBuilder();
});