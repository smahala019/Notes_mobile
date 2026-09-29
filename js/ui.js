/* ==========================================================================
   Ultimate Web Notepad - UI Components, Tabs, Menus, Events & Delegation
   ========================================================================== */

// --- Theme Management ---

async function initTheme() {
    let savedTheme = 'light';
    try {
        if (typeof AppDB !== 'undefined' && AppDB.getSetting) {
            const dbTheme = await AppDB.getSetting('theme');
            if (dbTheme) savedTheme = dbTheme;
            else if (typeof localStorage !== 'undefined') savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        } else if (typeof localStorage !== 'undefined') {
            savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        }
    } catch (e) {
        if (typeof localStorage !== 'undefined') savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    }
    setTheme(savedTheme);
}

function toggleTheme() {
    const nextTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
}

function setTheme(theme) {
    AppState.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme);
        if (typeof AppDB !== 'undefined' && AppDB.setSetting) {
            AppDB.setSetting('theme', theme).catch(() => {});
        }
    } catch (e) {}
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.innerHTML = theme === 'dark' 
            ? `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" fill="currentColor"/></svg>`
            : `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" fill="currentColor"/></svg>`;
        themeBtn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
    }
}

// --- Tab Bar Management ---

function renderTabs() {
    const tabList = document.getElementById('tab-list');
    if (!tabList) return;
    tabList.innerHTML = '';

    AppState.files.forEach(f => {
        const tab = document.createElement('div');
        tab.className = `tab ${f.id === AppState.currentFileId ? 'active' : ''}`;
        tab.dataset.fileId = f.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tab-name';
        nameSpan.textContent = f.name;
        nameSpan.title = f.name;
        tab.appendChild(nameSpan);

        // Three dots inside file tab for individual file options
        const menuBtn = document.createElement('span');
        menuBtn.className = 'tab-menu-btn';
        menuBtn.innerHTML = '⋮';
        menuBtn.title = "File options";
        menuBtn.dataset.tabMenuId = f.id;
        tab.appendChild(menuBtn);

        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.title = "Close tab";
        closeBtn.dataset.closeTabId = f.id;
        tab.appendChild(closeBtn);

        tabList.appendChild(tab);

        if (f.id === AppState.currentFileId) {
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    });
}

// --- Menu Bar & Dropdown Controls ---

function closeAllDropdowns() {
    document.querySelectorAll('.menu-content.show, .three-dots-content.show, .tab-dropdown-menu.show, .plain-plus-menu.show').forEach(el => {
        el.classList.remove('show');
    });
    document.querySelectorAll('.menu-item.active').forEach(el => {
        el.classList.remove('active');
    });
}

let activeTabMenuFileId = null;

function openTabContextMenu(fileId, triggerEl) {
    let menu = document.getElementById('tab-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'tab-context-menu';
        menu.className = 'tab-dropdown-menu';
        menu.innerHTML = `
            <div class="dot-option" data-tab-action="rename">✏️ Rename File</div>
            <div class="dot-option" data-tab-action="save">💾 Save / Download</div>
            <div class="dot-option" data-tab-action="duplicate">📋 Duplicate File</div>
            <div class="separator"></div>
            <div class="dot-option danger" data-tab-action="delete-file">🗑️ Delete File</div>
            <div class="dot-option danger" data-tab-action="close">🗑️ Close Tab</div>
        `;
        document.body.appendChild(menu);
    }

    activeTabMenuFileId = fileId;
    closeAllDropdowns();

    const rect = triggerEl.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = Math.max(10, Math.min(rect.left - 20, window.innerWidth - 190)) + 'px';
    menu.classList.add('show');
}

function handleTabAction(action, fileId) {
    if (!fileId) return;
    switch (action) {
        case 'rename':
            renameSpecificFile(fileId);
            break;
        case 'save':
            saveSpecificFile(fileId);
            break;
        case 'duplicate':
            duplicateFile(fileId);
            break;
        case 'delete-file':
            deleteSpecificFile(fileId);
            break;
        case 'close':
            closeTab(fileId);
            break;
    }
}

function switchRibbonTab(ribbonId) {
    if (!ribbonId) return;
    document.querySelectorAll('.menu-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-ribbon') === ribbonId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.ribbon-panel').forEach(panel => {
        if (panel.id === ribbonId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

function initRibbonTabs() {
    const tabButtons = document.querySelectorAll('.menu-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const ribbonId = btn.getAttribute('data-ribbon');
            switchRibbonTab(ribbonId);
        });
    });
}

function initMenuEvents() {
    // MS Word style Ribbon tab navigation
    initRibbonTabs();

    // Menu items click toggle and desktop hover-switching (for any legacy menu dropdowns)
    const topMenuItems = document.querySelectorAll('.menu-bar > .menu-item');
    topMenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // CRITICAL FIX: If the user clicked inside .menu-content (e.g. a menu-option),
            // DO NOT toggle or stop propagation! Let the click bubble up to the document
            // listener so data-action and data-modal-open are executed!
            if (e.target.closest('.menu-content')) {
                setTimeout(closeAllDropdowns, 100);
                return;
            }

            const content = item.querySelector('.menu-content');
            if (!content) return;

            const isOpen = content.classList.contains('show');
            closeAllDropdowns();

            if (!isOpen) {
                content.classList.add('show');
                item.classList.add('active');
            }
            e.stopPropagation();
        });

        // Desktop hover-switching: if any menu is already open, hovering another menu opens it
        item.addEventListener('mouseenter', () => {
            const anyOpen = document.querySelector('.menu-bar .menu-content.show');
            if (anyOpen) {
                closeAllDropdowns();
                const content = item.querySelector('.menu-content');
                if (content) {
                    content.classList.add('show');
                    item.classList.add('active');
                }
            }
        });
    });

    // Three-dots options button
    const threeDotsBtn = document.getElementById('btn-three-dots');
    const threeDotsMenu = document.getElementById('three-dots-menu');
    if (threeDotsBtn && threeDotsMenu) {
        threeDotsBtn.addEventListener('click', (e) => {
            if (e.target.closest('.three-dots-content')) {
                setTimeout(closeAllDropdowns, 100);
                return;
            }
            const isOpen = threeDotsMenu.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen) {
                threeDotsMenu.classList.add('show');
            }
            e.stopPropagation();
        });
    }

    // Restore window when clicking title bar in minimized state
    document.querySelector('.title-bar')?.addEventListener('click', (e) => {
        const frame = document.querySelector('.window-frame');
        if (frame && frame.classList.contains('minimized')) {
            if (!e.target.closest('button, .tab-close, .tab-menu-btn')) {
                frame.classList.remove('minimized');
                showToast("Window restored");
            }
        }
    });

    // Global window click with (e) parameter: close dropdowns when clicking outside
    window.addEventListener('click', (e) => {
        const isMenuBtn = e.target.closest('.menu-item, .three-dots, .tab-menu-btn');
        const isMenuContent = e.target.closest('.menu-content, .three-dots-content, .tab-dropdown-menu');

        if (!isMenuBtn && !isMenuContent) {
            closeAllDropdowns();
        }
    });

    // Close dropdowns when clicking on any menu-option
    document.querySelectorAll('.menu-option, .dot-option').forEach(opt => {
        opt.addEventListener('click', () => {
            setTimeout(closeAllDropdowns, 100);
        });
    });
}

// --- Centralized Event Delegation (Zero Inline JS in HTML) ---

function initActionDelegation() {
    // Tab bar click delegation
    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-tab-id]');
            if (closeBtn) {
                const tabId = closeBtn.dataset.closeTabId;
                closeTab(tabId, e);
                return;
            }

            const tabMenuBtn = e.target.closest('[data-tab-menu-id]');
            if (tabMenuBtn) {
                const tabId = tabMenuBtn.dataset.tabMenuId;
                openTabContextMenu(tabId, tabMenuBtn);
                e.stopPropagation();
                return;
            }

            const tab = e.target.closest('.tab');
            if (tab && tab.dataset.fileId) {
                const fileId = tab.dataset.fileId;
                if (AppState.currentFileId !== fileId) {
                    saveCurrentStateToMemory();
                    loadFileContent(fileId);
                }
            }
        });
    }

    // Document-wide action delegation
    document.addEventListener('click', (e) => {
        // Tab Context Menu Action
        const tabActionEl = e.target.closest('[data-tab-action]');
        if (tabActionEl) {
            const action = tabActionEl.dataset.tabAction;
            handleTabAction(action, activeTabMenuFileId);
            closeAllDropdowns();
            return;
        }
        // Symbol category tab switching
        const symCatEl = e.target.closest('[data-sym-cat]');
        if (symCatEl) {
            document.querySelectorAll('.symbol-tab-btn').forEach(b => b.classList.remove('active'));
            symCatEl.classList.add('active');
            renderSymbolGrid(symCatEl.dataset.symCat);
            return;
        }

        // Emoji category tab switching
        const emojiCatEl = e.target.closest('[data-emoji-cat]');
        if (emojiCatEl) {
            document.querySelectorAll('.emoji-tab-btn').forEach(b => b.classList.remove('active'));
            emojiCatEl.classList.add('active');
            renderEmojiGrid(emojiCatEl.dataset.emojiCat);
            return;
        }

        // Sort option selection from #sort-modal
        const sortOptionEl = e.target.closest('[data-sort-type]');
        if (sortOptionEl) {
            const sortType = sortOptionEl.dataset.sortType;
            if (typeof sortSelectedLines === 'function') {
                sortSelectedLines(sortType);
            }
            if (typeof closeModal === 'function') {
                closeModal('sort-modal');
            }
            return;
        }

        // Column option selection from #columns-modal
        const colOptionEl = e.target.closest('[data-columns]');
        if (colOptionEl) {
            const cols = colOptionEl.dataset.columns;
            if (typeof applyColumns === 'function') {
                applyColumns(cols);
            }
            return;
        }

        // Apply custom columns button
        const applyCustomColBtn = e.target.closest('#btn-apply-custom-columns');
        if (applyCustomColBtn) {
            const input = document.getElementById('custom-column-input');
            const cols = input ? input.value : 2;
            if (typeof applyColumns === 'function') {
                applyColumns(cols);
            }
            return;
        }

        // GIF category tab switching
        const gifCatEl = e.target.closest('[data-gif-cat]');
        if (gifCatEl) {
            document.querySelectorAll('.gif-cat-btn').forEach(b => b.classList.remove('active'));
            gifCatEl.classList.add('active');
            const searchInput = document.getElementById('gif-search-input');
            const query = searchInput ? searchInput.value : '';
            if (typeof loadGifs === 'function') {
                loadGifs(gifCatEl.dataset.gifCat, query);
            }
            return;
        }

        // GIF search button
        const gifSearchBtn = e.target.closest('#btn-gif-search');
        if (gifSearchBtn) {
            const searchInput = document.getElementById('gif-search-input');
            const query = searchInput ? searchInput.value : '';
            const activeCat = document.querySelector('.gif-cat-btn.active');
            const cat = activeCat ? activeCat.dataset.gifCat : 'trending';
            if (typeof loadGifs === 'function') {
                loadGifs(cat, query);
            }
            return;
        }

        // GIF refresh button
        const gifRefreshBtn = e.target.closest('#btn-gif-refresh');
        if (gifRefreshBtn) {
            const searchInput = document.getElementById('gif-search-input');
            const query = searchInput ? searchInput.value : '';
            const activeCat = document.querySelector('.gif-cat-btn.active');
            const cat = activeCat ? activeCat.dataset.gifCat : 'trending';
            if (typeof loadGifs === 'function') {
                loadGifs(cat, query, true);
            }
            return;
        }

        // Plain + Dropdown toggle and closing
        const plainPlusBtn = e.target.closest('#btn-plain-plus');
        const plainPlusMenu = document.getElementById('plain-plus-menu');
        if (plainPlusBtn) {
            e.stopPropagation();
            if (plainPlusMenu) {
                plainPlusMenu.classList.toggle('show');
            }
            return;
        }
        const plainPlusItem = e.target.closest('.plain-plus-item');
        if (plainPlusItem) {
            if (plainPlusMenu) plainPlusMenu.classList.remove('show');
        } else if (plainPlusMenu && !e.target.closest('#plain-plus-wrapper')) {
            plainPlusMenu.classList.remove('show');
        }

        // Exit code block button
        const exitCodeBtn = e.target.closest('.btn-exit-code-block');
        if (exitCodeBtn) {
            e.preventDefault();
            if (typeof exitCodeBlock === 'function') {
                exitCodeBlock(exitCodeBtn);
            }
            return;
        }

        // Export card format selection
        const exportCardEl = e.target.closest('[data-export-format]');
        if (exportCardEl) {
            const format = exportCardEl.dataset.exportFormat;
            exportDocument(format);
            return;
        }

        // 1. Data-Action dispatcher
        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
            const action = actionEl.dataset.action;
            handleAction(action, e);
            return;
        }

        // 2. Formatting commands dispatcher
        const formatEl = e.target.closest('[data-format]');
        if (formatEl) {
            const cmd = formatEl.dataset.format;
            const val = formatEl.dataset.formatVal || null;
            formatDoc(cmd, val);
            return;
        }

        // 3. Modal open dispatcher
        const modalOpenEl = e.target.closest('[data-modal-open]');
        if (modalOpenEl) {
            const modalId = modalOpenEl.dataset.modalOpen;
            openModal(modalId);
            return;
        }

        // 4. Modal close dispatcher
        const modalCloseEl = e.target.closest('[data-modal-close]');
        if (modalCloseEl) {
            const modalId = modalCloseEl.dataset.modalClose;
            closeModal(modalId);
            return;
        }

        // 5. Prompt Modal Actions
        const promptEl = e.target.closest('[data-modal-prompt]');
        if (promptEl) {
            const result = promptEl.dataset.modalPrompt === 'ok';
            closePromptModal(result);
            return;
        }

        // 6. Confirm Modal Actions
        const confirmEl = e.target.closest('[data-modal-confirm]');
        if (confirmEl) {
            const result = confirmEl.dataset.modalConfirm === 'yes';
            closeConfirmModal(result);
            return;
        }
    });

    // Formatting select element change delegation
    const formatBlock = document.getElementById('formatBlock');
    if (formatBlock) {
        formatBlock.addEventListener('change', (e) => {
            formatDoc('formatBlock', e.target.value);
        });
    }

    // Change Case select delegation
    const changeCaseSelect = document.getElementById('tool-change-case');
    if (changeCaseSelect) {
        changeCaseSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                changeCase(e.target.value);
                e.target.selectedIndex = 0;
            }
        });
    }

    // Line Spacing select delegation
    const lineSpacingSelect = document.getElementById('tool-line-spacing');
    if (lineSpacingSelect) {
        lineSpacingSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                applyLineSpacing(e.target.value);
            }
        });
    }

    // Margin select delegation
    const marginSelect = document.getElementById('tool-margin-select');
    if (marginSelect) {
        marginSelect.addEventListener('change', (e) => {
            changeMargin(e.target.value);
        });
    }

    // Zoom select delegation
    const zoomSelect = document.getElementById('tool-setting-zoom');
    if (zoomSelect) {
        zoomSelect.addEventListener('change', (e) => {
            changeEditorZoom(e.target.value);
        });
    }

    // Direct Settings button wiring to guarantee opening Settings Modal
    document.getElementById('btn-settings')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal('settings-modal');
    });

    // Close modals on clicking overlay backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });

    // Modal submit buttons
    document.getElementById('table-insert-btn')?.addEventListener('click', insertTable);
    document.getElementById('image-insert-btn')?.addEventListener('click', insertImage);
    document.getElementById('link-insert-btn')?.addEventListener('click', insertLink);
    document.getElementById('clear-storage-confirm-btn')?.addEventListener('click', confirmClearStorage);
    document.getElementById('settings-save-btn')?.addEventListener('click', saveSettingsModal);
    document.getElementById('btn-reopen-all-closed')?.addEventListener('click', reopenAllClosedFiles);
    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
        clearRecentAndClosedHistory();
        renderRecentClosedModal();
    });
    document.getElementById('search-recent-closed')?.addEventListener('input', (e) => {
        renderRecentClosedModal(e.target.value);
    });
}

// --- Action Dispatcher Handler ---

function handleAction(action, e) {
    switch (action) {
        case 'win-minimize': {
            const frame = document.querySelector('.window-frame');
            if (frame) {
                frame.classList.toggle('minimized');
                if (frame.classList.contains('minimized')) {
                    showToast("Window minimized. Click title bar to restore.");
                }
            }
            break;
        }
        case 'win-maximize': {
            const frame = document.querySelector('.window-frame');
            const maxBtn = document.getElementById('btn-win-maximize');
            if (frame) {
                frame.classList.toggle('maximized');
                document.body.classList.toggle('maximized', frame.classList.contains('maximized'));
                const isMax = frame.classList.contains('maximized');
                if (maxBtn) {
                    maxBtn.textContent = isMax ? '🗗' : '🗖';
                    maxBtn.title = isMax ? 'Restore Window' : 'Maximize Window';
                }
                showToast(isMax ? 'Window maximized' : 'Window restored');
            }
            break;
        }
        case 'win-close': {
            showCustomConfirm("Do you want to close this notepad workspace? Current changes are preserved in storage.", (confirmed) => {
                if (confirmed) {
                    saveCurrentStateToMemory();
                    const frame = document.querySelector('.window-frame');
                    if (frame) {
                        frame.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                        frame.style.opacity = '0.05';
                        frame.style.transform = 'scale(0.96)';
                        setTimeout(() => {
                            showToast("Workspace closed. Click anywhere to reopen.");
                            window.addEventListener('click', function reopenWindow() {
                                frame.style.opacity = '1';
                                frame.style.transform = 'scale(1)';
                                window.removeEventListener('click', reopenWindow);
                            }, { once: true });
                        }, 300);
                    }
                }
            });
            break;
        }
        case 'new-file':
            createNewFile();
            break;
        case 'open-file':
            document.getElementById('file-input')?.click();
            break;
        case 'save-file':
            saveFile(false);
            break;
        case 'save-as':
            saveFile(true);
            break;
        case 'rename-file':
            renameCurrentFile();
            break;
        case 'delete-file':
            deleteCurrentFile();
            break;
        case 'toggle-auto-save':
            AppState.autoSaveEnabled = !AppState.autoSaveEnabled;
            updateMenuUI();
            showToast(AppState.autoSaveEnabled ? 'Auto-Save Enabled' : 'Auto-Save Disabled');
            break;
        case 'print':
            if (typeof printDocument === 'function') printDocument();
            else window.print();
            break;
        case 'undo':
            if (AppState.isRichTextMode) executeRichUndo();
            else plainEditorUndo();
            break;
        case 'redo':
            if (AppState.isRichTextMode) executeRichRedo();
            else plainEditorRedo();
            break;
        case 'cut':
            document.execCommand('cut');
            break;
        case 'copy':
            document.execCommand('copy');
            break;
        case 'paste':
            navigator.clipboard.readText().then(text => {
                if (AppState.isRichTextMode) {
                    formatDoc('insertText', text);
                } else {
                    const ed = document.getElementById('plain-editor');
                    const s = ed.selectionStart;
                    ed.value = ed.value.substring(0, s) + text + ed.value.substring(ed.selectionEnd);
                    ed.selectionStart = ed.selectionEnd = s + text.length;
                    pushHistory(ed.value);
                    updateStats();
                }
                saveCurrentStateToMemory();
            }).catch(() => showToast('Clipboard access denied. Use Ctrl+V.'));
            break;
        case 'delete': {
            const ed = getCurrentEditor();
            if (AppState.isRichTextMode) {
                document.execCommand('delete');
            } else {
                const s = ed.selectionStart;
                const end = ed.selectionEnd;
                if (s === end && s < ed.value.length) {
                    ed.value = ed.value.substring(0, s) + ed.value.substring(s + 1);
                } else if (s !== end) {
                    ed.value = ed.value.substring(0, s) + ed.value.substring(end);
                }
                pushHistory(ed.value);
                updateStats();
            }
            saveCurrentStateToMemory();
            break;
        }
        case 'select-all': {
            const ed = getCurrentEditor();
            ed.focus();
            if (AppState.isRichTextMode) document.execCommand('selectAll', false, null);
            else ed.select();
            break;
        }
        case 'insert-date':
            insertDate();
            break;
        case 'toggle-mode':
            toggleViewMode();
            break;
        case 'toggle-theme':
            toggleTheme();
            break;
        case 'toggle-status': {
            const s = document.getElementById('status-bar');
            if (s) {
                s.style.display = (s.style.display === 'none' ? 'flex' : 'none');
                updateMenuUI();
                if (typeof saveAppSettings === 'function') saveAppSettings();
            }
            break;
        }
        case 'toggle-wrap': {
            AppState.isWordWrap = !AppState.isWordWrap;
            if (typeof applyWordWrapState === 'function') {
                applyWordWrapState();
            }
            updateMenuUI();
            if (typeof saveAppSettings === 'function') saveAppSettings();
            showToast(`Word Wrap: ${AppState.isWordWrap ? 'On' : 'Off'}`);
            break;
        }
        case 'insert-table-trigger':
            if (!AppState.isRichTextMode) {
                showToast('Switch to Rich Text mode to insert tables');
                return;
            }
            openModal('table-modal');
            break;
        case 'insert-image-trigger':
            if (!AppState.isRichTextMode) {
                showToast('Switch to Rich Text mode to insert images');
                return;
            }
            openModal('image-modal');
            break;
        case 'insert-link-trigger':
            if (!AppState.isRichTextMode) {
                showToast('Switch to Rich Text mode to insert links');
                return;
            }
            openModal('link-modal');
            break;
        case 'voice-typing':
            toggleVoiceRecognition();
            break;
        case 'word-cloud':
            openWordCloudModal();
            break;
        case 'open-settings':
            openModal('settings-modal');
            break;
        case 'format-painter':
            toggleFormatPainter();
            break;
        case 'font-grow':
            growFontSize();
            break;
        case 'font-shrink':
            shrinkFontSize();
            break;
        case 'case-upper':
            changeCase('uppercase');
            break;
        case 'case-lower':
            changeCase('lowercase');
            break;
        case 'case-title':
            changeCase('titlecase');
            break;
        case 'case-sentence':
            changeCase('sentencecase');
            break;
        case 'insert-checklist':
            insertChecklist();
            break;
        case 'insert-hr':
            insertHorizontalRule();
            break;
        case 'open-symbol-modal':
            openModal('symbol-modal');
            break;
        case 'open-wordcount-modal':
            openModal('wordcount-modal');
            break;
        case 'import-file':
            document.getElementById('file-input')?.click();
            break;
        case 'export-modal':
            openModal('export-modal');
            break;
        case 'recent-closed-modal':
            openModal('recent-closed-modal');
            break;
        case 'reopen-closed-file':
            openModal('recent-closed-modal');
            break;
        case 'toggle-selector':
            toggleMobileSelector();
            break;
        case 'reopen-all-closed':
            reopenAllClosedFiles();
            break;
        case 'insert-callout':
            insertCalloutBox();
            break;
        case 'insert-page-break':
            insertPageBreak();
            break;
        case 'calc-selection':
            calculateSelection();
            break;
        case 'toggle-equation-bar':
            toggleEquationBar();
            break;
        case 'remove-link':
            if (typeof removeLink === 'function') removeLink();
            break;
        case 'apply-color':
            if (typeof applyCurrentColors === 'function') applyCurrentColors();
            break;
        case 'reset-color':
            if (typeof resetColorAndHighlight === 'function') resetColorAndHighlight();
            break;
        case 'sort-lines':
            if (typeof saveEditorSelection === 'function') saveEditorSelection();
            if (typeof openModal === 'function') openModal('sort-modal');
            break;
        case 'insert-excel-table':
            insertExcelTable();
            break;
        case 'convert-csv-table':
            convertCsvToTable();
            break;
        case 'format-currency':
            formatCurrency();
            break;
        case 'insert-border-box':
            insertBorderBox();
            break;
        case 'toggle-paint':
            togglePagePaint();
            break;
        case 'toggle-editor-mode':
            toggleViewMode();
            break;
        case 'duplicate-file':
            duplicateCurrentFile();
            break;
        case 'select-all':
            selectAllText();
            break;
        case 'clear-content':
            clearEditorContent();
            break;
        case 'case-invert':
            changeCase('invertcase');
            break;
        case 'insert-code-block':
            insertCodeBlock();
            break;
        case 'toggle-watermark':
            toggleWatermark();
            break;
        case 'toggle-columns':
        case 'open-columns-modal':
            if (typeof openModal === 'function') openModal('columns-modal');
            break;
        case 'toggle-orientation':
            toggleOrientation();
            break;
        case 'paper-size':
            if (typeof changePaperSize === 'function') {
                const ps = document.getElementById('tool-paper-size');
                changePaperSize(ps ? ps.value : 'letter');
            }
            break;
        case 'margin-select':
            if (typeof changeMargin === 'function') {
                const ms = document.getElementById('tool-margin-select');
                changeMargin(ms ? ms.value : 'normal');
            }
            break;
        case 'toggle-direction':
            toggleTextDirection();
            break;
        case 'read-aloud':
            readAloud();
            break;
        case 'toggle-fullscreen':
            toggleFullscreen();
            break;
    }
}

// --- Special Symbols Categories & Grid Renderer ---

const SYMBOL_CATEGORIES = {
    common: ['©', '®', '™', '§', '¶', '•', '–', '—', '“', '”', '‘', '’', '«', '»', '°', '±', '×', '÷', '≠', '≈', '≤', '≥', '✓', '✗', '★', '☆', '♥', '♦', '♣', '♠', '♪', '♫', '☼', '☺'],
    math: ['±', '×', '÷', '≠', '≈', '≤', '≥', '≡', '∑', '∏', '√', '∝', '∞', '∠', '∫', '∬', '∭', '∂', '∇', '∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅', '∀', '∃', '¬', '∧', '∨', '⊕', '⊗'],
    currency: ['$', '€', '£', '¥', '₹', '₽', '₩', '₺', '฿', '₫', '₴', '₡', '₦', '₲', '₵', '₸', '֏', '؋', '¢', '¤'],
    arrows: ['←', '→', '↑', '↓', '↔', '↕', '↖', '↗', '↘', '↙', '⇐', '⇒', '⇑', '⇓', '⇔', '⇕', '➔', '➜', '➤', '►', '◄', '▲', '▼', '↩', '↪'],
    greek: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω']
};

function renderSymbolGrid(category = 'common') {
    const grid = document.getElementById('symbol-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const symbols = SYMBOL_CATEGORIES[category] || SYMBOL_CATEGORIES.common;
    symbols.forEach(sym => {
        const btn = document.createElement('button');
        btn.className = 'symbol-cell';
        btn.textContent = sym;
        btn.title = `Insert ${sym}`;
        btn.onclick = (e) => {
            e.preventDefault();
            insertSymbol(sym);
        };
        grid.appendChild(btn);
    });
}

// --- Dedicated Emoji Picker System (Smileys, Gestures, Objects, Symbols, Hearts) ---

const EMOJI_CATEGORIES = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
    gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '👐', '🤲', '👂', '👃', '👁️', '👀', '🧠', '🦴', '🦷', '👅', '👄'],
    objects: ['💡', '📱', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📷', '📹', '📺', '📻', '⏰', '⏳', '🔑', '🗝️', '🔨', '🪓', '🔧', '🔩', '⚙️', '🧲', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️', '📦', '✉️', '📨', '📩', '📬', '📮', '📝', '📁', '📂', '📅', '📆', '📊', '📈', '📉', '📜', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '🔒', '🔓', '🔏', '🔐'],
    symbols: ['⭐', '🌟', '✨', '💫', '⚡', '💥', '🔥', '🌈', '☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '☃️', '🌊', '🫧', '🎈', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎯', '🎲', '🎰', '🎳', '🚀', '🛸', '🚁', '✈️', '🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚲', '🛴', '🛵', '🏍️', '⛵', '🚢', '⚓'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '💍', '💎']
};

function renderEmojiGrid(category = 'smileys') {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const emojis = EMOJI_CATEGORIES[category] || EMOJI_CATEGORIES.smileys;
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-cell';
        btn.textContent = emoji;
        btn.title = `Insert ${emoji}`;
        btn.style.fontSize = '22px';
        btn.style.padding = '6px';
        btn.style.border = '1px solid var(--border-color)';
        btn.style.borderRadius = '4px';
        btn.style.background = 'var(--bg-primary)';
        btn.style.cursor = 'pointer';
        btn.style.lineHeight = '1';
        btn.style.transition = 'transform 0.1s, background-color 0.1s';
        btn.onmouseover = () => { btn.style.background = 'var(--hover-color)'; btn.style.transform = 'scale(1.15)'; };
        btn.onmouseout = () => { btn.style.background = 'var(--bg-primary)'; btn.style.transform = 'scale(1)'; };
        btn.onclick = (e) => {
            e.preventDefault();
            insertEmoji(emoji);
        };
        grid.appendChild(btn);
    });
}

function insertEmoji(emoji) {
    if (!emoji) return;
    if (AppState.isRichTextMode) {
        if (typeof restoreEditorSelection === 'function') {
            restoreEditorSelection(false);
        }
        if (typeof formatDoc === 'function') {
            formatDoc('insertText', emoji);
        } else {
            document.execCommand('insertText', false, emoji);
        }
        if (typeof saveCurrentStateToMemory === 'function') {
            saveCurrentStateToMemory();
        }
    } else {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const pos = ed.selectionStart;
            ed.value = ed.value.substring(0, pos) + emoji + ed.value.substring(ed.selectionEnd);
            ed.selectionStart = ed.selectionEnd = pos + emoji.length;
            if (typeof pushHistory === 'function') pushHistory(ed.value);
            if (typeof saveCurrentStateToMemory === 'function') saveCurrentStateToMemory();
        }
    }
    if (typeof closeModal === 'function') {
        closeModal('emoji-modal');
    }
    if (typeof showToast === 'function') {
        showToast(`Inserted ${emoji}`);
    }
}

// --- Unified Recent & Closed Files Modal - Single 3-in-1 System ---

function renderRecentClosedModal(filterText = '') {
    const list = document.getElementById('recent-closed-list') || document.getElementById('closed-files-list');
    if (!list) return;

    list.innerHTML = '';
    const closed = AppState.closedFiles || [];
    const openFiles = AppState.files || [];
    const recent = AppState.recentFiles || [];

    // Collect all unified entries with de-duplication
    const seenNames = new Set();
    const unifiedEntries = [];

    // 1. Closed Files (Highest Priority: ready to be reopened)
    closed.forEach(f => {
        if (!seenNames.has(f.name.toLowerCase())) {
            seenNames.add(f.name.toLowerCase());
            unifiedEntries.push({
                file: f,
                status: 'closed',
                badgeText: 'Closed',
                badgeClass: 'badge-closed',
                actionText: 'Reopen',
                timeText: formatRelativeTime(f.closedAt)
            });
        }
    });

    // 2. Currently Open Files
    openFiles.forEach(f => {
        if (!seenNames.has(f.name.toLowerCase())) {
            seenNames.add(f.name.toLowerCase());
            const isCurrent = f.id === AppState.currentFileId;
            unifiedEntries.push({
                file: f,
                status: 'open',
                badgeText: isCurrent ? 'Active Tab' : 'Open Tab',
                badgeClass: 'badge-open',
                actionText: isCurrent ? 'Current' : 'Switch',
                timeText: isCurrent ? 'Currently active' : 'Open in background tab'
            });
        }
    });

    // 3. Other Recent Files
    recent.forEach(f => {
        if (!seenNames.has(f.name.toLowerCase())) {
            seenNames.add(f.name.toLowerCase());
            unifiedEntries.push({
                file: f,
                status: 'recent',
                badgeText: 'Recent',
                badgeClass: 'badge-recent',
                actionText: 'Open',
                timeText: formatRelativeTime(f.savedAt)
            });
        }
    });

    // Apply Live Filter
    const filter = filterText.trim().toLowerCase();
    const filtered = filter 
        ? unifiedEntries.filter(e => e.file.name.toLowerCase().includes(filter) || (e.file.textContent || '').toLowerCase().includes(filter))
        : unifiedEntries;

    if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-closed-files';
        empty.innerHTML = `
            <div style="font-size:32px; margin-bottom:8px;">📁</div>
            <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${filter ? 'No matching documents found' : 'No document history yet'}</div>
            <div style="color:var(--text-secondary); font-size:12px;">${filter ? 'Try searching for a different file name.' : 'Closed and recently opened documents will appear here.'}</div>
        `;
        list.appendChild(empty);
        return;
    }

    filtered.forEach(entry => {
        const { file, status, badgeText, badgeClass, actionText, timeText } = entry;
        const item = document.createElement('div');
        item.className = 'recent-closed-item';
        item.dataset.fileId = file.id;

        const charCount = (file.textContent || '').length;
        const wordCount = (file.textContent || '').trim().split(/\s+/).filter(Boolean).length;
        const isHtml = file.name.toLowerCase().endsWith('.html');
        const isMd = file.name.toLowerCase().endsWith('.md');
        const icon = isHtml ? '🌐' : (isMd ? '📝' : '📄');
        const snippet = (file.textContent || 'Empty document').substring(0, 110).trim();

        item.innerHTML = `
            <div class="closed-file-info">
                <span class="closed-file-icon">${icon}</span>
                <div class="closed-file-details">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="closed-file-title" title="${file.name}">${file.name}</span>
                        <span class="file-status-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <span class="closed-file-meta">${timeText} • ${wordCount} words (${charCount} chars)</span>
                </div>
            </div>
            <div class="closed-file-actions">
                <button class="closed-file-reopen-btn" style="min-width:65px;">${actionText}</button>
                <button class="closed-file-del-btn" title="Remove from history">✕</button>
            </div>
            <!-- Rich Hover Tooltip Card -->
            <div class="item-hover-tooltip">
                <div class="tooltip-title">${file.name}</div>
                <div class="tooltip-meta">
                    <b>Status:</b> ${badgeText}<br>
                    <b>Details:</b> ${timeText}<br>
                    <b>Statistics:</b> ${wordCount} words • ${charCount} chars • ${file.isRichText ? 'Rich Text' : 'Plain Text'}
                </div>
                <div class="tooltip-snippet">"${snippet}..."</div>
            </div>
        `;

        // Click on item or open/reopen button
        const handleOpen = () => {
            if (status === 'closed') {
                reopenSpecificRecentFile(file.id, file);
            } else if (status === 'open') {
                loadFileContent(file.id);
                showToast(`Switched to "${file.name}"`);
            } else {
                reopenSpecificRecentFile(file.id, file);
            }
            closeModal('recent-closed-modal');
            closeModal('closed-files-modal');
        };

        item.querySelector('.closed-file-info').onclick = handleOpen;
        item.querySelector('.closed-file-reopen-btn').onclick = (e) => {
            e.stopPropagation();
            handleOpen();
        };

        item.querySelector('.closed-file-del-btn').onclick = (e) => {
            e.stopPropagation();
            deleteClosedFile(file.id);
            renderRecentClosedModal(filterText);
        };

        list.appendChild(item);
    });
}

function formatRelativeTime(ts) {
    if (!ts) return "Document in history";
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Backward-compatibility aliases
function renderClosedFilesModal() {
    renderRecentClosedModal();
}

function renderRecentMenu() {
    // Menu items now use the unified recent-closed-modal, keep alias active
    renderRecentClosedModal();
}

// --- Menu State Indicators (Word Wrap, Auto Save, Status Bar) ---

function updateMenuUI() {
    const autoCheck = document.getElementById('check-auto-save');
    if (autoCheck) {
        autoCheck.classList.toggle('visible', AppState.autoSaveEnabled);
    }

    // Auto-Save Button Text and State Update (ON / OFF)
    const autoSaveBtn = document.getElementById('tool-auto-save');
    if (autoSaveBtn) {
        const span = autoSaveBtn.querySelector('span:last-child');
        if (span) {
            span.textContent = AppState.autoSaveEnabled ? 'Auto-Save: ON' : 'Auto-Save: OFF';
        }
        autoSaveBtn.classList.toggle('active', AppState.autoSaveEnabled);
        autoSaveBtn.title = AppState.autoSaveEnabled ? 'Auto-Save is ON (Click to turn OFF)' : 'Auto-Save is OFF (Click to turn ON)';
    }

    // Settings Modal Toggle Synchronization
    const settingsAutoCheck = document.getElementById('settings-auto-save');
    if (settingsAutoCheck) {
        settingsAutoCheck.checked = AppState.autoSaveEnabled;
    }

    const wrapCheck = document.getElementById('check-wrap');
    if (wrapCheck) {
        wrapCheck.classList.toggle('visible', AppState.isWordWrap);
    }

    const statusCheck = document.getElementById('check-status');
    const statusBar = document.getElementById('status-bar');
    if (statusCheck && statusBar) {
        statusCheck.classList.toggle('visible', statusBar.style.display !== 'none');
    }
}

// --- Toast System ---

let toastTimer = null;
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2400);
}

// Auto-save visual indicator
function triggerAutoSaveVisual() {
    const indicator = document.getElementById('auto-save-status');
    if (!indicator || !AppState.autoSaveEnabled) return;

    indicator.style.opacity = '1';
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 1800);
}
