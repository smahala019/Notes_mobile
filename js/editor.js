/* ==========================================================================
   Ultimate Web Notepad - Editor Logic, Formatting & Cursor Navigation
   ========================================================================== */

function getCurrentEditor() {
    return AppState.isRichTextMode ? document.getElementById('rich-editor') : document.getElementById('plain-editor');
}

// --- Caret & Selection Preservation (Fixed BUG-21) ---

function saveEditorSelection() {
    if (!AppState.isRichTextMode) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && typeof sel.getRangeAt === 'function') {
        const range = sel.getRangeAt(0);
        const richEditor = document.getElementById('rich-editor');
        if (richEditor && richEditor.contains(range.commonAncestorContainer)) {
            AppState.savedSelection = range.cloneRange();
            if (!range.collapsed && range.toString().length > 0) {
                AppState.lastNonCollapsedSelection = range.cloneRange();
            }
        }
    }
}

function restoreEditorSelection(requireNonCollapsed = false) {
    if (!AppState.isRichTextMode) return false;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return false;

    const sel = window.getSelection();
    if (!sel) return false;

    // Check if current window selection is already valid inside richEditor
    if (sel.rangeCount > 0 && typeof sel.getRangeAt === 'function') {
        const r = sel.getRangeAt(0);
        if (richEditor.contains(r.commonAncestorContainer)) {
            if (!requireNonCollapsed || (!r.collapsed && r.toString().length > 0)) {
                return true;
            }
        }
    }

    // Attempt restoring non-collapsed selection
    let targetRange = null;
    if (requireNonCollapsed) {
        targetRange = AppState.lastNonCollapsedSelection || AppState.savedSelection;
    } else {
        targetRange = AppState.savedSelection || AppState.lastNonCollapsedSelection;
    }

    if (targetRange) {
        try {
            sel.removeAllRanges();
            sel.addRange(targetRange.cloneRange());
            return true;
        } catch (e) {
            console.warn("Could not restore selection range", e);
        }
    }
    return false;
}

function getOrRestoreEditorSelection(preferNonCollapsed = true) {
    if (!AppState.isRichTextMode) return null;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return null;

    const sel = window.getSelection();
    if (!sel) return null;

    // 1. If preferNonCollapsed and current selection is already non-collapsed in editor, use it
    if (sel.rangeCount > 0) {
        const cur = sel.getRangeAt(0);
        if (richEditor.contains(cur.startContainer) && !cur.collapsed && cur.toString().length > 0) {
            return cur;
        }
    }

    // 2. If preferNonCollapsed and we have a saved non-collapsed selection, restore it!
    if (preferNonCollapsed && AppState.lastNonCollapsedSelection) {
        try {
            const range = AppState.lastNonCollapsedSelection.cloneRange();
            if (richEditor.contains(range.startContainer) && richEditor.contains(range.endContainer)) {
                sel.removeAllRanges();
                sel.addRange(range);
                return range;
            }
        } catch (e) {}
    }

    // 3. If current selection is valid in editor (even if caret)
    if (sel.rangeCount > 0) {
        const cur = sel.getRangeAt(0);
        if (richEditor.contains(cur.startContainer)) {
            return cur;
        }
    }

    // 4. Try restoring savedSelection
    if (AppState.savedSelection) {
        try {
            const range = AppState.savedSelection.cloneRange();
            if (richEditor.contains(range.startContainer) && richEditor.contains(range.endContainer)) {
                sel.removeAllRanges();
                sel.addRange(range);
                return range;
            }
        } catch (e) {}
    }

    return null;
}

// --- Mode Switching & Display (Strict Content Isolation) ---

function toggleViewMode() {
    setMode(!AppState.isRichTextMode);
}

function applyWordWrapState() {
    const plainEd = document.getElementById('plain-editor');
    const richEd = document.getElementById('rich-editor');
    const wrapBtn = document.getElementById('tool-layout-wrap');
    const editorArea = document.getElementById('editor-area');

    if (AppState.isWordWrap) {
        if (plainEd) {
            plainEd.classList.add('wrap');
            plainEd.setAttribute('wrap', 'soft');
            plainEd.style.whiteSpace = 'pre-wrap';
            plainEd.style.wordBreak = 'break-word';
            plainEd.style.overflowX = 'hidden';
            plainEd.style.maxWidth = '';
            plainEd.style.width = '';
        }
        if (richEd) {
            richEd.classList.remove('no-wrap');
            richEd.classList.add('wrap');
            richEd.style.whiteSpace = 'pre-wrap';
            richEd.style.wordBreak = 'break-word';
            richEd.style.overflowX = 'hidden';
            richEd.style.maxWidth = '';
            richEd.style.width = '';
        }
        document.body.classList.remove('no-wrap-active');
        if (editorArea) {
            editorArea.classList.remove('no-wrap-active');
            editorArea.scrollLeft = 0;
        }
        if (wrapBtn) {
            wrapBtn.classList.add('active');
            wrapBtn.title = "Toggle Word Wrap (Currently: On)";
        }
    } else {
        if (plainEd) {
            plainEd.classList.remove('wrap');
            plainEd.setAttribute('wrap', 'off');
            plainEd.style.whiteSpace = 'pre';
            plainEd.style.wordBreak = 'normal';
            plainEd.style.overflowX = 'auto';
        }
        if (richEd) {
            richEd.classList.add('no-wrap');
            richEd.classList.remove('wrap');
            richEd.style.whiteSpace = 'pre';
            richEd.style.wordBreak = 'normal';
            richEd.style.overflowX = 'auto';
        }
        document.body.classList.add('no-wrap-active');
        if (editorArea) {
            editorArea.classList.add('no-wrap-active');
        }
        if (wrapBtn) {
            wrapBtn.classList.remove('active');
            wrapBtn.title = "Toggle Word Wrap (Currently: Off)";
        }
        ensureCaretVisible();
    }
}

function ensureCaretVisible() {
    if (AppState.isWordWrap) return;
    const editorArea = document.getElementById('editor-area');
    if (!editorArea) return;

    if (AppState.isRichTextMode) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        
        let rect = null;
        const rects = range.getClientRects();
        if (rects && rects.length > 0) {
            rect = rects[rects.length - 1];
        } else if (range.startContainer) {
            try {
                const marker = document.createElement('span');
                marker.textContent = '\uFEFF';
                const tempRange = range.cloneRange();
                tempRange.collapse(true);
                tempRange.insertNode(marker);
                rect = marker.getBoundingClientRect();
                if (marker.parentNode) marker.parentNode.removeChild(marker);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {}
        }

        if (rect && rect.right !== undefined) {
            const containerRect = editorArea.getBoundingClientRect();
            const paddingRight = 90;
            const paddingLeft = 50;

            if (rect.right > containerRect.right - paddingRight) {
                editorArea.scrollLeft += (rect.right - containerRect.right + paddingRight);
            } else if (rect.left < containerRect.left + paddingLeft) {
                editorArea.scrollLeft -= (containerRect.left + paddingLeft - rect.left);
            }
        }
    } else {
        const plainEd = document.getElementById('plain-editor');
        if (!plainEd) return;
        
        const pos = plainEd.selectionStart;
        const text = plainEd.value || '';
        const textBefore = text.substring(0, pos);
        const lastNewline = textBefore.lastIndexOf('\n');
        const col = pos - (lastNewline === -1 ? 0 : lastNewline + 1);
        
        const approxCharWidth = 9.6;
        const caretX = col * approxCharWidth;
        const visibleWidth = plainEd.clientWidth;
        
        if (caretX > plainEd.scrollLeft + visibleWidth - 80) {
            plainEd.scrollLeft = caretX - visibleWidth + 120;
        } else if (caretX < plainEd.scrollLeft + 40) {
            plainEd.scrollLeft = Math.max(0, caretX - 40);
        }

        const containerRect = editorArea.getBoundingClientRect();
        const edRect = plainEd.getBoundingClientRect();
        if (edRect.right > containerRect.right - 60) {
            editorArea.scrollLeft += (edRect.right - containerRect.right + 80);
        } else if (edRect.left < containerRect.left + 40) {
            editorArea.scrollLeft -= (containerRect.left + 40 - edRect.left);
        }
    }
}

function applyModeDisplay(toRich) {
    AppState.isRichTextMode = toRich;
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const viewModeBtn = document.getElementById('view-mode');
    const toolbar = document.getElementById('main-toolbar');
    const menuBar = document.getElementById('menu-bar');
    const plainPlusWrapper = document.getElementById('plain-plus-wrapper');

    if (toRich) {
        richEditor.style.display = 'block';
        plainEditor.style.display = 'none';
        if (viewModeBtn) {
            viewModeBtn.textContent = "Mode: Rich Text";
            viewModeBtn.style.color = "var(--accent-color)";
        }
        if (toolbar) {
            toolbar.style.display = '';
            toolbar.style.opacity = '';
            toolbar.style.pointerEvents = '';
        }
        if (menuBar) {
            menuBar.style.display = '';
        }
        if (plainPlusWrapper) {
            plainPlusWrapper.style.display = 'none';
        }
        document.body.classList.remove('plain-text-mode');
        document.querySelectorAll('.tool-btn').forEach(btn => btn.disabled = false);
        syncToolbar();
    } else {
        richEditor.style.display = 'none';
        plainEditor.style.display = 'block';

        if (viewModeBtn) {
            viewModeBtn.textContent = "Mode: Plain Text";
            viewModeBtn.style.color = "var(--text-secondary)";
        }

        // In Plain Text mode: clean Notepad experience, hide menu bar and ribbon toolbar
        if (toolbar) {
            toolbar.style.display = 'none';
            toolbar.style.opacity = '';
            toolbar.style.pointerEvents = '';
        }
        if (menuBar) {
            menuBar.style.display = 'none';
        }
        if (plainPlusWrapper) {
            plainPlusWrapper.style.display = 'inline-flex';
        }
        document.body.classList.add('plain-text-mode');
        document.querySelectorAll('.tool-btn').forEach(btn => btn.disabled = true);
    }
    applyWordWrapState();
}

function setMode(toRich, internalSave = true) {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const currentFile = AppState.files.find(f => f.id === AppState.currentFileId);

    if (toRich) {
        // Switching active file to Rich Text mode
        const plainText = plainEditor.value;
        if (currentFile && currentFile.content && currentFile.textContent === plainText) {
            richEditor.innerHTML = currentFile.content;
        } else {
            const safeHtml = plainText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            richEditor.innerHTML = safeHtml.replace(/\n/g, '<br>');
        }
        if (currentFile) {
            currentFile.content = richEditor.innerHTML;
            currentFile.textContent = richEditor.innerText;
            currentFile.isRichText = true;
        }
        applyModeDisplay(true);
        richEditor.focus();
    } else {
        // Switching active file to Plain Text mode
        if (currentFile) {
            currentFile.content = richEditor.innerHTML;
            currentFile.textContent = richEditor.innerText;
            currentFile.isRichText = false;
        }
        plainEditor.value = richEditor.innerText;
        AppState.undoStack = [plainEditor.value];
        AppState.undoIndex = 0;
        applyModeDisplay(false);
        plainEditor.focus();
    }

    if (internalSave) {
        saveCurrentStateToMemory();
    }
    updateStats();
    updateMenuUI();
}

// --- Isolated File Content Loader (Zero Content Mixing Between Files) ---

// --- Isolated File Content Loader (Zero Content Mixing Between Files) ---

function loadFileContent(id) {
    if (!id) return;
    const targetFile = AppState.files.find(f => f.id === id);
    if (!targetFile) return;

    // 1. ATOMIC SAVE: Save active document's current DOM content before switching
    if (AppState.currentFileId && AppState.currentFileId !== id) {
        const prevFile = AppState.files.find(f => f.id === AppState.currentFileId);
        if (prevFile) {
            const richEditor = document.getElementById('rich-editor');
            const plainEditor = document.getElementById('plain-editor');
            if (richEditor && plainEditor) {
                if (AppState.isRichTextMode) {
                    prevFile.content = richEditor.innerHTML;
                    prevFile.textContent = richEditor.innerText;
                } else {
                    prevFile.textContent = plainEditor.value;
                    prevFile.content = plainEditor.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
                }
            }
        }
    }

    // 2. Prevent any auto-save or input listener from firing during switch
    AppState.isSwitchingFiles = true;

    AppState.currentFileId = id;
    renderTabs();

    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');

    // 3. Immediately inject the target file's dedicated content into BOTH editors
    richEditor.innerHTML = targetFile.content || "";
    plainEditor.value = targetFile.textContent || stripHtml(targetFile.content || "");

    // 4. Initialize independent undo stacks for this file
    AppState.undoStack = [plainEditor.value];
    AppState.undoIndex = 0;
    AppState.richUndoStack = [{ html: richEditor.innerHTML, canvasData: null, isPaint: false }];
    AppState.richUndoIndex = 0;

    initPageBreakHandlers();
    initShapeInteractions();
    initImageInteractions();

    // 5. Switch display mode WITHOUT touching or converting content
    applyModeDisplay(targetFile.isRichText !== false);

    // 6. Reset switching guard
    AppState.isSwitchingFiles = false;

    // 7. Focus active editor
    if (targetFile.isRichText !== false) {
        richEditor.focus();
    } else {
        plainEditor.focus();
    }

    // 8. Apply Fonts
    if (targetFile.font) {
        if (targetFile.font.family) {
            richEditor.style.fontFamily = targetFile.font.family;
            plainEditor.style.fontFamily = targetFile.font.family;
            AppState.activeFontFamily = targetFile.font.family;
            if (typeof updateFontToolbar === 'function') updateFontToolbar(targetFile.font.family, null);
        }
        if (targetFile.font.size) {
            richEditor.style.fontSize = targetFile.font.size;
            plainEditor.style.fontSize = targetFile.font.size;
            AppState.activeFontSize = targetFile.font.size;
            if (typeof updateFontToolbar === 'function') updateFontToolbar(null, targetFile.font.size);
        }
    }

    // 9. Synchronize Watermark state
    const wmEl = document.getElementById('document-watermark');
    const wmBtn = document.getElementById('tool-watermark');
    const editorArea = document.getElementById('editor-area');
    if (targetFile.watermark) {
        document.body.classList.add('watermarked');
        richEditor.classList.add('watermarked');
        if (plainEditor) plainEditor.classList.add('watermarked');
        if (editorArea) editorArea.classList.add('watermarked');
        richEditor.setAttribute('data-watermark', targetFile.watermark);
        if (plainEditor) plainEditor.setAttribute('data-watermark', targetFile.watermark);
        if (editorArea) editorArea.setAttribute('data-watermark', targetFile.watermark);
        if (wmEl) {
            wmEl.textContent = targetFile.watermark;
            wmEl.style.display = 'block';
        }
        if (wmBtn) wmBtn.classList.add('active');
    } else {
        document.body.classList.remove('watermarked');
        richEditor.classList.remove('watermarked');
        if (plainEditor) plainEditor.classList.remove('watermarked');
        if (editorArea) editorArea.classList.remove('watermarked');
        richEditor.removeAttribute('data-watermark');
        if (plainEditor) plainEditor.removeAttribute('data-watermark');
        if (editorArea) editorArea.removeAttribute('data-watermark');
        if (wmEl) {
            wmEl.textContent = '';
            wmEl.style.display = 'none';
        }
        if (wmBtn) wmBtn.classList.remove('active');
    }

    updateStats();
    updateMenuUI();
    addRecentFile(targetFile);
}

// --- Accurate Cursor Position Tracking (Fixed BUG-04) ---

function getRichTextCursorCoordinates() {
    const richEditor = document.getElementById('rich-editor');
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || typeof selection.getRangeAt !== 'function') return { line: 1, col: 1 };

    const range = selection.getRangeAt(0);
    if (!richEditor.contains(range.commonAncestorContainer)) {
        return { line: 1, col: 1 };
    }

    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    let textBeforeCaret = "";
    let reached = false;

    const blockTags = new Set([
        'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
        'LI', 'TR', 'BLOCKQUOTE', 'PRE', 'TABLE', 'SECTION', 'ARTICLE'
    ]);

    function walk(node) {
        if (reached) return;

        // Check if this node is the caret container
        if (node === endContainer) {
            if (node.nodeType === Node.TEXT_NODE) {
                textBeforeCaret += node.nodeValue.substring(0, endOffset);
                reached = true;
                return;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let i = 0; i < endOffset && i < node.childNodes.length; i++) {
                    walk(node.childNodes[i]);
                    if (reached) return;
                }
                reached = true;
                return;
            }
        }

        if (node.nodeType === Node.TEXT_NODE) {
            textBeforeCaret += node.nodeValue;
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.nodeName.toUpperCase();
            if (tag === 'BR') {
                textBeforeCaret += '\n';
                return;
            }

            const isBlock = blockTags.has(tag);
            if (isBlock && textBeforeCaret.length > 0 && !textBeforeCaret.endsWith('\n')) {
                textBeforeCaret += '\n';
            }

            for (let i = 0; i < node.childNodes.length; i++) {
                walk(node.childNodes[i]);
                if (reached) return;
            }

            if (isBlock && textBeforeCaret.length > 0 && !textBeforeCaret.endsWith('\n')) {
                textBeforeCaret += '\n';
            }
        }
    }

    walk(richEditor);

    const lines = textBeforeCaret.split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;

    return { line: currentLine, col: currentCol };
}

function updateStats() {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const cursorPosEl = document.getElementById('cursor-pos');

    let text = "";
    let line = 1;
    let col = 1;

    if (AppState.isRichTextMode) {
        text = richEditor.innerText || "";
        const coords = getRichTextCursorCoordinates();
        line = coords.line;
        col = coords.col;
    } else {
        text = plainEditor.value || "";
        const selStart = plainEditor.selectionStart || 0;
        const textBefore = text.substring(0, selStart);
        const lines = textBefore.split('\n');
        line = lines.length;
        col = lines[lines.length - 1].length + 1;
    }

    const chars = text.length;
    const trimmed = text.trim();
    const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

    if (wordCountEl) wordCountEl.textContent = `Words: ${words}`;
    if (charCountEl) charCountEl.textContent = `Chars: ${chars}`;
    if (cursorPosEl) {
        cursorPosEl.textContent = `Ln ${line}, Col ${col}`;
        cursorPosEl.style.display = 'inline-block';
    }
}

// --- Font Toolbar Synchronization Helper ---

function updateFontToolbar(family, size) {
    if (family) {
        const fontSelect = document.getElementById('font-family-select');
        if (fontSelect && fontSelect.options && document.activeElement !== fontSelect) {
            const primaryFamily = family.split(',')[0].trim().toLowerCase().replace(/['"]/g, '');
            let matchedIndex = -1;
            
            // 1. Exact match on option primary font name or option label
            for (let i = 0; i < fontSelect.options.length; i++) {
                const optPrimary = fontSelect.options[i].value.split(',')[0].trim().toLowerCase().replace(/['"]/g, '');
                const optLabel = fontSelect.options[i].text.trim().toLowerCase();
                if (optPrimary === primaryFamily || optLabel === primaryFamily) {
                    matchedIndex = i;
                    break;
                }
            }
            
            // 2. Partial containment match (e.g. 'calibri' in 'calibri' or label)
            if (matchedIndex === -1) {
                for (let i = 0; i < fontSelect.options.length; i++) {
                    const optPrimary = fontSelect.options[i].value.split(',')[0].trim().toLowerCase().replace(/['"]/g, '');
                    const optLabel = fontSelect.options[i].text.trim().toLowerCase();
                    if (optPrimary.includes(primaryFamily) || primaryFamily.includes(optPrimary) ||
                        optLabel.includes(primaryFamily) || primaryFamily.includes(optLabel)) {
                        matchedIndex = i;
                        break;
                    }
                }
            }
            
            if (matchedIndex !== -1) {
                fontSelect.selectedIndex = matchedIndex;
            }
        }
    }

    if (size) {
        const sizeInput = document.getElementById('font-size-input');
        if (sizeInput && document.activeElement !== sizeInput) {
            const parsed = parseInt(size);
            if (!isNaN(parsed) && parsed > 0) {
                sizeInput.value = parsed;
            }
        }
    }
}

// --- Toolbar State Sync (Fixed BUG-12: strikethrough mapping) ---

function syncToolbar() {
    if (!AppState.isRichTextMode) return;

    const commandMap = [
        { cmd: 'bold', id: 'tool-bold' },
        { cmd: 'italic', id: 'tool-italic' },
        { cmd: 'underline', id: 'tool-underline' },
        { cmd: 'strikeThrough', id: 'tool-strike' }, // Fixed mapping
        { cmd: 'subscript', id: 'tool-subscript' },
        { cmd: 'superscript', id: 'tool-superscript' },
        { cmd: 'justifyLeft', id: 'tool-justifyleft' },
        { cmd: 'justifyCenter', id: 'tool-justifycenter' },
        { cmd: 'justifyRight', id: 'tool-justifyright' },
        { cmd: 'justifyFull', id: 'tool-justifyfull' },
        { cmd: 'insertUnorderedList', id: 'tool-insertunorderedlist' },
        { cmd: 'insertOrderedList', id: 'tool-insertorderedlist' }
    ];

    commandMap.forEach(item => {
        try {
            const isActive = document.queryCommandState(item.cmd);
            const btn = document.getElementById(item.id);
            if (btn) {
                if (isActive) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        } catch (e) {}
    });

    try {
        const blockValue = document.queryCommandValue('formatBlock');
        const formatSelect = document.getElementById('formatBlock');
        if (formatSelect && blockValue) {
            const normalized = blockValue.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (let i = 0; i < formatSelect.options.length; i++) {
                if (formatSelect.options[i].value.toLowerCase() === normalized) {
                    formatSelect.selectedIndex = i;
                    break;
                }
            }
        }
    } catch (e) {}

    // Synchronize font family and font size with current selection (guard against overriding active selection change)
    if (!AppState.isSettingFont) {
        try {
            const sel = window.getSelection();
            const richEditor = document.getElementById('rich-editor');
            if (sel && sel.rangeCount > 0 && richEditor) {
                const node = sel.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode) : null;
                if (node && richEditor.contains(node)) {
                    const computed = window.getComputedStyle(node);
                    if (computed && computed.fontFamily) {
                        updateFontToolbar(computed.fontFamily, computed.fontSize);
                        AppState.activeFontFamily = computed.fontFamily;
                        AppState.activeFontSize = computed.fontSize;
                    }
                }
            }
        } catch (e) {}
    }
}

function clearSelectionFormatting() {
    if (!AppState.isRichTextMode) return;
    pushRichSnapshot();
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();
    restoreEditorSelection(false);

    try {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (!range.collapsed) {
                const fragment = range.cloneContents();
                const styledNodes = fragment.querySelectorAll('[style], font, b, strong, i, em, u, s, strike, sub, sup');
                if (styledNodes.length > 0) {
                    const text = range.toString();
                    document.execCommand('insertText', false, text);
                }
            } else {
                let node = sel.anchorNode;
                if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
                while (node && node !== richEditor && richEditor.contains(node)) {
                    if (node.tagName === 'SPAN' || node.tagName === 'FONT') {
                        node.removeAttribute('style');
                    }
                    node = node.parentElement;
                }
            }
        }

        try {
            document.execCommand('formatBlock', false, '<p>');
        } catch (e) {
            try { document.execCommand('formatBlock', false, 'p'); } catch (e2) {}
        }

        updateFontToolbar(AppState.activeFontFamily || "'Segoe UI', sans-serif", 16);
    } catch (e) {
        console.warn('Error clearing selection format:', e);
    }

    saveEditorSelection();
    syncToolbar();
    pushRichSnapshot();
    saveCurrentStateToMemory();
    showToast('Formatting cleared');
}

function replacePlainTextSelection(textarea, start, end, text, newCaret = null) {
    textarea.focus();
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    const caret = (newCaret !== null) ? newCaret : (start + text.length);
    textarea.selectionStart = caret;
    textarea.selectionEnd = caret;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function handlePlainTextFormat(cmd, value = null) {
    const plainEditor = document.getElementById('plain-editor');
    if (!plainEditor) return;
    const start = plainEditor.selectionStart;
    const end = plainEditor.selectionEnd;
    const val = plainEditor.value;
    const sel = val.substring(start, end);

    let before = '', after = '';
    switch (cmd) {
        case 'bold': before = '**'; after = '**'; break;
        case 'italic': before = '*'; after = '*'; break;
        case 'underline': before = '<u>'; after = '</u>'; break;
        case 'strikeThrough': before = '~~'; after = '~~'; break;
        case 'code': before = '`'; after = '`'; break;
        case 'codeBlock': before = '```\n'; after = '\n```'; break;
        case 'insertUnorderedList': {
            const lines = (sel || '').split('\n').map(l => l.startsWith('- ') ? l.substring(2) : '- ' + l).join('\n');
            replacePlainTextSelection(plainEditor, start, end, lines || '- ');
            return;
        }
        case 'insertOrderedList': {
            let counter = 1;
            const olLines = (sel || '').split('\n').map(l => `${counter++}. ${l.replace(/^\d+\.\s*/, '')}`).join('\n');
            replacePlainTextSelection(plainEditor, start, end, olLines || '1. ');
            return;
        }
        case 'outdent': {
            const outLines = (sel || '').split('\n').map(l => l.replace(/^( {1,4}|\t)/, '')).join('\n');
            replacePlainTextSelection(plainEditor, start, end, outLines);
            return;
        }
        case 'indent': {
            const inLines = (sel || '').split('\n').map(l => '    ' + l).join('\n');
            replacePlainTextSelection(plainEditor, start, end, inLines);
            return;
        }
        default:
            showToast('Rich formatting available in Rich Text mode (Tools > Mode)');
            return;
    }

    if (before && after) {
        const replacement = sel ? (before + sel + after) : (before + after);
        replacePlainTextSelection(plainEditor, start, end, replacement, sel ? null : start + before.length);
        showToast(`Markdown applied: ${before}...${after}`);
    }
}

function formatDoc(cmd, value = null) {
    if (!AppState.isRichTextMode) {
        handlePlainTextFormat(cmd, value);
        return;
    }

    if (cmd === 'removeFormat') {
        clearSelectionFormatting();
        return;
    }

    pushRichSnapshot();
    const richEditor = document.getElementById('rich-editor');
    if (richEditor) richEditor.focus();
    restoreEditorSelection(false);

    if (cmd === 'formatBlock' && value) {
        const cleanTag = value.replace(/[<>]/g, '');
        try {
            document.execCommand('formatBlock', false, `<${cleanTag}>`);
        } catch (e) {
            document.execCommand('formatBlock', false, cleanTag);
        }
    } else if (cmd === 'hiliteColor' && value) {
        if (!document.execCommand('hiliteColor', false, value)) {
            document.execCommand('backColor', false, value);
        }
    } else if (value) {
        document.execCommand(cmd, false, value);
    } else {
        document.execCommand(cmd, false, null);
    }

    saveEditorSelection();
    syncToolbar();
    pushRichSnapshot();
    saveCurrentStateToMemory();
}

function applyFontSize(size) {
    const sizeNum = parseInt(size);
    if (isNaN(sizeNum) || sizeNum < 1) return;
    const sizePx = `${sizeNum}px`;
    AppState.activeFontSize = sizePx;
    AppState.isSettingFont = true;
    setTimeout(() => { AppState.isSettingFont = false; }, 350);

    const cur = AppState.files.find(f => f.id === AppState.currentFileId);
    if (cur) {
        if (!cur.font) cur.font = {};
        cur.font.size = sizePx;
    }

    if (!AppState.isRichTextMode) {
        const plainEditor = document.getElementById('plain-editor');
        if (plainEditor) plainEditor.style.fontSize = sizePx;
        updateFontToolbar(null, sizeNum);
        saveCurrentStateToMemory();
        showToast(`Plain text font size: ${sizeNum}px`);
        return;
    }

    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();
    restoreEditorSelection(false);

    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && typeof sel.getRangeAt === 'function' && !sel.isCollapsed && sel.toString().length > 0;

    if (hasSelection) {
        // Apply to SELECTED text using clean font marker
        document.execCommand('styleWithCSS', false, false);
        document.execCommand('fontSize', false, '7');

        const fontTags = richEditor.querySelectorAll('font[size]');
        const createdSpans = [];
        fontTags.forEach(el => {
            const span = document.createElement('span');
            span.style.fontSize = sizePx;
            while (el.firstChild) span.appendChild(el.firstChild);
            el.parentNode.replaceChild(span, el);
            createdSpans.push(span);
        });

        // Also normalize any browser-generated CSS large spans
        richEditor.querySelectorAll('span[style*="-webkit-xxx-large"], span[style*="font-size: 36pt"], span[style*="font-size: 48px"]').forEach(el => {
            el.style.fontSize = sizePx;
            createdSpans.push(el);
        });

        // Re-select the newly styled content so text DOES NOT auto-deselect
        if (createdSpans.length > 0) {
            try {
                const newRange = document.createRange();
                newRange.setStartBefore(createdSpans[0]);
                newRange.setEndAfter(createdSpans[createdSpans.length - 1]);
                sel.removeAllRanges();
                sel.addRange(newRange);
                AppState.savedSelection = newRange.cloneRange();
                AppState.lastNonCollapsedSelection = newRange.cloneRange();
            } catch (e) {
                console.warn("Could not re-select styled spans", e);
            }
        }
        showToast(`Text size: ${sizeNum}px (Selected text)`);
    } else {
        // No selection: set default editor style and prepare typing span at caret
        if (!richEditor.textContent || richEditor.textContent.trim() === '') {
            richEditor.style.fontSize = sizePx;
        }

        if (sel && sel.rangeCount > 0) {
            try {
                const range = sel.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = sizePx;
                if (AppState.activeFontFamily) span.style.fontFamily = AppState.activeFontFamily;
                const zw = document.createTextNode('\u200B');
                span.appendChild(zw);
                range.insertNode(span);
                const newRange = document.createRange();
                newRange.setStart(zw, 1);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
                AppState.savedSelection = newRange.cloneRange();
            } catch (e) {
                console.warn("Typing span insert fallback", e);
            }
        }
        showToast(`Font size: ${sizeNum}px`);
    }

    updateFontToolbar(null, sizeNum);
    saveEditorSelection();
    saveCurrentStateToMemory();
    updateStats();
}

function applyFontFamily(font) {
    if (!font) return;
    const cleanFontName = font.split(',')[0].replace(/['"]/g, '').trim();
    AppState.activeFontFamily = font;
    AppState.isSettingFont = true;
    setTimeout(() => { AppState.isSettingFont = false; }, 350);

    const cur = AppState.files.find(f => f.id === AppState.currentFileId);
    if (cur) {
        if (!cur.font) cur.font = {};
        cur.font.family = font;
    }

    if (!AppState.isRichTextMode) {
        const plainEditor = document.getElementById('plain-editor');
        if (plainEditor) plainEditor.style.fontFamily = font;
        updateFontToolbar(font, null);
        saveCurrentStateToMemory();
        showToast(`Plain text font: ${cleanFontName}`);
        return;
    }

    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();
    restoreEditorSelection(false);

    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && typeof sel.getRangeAt === 'function' && !sel.isCollapsed && sel.toString().length > 0;

    if (hasSelection) {
        // Apply to SELECTED text using clean CSS font command
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontName', false, font);

        // Normalize any font[face] tags to clean span
        richEditor.querySelectorAll('font[face]').forEach(el => {
            const span = document.createElement('span');
            span.style.fontFamily = font;
            while (el.firstChild) span.appendChild(el.firstChild);
            el.parentNode.replaceChild(span, el);
        });

        showToast(`Font: ${cleanFontName} (Selected text)`);
    } else {
        // No selection: set default editor style and prepare typing span at caret
        if (!richEditor.textContent || richEditor.textContent.trim() === '') {
            richEditor.style.fontFamily = font;
        }

        if (sel && sel.rangeCount > 0) {
            try {
                const range = sel.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontFamily = font;
                if (AppState.activeFontSize) span.style.fontSize = AppState.activeFontSize;
                const zw = document.createTextNode('\u200B');
                span.appendChild(zw);
                range.insertNode(span);
                const newRange = document.createRange();
                newRange.setStart(zw, 1);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
                AppState.savedSelection = newRange.cloneRange();
            } catch (e) {
                console.warn("Typing font span insert fallback", e);
            }
        }
        showToast(`Font: ${cleanFontName}`);
    }

    updateFontToolbar(font, null);
    saveEditorSelection();
    saveCurrentStateToMemory();
    updateStats();
}

function applyListStyle(type) {
    if (!AppState.isRichTextMode) return;
    const richEditor = document.getElementById('rich-editor');
    richEditor.focus();

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    while (node && node !== richEditor) {
        if (node.nodeName === 'UL' || node.nodeName === 'OL') {
            node.style.listStyleType = type;
            syncToolbar();
            return;
        }
        node = node.parentNode;
    }

    if (type.includes('decimal') || type.includes('alpha') || type.includes('roman')) {
        document.execCommand('insertOrderedList', false, null);
        setTimeout(() => applyListStyle(type), 0);
    } else {
        document.execCommand('insertUnorderedList', false, null);
        setTimeout(() => applyListStyle(type), 0);
    }
}

function insertDate() {
    const dateStr = new Date().toLocaleString();
    if (AppState.isRichTextMode) {
        formatDoc('insertText', dateStr);
    } else {
        const ed = document.getElementById('plain-editor');
        const start = ed.selectionStart;
        const end = ed.selectionEnd;
        ed.value = ed.value.substring(0, start) + dateStr + ed.value.substring(end);
        ed.selectionStart = ed.selectionEnd = start + dateStr.length;
        pushHistory(ed.value);
        updateStats();
        saveCurrentStateToMemory();
    }
}

// --- Safe Find & Replace (Fixed BUG-08: DOM TreeWalker Replaces Text Safely) ---

function performUnifiedFind(searchTerm) {
    if (!searchTerm) return false;
    const ed = getCurrentEditor();
    ed.focus();

    if (AppState.isRichTextMode) {
        // Standard user selection search in rich mode
        if (window.find) {
            const found = window.find(searchTerm, false, false, true, false, false, false);
            if (!found) {
                showToast(`Cannot find "${searchTerm}"`);
            }
            return found;
        } else {
            showToast("Search completed");
            return false;
        }
    } else {
        const plainEditor = document.getElementById('plain-editor');
        const text = plainEditor.value;
        const currentPos = plainEditor.selectionEnd;
        let foundIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), currentPos);

        if (foundIndex === -1) {
            foundIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), 0);
            if (foundIndex !== -1) showToast("Search wrapped to top");
        }

        if (foundIndex !== -1) {
            plainEditor.focus();
            plainEditor.selectionStart = foundIndex;
            plainEditor.selectionEnd = foundIndex + searchTerm.length;
            updateStats();
            return true;
        } else {
            showToast(`Cannot find "${searchTerm}"`);
            return false;
        }
    }
}

function performReplaceOne(search, replace) {
    if (!search) return;
    const ed = getCurrentEditor();

    if (AppState.isRichTextMode) {
        const sel = window.getSelection().toString();
        if (sel.toLowerCase() === search.toLowerCase()) {
            document.execCommand('insertText', false, replace);
        }
        performUnifiedFind(search);
    } else {
        const plainEditor = document.getElementById('plain-editor');
        const sel = plainEditor.value.substring(plainEditor.selectionStart, plainEditor.selectionEnd);
        if (sel.toLowerCase() === search.toLowerCase()) {
            const start = plainEditor.selectionStart;
            plainEditor.value = plainEditor.value.substring(0, start) + replace + plainEditor.value.substring(plainEditor.selectionEnd);
            plainEditor.selectionStart = start;
            plainEditor.selectionEnd = start + replace.length;
            pushHistory(plainEditor.value);
            updateStats();
        }
        performUnifiedFind(search);
    }
    saveCurrentStateToMemory();
}

function performReplaceAll(search, replace) {
    if (!search) return;

    if (AppState.isRichTextMode) {
        // Safe Text-Node Walker replacement without corrupting HTML tags
        const richEditor = document.getElementById('rich-editor');
        const walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
        let count = 0;
        const nodesToReplace = [];

        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.toLowerCase().includes(search.toLowerCase())) {
                nodesToReplace.push(walker.currentNode);
            }
        }

        const regex = new RegExp(escapeRegExp(search), 'gi');
        nodesToReplace.forEach(node => {
            const matches = node.nodeValue.match(regex);
            if (matches) count += matches.length;
            node.nodeValue = node.nodeValue.replace(regex, replace);
        });

        showToast(`Replaced ${count} occurrences`);
        updateStats();
        saveCurrentStateToMemory();
    } else {
        const plainEditor = document.getElementById('plain-editor');
        const regex = new RegExp(escapeRegExp(search), 'gi');
        const matches = plainEditor.value.match(regex);
        const count = matches ? matches.length : 0;
        plainEditor.value = plainEditor.value.replace(regex, replace);
        pushHistory(plainEditor.value);
        showToast(`Replaced ${count} occurrences`);
        updateStats();
        saveCurrentStateToMemory();
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Go to line
function goToLine(lineNum) {
    if (lineNum < 1) return;

    if (AppState.isRichTextMode) {
        const richEditor = document.getElementById('rich-editor');
        const walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
        let currentLine = 1;
        let targetNode = null;

        while (walker.nextNode()) {
            const linesInNode = walker.currentNode.nodeValue.split('\n').length;
            if (currentLine + linesInNode - 1 >= lineNum) {
                targetNode = walker.currentNode;
                break;
            }
            currentLine += linesInNode - 1;
        }

        if (targetNode) {
            const range = document.createRange();
            range.setStart(targetNode, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            targetNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showToast("Line not found");
        }
    } else {
        const plainEditor = document.getElementById('plain-editor');
        const lines = plainEditor.value.split('\n');
        if (lineNum <= lines.length) {
            let charIndex = 0;
            for (let i = 0; i < lineNum - 1; i++) {
                charIndex += lines[i].length + 1;
            }
            plainEditor.focus();
            plainEditor.selectionStart = plainEditor.selectionEnd = charIndex;
            updateStats();
        } else {
            showToast("Line number exceeds total lines");
        }
    }
}

// --- MS Word Advanced Features ---

// 1. Format Painter
let formatPainterStyles = null;

function toggleFormatPainter() {
    if (!AppState.isRichTextMode) {
        showToast("Format Painter is available in Rich Text mode");
        return;
    }

    const painterBtn = document.getElementById('tool-format-painter');
    if (formatPainterStyles) {
        formatPainterStyles = null;
        if (painterBtn) painterBtn.classList.remove('active');
        document.body.style.cursor = '';
        showToast("Format Painter cancelled");
        return;
    }

    const sel = window.getSelection();
    let node = null;
    if (sel && sel.rangeCount > 0) {
        if (!sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            node = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        } else {
            node = sel.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
        }
    }

    if (node) {
        const comp = window.getComputedStyle(node);
        formatPainterStyles = {
            fontFamily: comp.fontFamily,
            fontSize: comp.fontSize,
            fontWeight: comp.fontWeight,
            fontStyle: comp.fontStyle,
            color: comp.color,
            backgroundColor: comp.backgroundColor,
            textDecoration: comp.textDecoration
        };
    }

    if (!formatPainterStyles) {
        formatPainterStyles = {
            fontWeight: 'bold',
            fontFamily: AppState.activeFontFamily || "'Segoe UI', sans-serif",
            fontSize: AppState.activeFontSize || '16px'
        };
    }

    if (painterBtn) painterBtn.classList.add('active');
    document.body.style.cursor = 'copy';
    showToast("Format copied! Click a word or drag text to apply");
}

function applyFormatPainterIfActive() {
    if (!formatPainterStyles || !AppState.isRichTextMode) return;
    const richEditor = document.getElementById('rich-editor');
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !richEditor) return;

    let anchor = sel.anchorNode;
    if (!anchor || !richEditor.contains(anchor)) return;

    pushRichSnapshot();

    try {
        let range = sel.getRangeAt(0);
        // If selection is collapsed (user just clicked a word), expand range to surrounding word
        if (range.collapsed) {
            let textNode = anchor;
            if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
                const text = textNode.textContent;
                const offset = sel.anchorOffset;
                let start = offset;
                let end = offset;
                while (start > 0 && /\S/.test(text[start - 1])) start--;
                while (end < text.length && /\S/.test(text[end])) end++;
                if (start < end) {
                    const wordRange = document.createRange();
                    wordRange.setStart(textNode, start);
                    wordRange.setEnd(textNode, end);
                    range = wordRange;
                }
            }
        }

        if (!range.collapsed && range.toString().length > 0) {
            const span = document.createElement('span');
            if (formatPainterStyles.fontFamily) span.style.fontFamily = formatPainterStyles.fontFamily;
            if (formatPainterStyles.fontSize) span.style.fontSize = formatPainterStyles.fontSize;
            if (formatPainterStyles.fontWeight) span.style.fontWeight = formatPainterStyles.fontWeight;
            if (formatPainterStyles.fontStyle) span.style.fontStyle = formatPainterStyles.fontStyle;
            if (formatPainterStyles.color && formatPainterStyles.color !== 'rgba(0, 0, 0, 0)' && formatPainterStyles.color !== 'transparent') {
                span.style.color = formatPainterStyles.color;
            }
            if (formatPainterStyles.backgroundColor && formatPainterStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && formatPainterStyles.backgroundColor !== 'transparent') {
                span.style.backgroundColor = formatPainterStyles.backgroundColor;
            }
            if (formatPainterStyles.textDecoration && formatPainterStyles.textDecoration !== 'none') {
                span.style.textDecoration = formatPainterStyles.textDecoration;
            }

            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            sel.selectAllChildren(span);
        }
    } catch (e) {
        console.warn('Error applying format painter:', e);
    }

    formatPainterStyles = null;
    const painterBtn = document.getElementById('tool-format-painter');
    if (painterBtn) painterBtn.classList.remove('active');
    document.body.style.cursor = '';
    pushRichSnapshot();
    saveCurrentStateToMemory();
    syncToolbar();
    showToast("Format applied");
}

// 2. Grow & Shrink Font Size (MS Word style)
function growFontSize() {
    adjustFontSize(2);
}

function shrinkFontSize() {
    adjustFontSize(-2);
}

function adjustFontSize(delta) {
    const sizeInput = document.getElementById('font-size-input');
    let currSize = 16;

    if (AppState.isRichTextMode) {
        restoreEditorSelection(true);
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const parent = range.startContainer.nodeType === Node.TEXT_NODE 
                ? range.startContainer.parentElement 
                : range.startContainer;
            if (parent) {
                const comp = parseInt(window.getComputedStyle(parent).fontSize);
                if (comp) currSize = comp;
            }
        } else {
            currSize = parseInt(sizeInput ? sizeInput.value : 16) || 16;
        }
    } else {
        currSize = parseInt(sizeInput ? sizeInput.value : 16) || 16;
    }

    let nextSize = Math.max(1, currSize + delta);
    if (sizeInput) sizeInput.value = nextSize;
    applyFontSize(nextSize);
}

// 3. Change Case (MS Word "Aa" feature)
function changeCase(type) {
    if (AppState.isRichTextMode) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            showToast("Select text to change case");
            return;
        }
        const text = sel.toString();
        if (!text) return;
        let converted = convertCase(text, type);
        document.execCommand('insertText', false, converted);
        saveCurrentStateToMemory();
        showToast(`Case changed to ${type}`);
    } else {
        const ed = document.getElementById('plain-editor');
        const start = ed.selectionStart;
        const end = ed.selectionEnd;
        if (start === end) {
            showToast("Select text to change case");
            return;
        }
        const text = ed.value.substring(start, end);
        const converted = convertCase(text, type);
        ed.value = ed.value.substring(0, start) + converted + ed.value.substring(end);
        ed.selectionStart = start;
        ed.selectionEnd = start + converted.length;
        pushHistory(ed.value);
        saveCurrentStateToMemory();
        updateStats();
        showToast(`Case changed to ${type}`);
    }
}

function convertCase(text, type) {
    switch (type) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'titlecase':
            return text.replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        case 'sentencecase':
            return text.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, c => c.toUpperCase());
        case 'invertcase':
            return text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
        default:
            return text;
    }
}

// 4. Line Spacing (MS Word Line and Paragraph Spacing)
function applyLineSpacing(spacing) {
    if (AppState.isRichTextMode) {
        const richEditor = document.getElementById('rich-editor');
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            let node = range.commonAncestorContainer;
            if (node.nodeType === 3) node = node.parentElement;
            let block = node.closest('p, div, h1, h2, h3, h4, h5, h6, li, blockquote');
            if (block && block !== richEditor) {
                block.style.lineHeight = spacing;
            } else {
                richEditor.style.lineHeight = spacing;
            }
        } else {
            richEditor.style.lineHeight = spacing;
        }
        saveCurrentStateToMemory();
        showToast(`Line spacing: ${spacing}`);
    } else {
        document.getElementById('plain-editor').style.lineHeight = spacing;
        saveCurrentStateToMemory();
        showToast(`Line spacing: ${spacing}`);
    }
}

// 5. Insert Horizontal Rule / Page Divider (Full Width)
function insertHorizontalRule() {
    if (!AppState.isRichTextMode) {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const pos = ed.selectionStart;
            const hrText = "\n" + "―".repeat(60) + "\n";
            ed.value = ed.value.substring(0, pos) + hrText + ed.value.substring(ed.selectionEnd);
            ed.selectionStart = ed.selectionEnd = pos + hrText.length;
            pushHistory(ed.value);
            saveCurrentStateToMemory();
            showToast("Full-width divider inserted");
        }
        return;
    }
    restoreEditorSelection(false);
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    const hr = document.createElement('hr');
    hr.style.width = '100%';
    hr.style.border = 'none';
    hr.style.borderTop = '2px solid var(--border-color)';
    hr.style.margin = '18px 0';
    hr.style.clear = 'both';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && richEditor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(hr);
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        hr.parentNode.insertBefore(p, hr.nextSibling);
        range.setStart(p, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        richEditor.appendChild(hr);
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        richEditor.appendChild(p);
    }
    pushRichSnapshot();
    saveCurrentStateToMemory();
    showToast("Full-width divider inserted");
}

// 6. Insert Checklist / Task List Item
function insertChecklist() {
    if (!AppState.isRichTextMode) {
        const ed = document.getElementById('plain-editor');
        const pos = ed.selectionStart;
        const item = "[ ] Task item\n";
        ed.value = ed.value.substring(0, pos) + item + ed.value.substring(ed.selectionEnd);
        ed.selectionStart = ed.selectionEnd = pos + item.length;
        pushHistory(ed.value);
        saveCurrentStateToMemory();
        showToast("Checklist item inserted");
        return;
    }

    const html = '<div class="todo-item" style="display:flex; align-items:center; gap:8px; margin:4px 0;"><input type="checkbox" style="width:16px; height:16px; cursor:pointer;"> <span>Task item</span></div><p><br></p>';
    document.execCommand('insertHTML', false, html);
    saveCurrentStateToMemory();
    showToast("Checklist item inserted");
}

// 7. Insert Special Character / Symbol
function insertSymbol(symbol) {
    if (!symbol) return;
    if (AppState.isRichTextMode) {
        restoreEditorSelection();
        document.execCommand('insertText', false, symbol);
        saveCurrentStateToMemory();
    } else {
        const ed = document.getElementById('plain-editor');
        const pos = ed.selectionStart;
        ed.value = ed.value.substring(0, pos) + symbol + ed.value.substring(ed.selectionEnd);
        ed.selectionStart = ed.selectionEnd = pos + symbol.length;
        pushHistory(ed.value);
        saveCurrentStateToMemory();
    }
    closeModal('symbol-modal');
    showToast(`Inserted: ${symbol}`);
}

// ==========================================================================
// Mobile Text Selector Tool with Draggable Handles & Edge Auto-Scrolling
// ==========================================================================

let isMobileSelectorActive = false;
let activeDragHandle = null;
let edgeAutoScrollRaf = null;
let edgeAutoScrollSpeed = 0;
let lastTouchX = 0;
let lastTouchY = 0;

function toggleMobileSelector(forceState = null) {
    const container = document.getElementById('mobile-selector-container');
    if (!container) return;

    if (forceState !== null) {
        isMobileSelectorActive = forceState;
    } else {
        isMobileSelectorActive = !isMobileSelectorActive;
    }

    if (isMobileSelectorActive) {
        container.style.display = 'block';
        const activeEd = getCurrentEditor();
        if (activeEd) activeEd.focus();

        // If no text is selected yet, select the first word or word under caret
        const sel = window.getSelection();
        if (AppState.isRichTextMode) {
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                selectCurrentWordAtCaret();
            }
        } else {
            const ed = document.getElementById('plain-editor');
            if (ed && ed.selectionStart === ed.selectionEnd) {
                selectCurrentWordInPlainEditor();
            }
        }

        updateMobileSelectorHandles();
        showToast("Text Selector Active: Drag handles to select text");
    } else {
        container.style.display = 'none';
        stopEdgeAutoScroll();
        activeDragHandle = null;
    }
}

function initMobileTextSelector() {
    const container = document.getElementById('mobile-selector-container');
    const startHandle = document.getElementById('mobile-sel-start');
    const endHandle = document.getElementById('mobile-sel-end');
    const toolbar = document.getElementById('mobile-sel-toolbar');
    const editorArea = document.getElementById('editor-area');
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');

    if (!container || !startHandle || !endHandle || !toolbar) return;

    // --- Touch & Mouse Drag Handlers for Handles ---
    function onDragStart(handleType, clientX, clientY, e) {
        activeDragHandle = handleType;
        lastTouchX = clientX;
        lastTouchY = clientY;
        if (e && e.cancelable) e.preventDefault();
    }

    function onDragMove(clientX, clientY, e) {
        if (!activeDragHandle || !isMobileSelectorActive) return;
        if (e && e.cancelable) e.preventDefault();

        lastTouchX = clientX;
        lastTouchY = clientY;

        // Detect proximity to top or bottom edge for edge auto-scrolling
        const areaRect = editorArea.getBoundingClientRect();
        const topEdgeThreshold = areaRect.top + 70;
        const bottomEdgeThreshold = areaRect.bottom - 70;

        if (clientY < topEdgeThreshold) {
            // Near top edge: scroll upwards
            const distance = Math.max(1, topEdgeThreshold - clientY);
            edgeAutoScrollSpeed = -Math.min(30, Math.max(4, distance * 0.45));
            startEdgeAutoScroll();
        } else if (clientY > bottomEdgeThreshold) {
            // Near bottom edge: scroll downwards
            const distance = Math.max(1, clientY - bottomEdgeThreshold);
            edgeAutoScrollSpeed = Math.min(30, Math.max(4, distance * 0.45));
            startEdgeAutoScroll();
        } else {
            // Within safe zone: pause auto-scroll
            stopEdgeAutoScroll();
        }

        // Apply caret position to update selection
        applyDragCoordinatesToSelection(clientX, clientY);
    }

    function onDragEnd() {
        if (!activeDragHandle) return;
        activeDragHandle = null;
        stopEdgeAutoScroll();
        updateMobileSelectorHandles();
    }

    // Touch events for Start Handle
    startHandle.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            onDragStart('start', e.touches[0].clientX, e.touches[0].clientY, e);
        }
    }, { passive: false });

    // Touch events for End Handle
    endHandle.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            onDragStart('end', e.touches[0].clientX, e.touches[0].clientY, e);
        }
    }, { passive: false });

    // Global touchmove & touchend on window during drag
    window.addEventListener('touchmove', (e) => {
        if (activeDragHandle && e.touches.length > 0) {
            onDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
        }
    }, { passive: false });

    window.addEventListener('touchend', onDragEnd);
    window.addEventListener('touchcancel', onDragEnd);

    // Desktop Mouse Drag Support for testing and desktop trackpads
    startHandle.addEventListener('mousedown', (e) => {
        onDragStart('start', e.clientX, e.clientY, e);
    });

    endHandle.addEventListener('mousedown', (e) => {
        onDragStart('end', e.clientX, e.clientY, e);
    });

    window.addEventListener('mousemove', (e) => {
        if (activeDragHandle) {
            onDragMove(e.clientX, e.clientY, e);
        }
    });

    window.addEventListener('mouseup', onDragEnd);

    // Automatically show selector handles & floating toolbar on text selection
    function handleSelectionAutoShow() {
        if (activeDragHandle) return;
        const c = document.getElementById('mobile-selector-container');
        if (!c) return;

        const richEd = document.getElementById('rich-editor');
        const plainEd = document.getElementById('plain-editor');
        let hasSelection = false;

        if (AppState.isRichTextMode && richEd) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                if (richEd.contains(range.commonAncestorContainer) || richEd.contains(sel.anchorNode)) {
                    const text = sel.toString();
                    if (text && text.trim().length > 0) {
                        hasSelection = true;
                    }
                }
            }
        } else if (plainEd && document.activeElement === plainEd) {
            if (plainEd.selectionStart !== plainEd.selectionEnd) {
                hasSelection = true;
            }
        }

        if (hasSelection) {
            isMobileSelectorActive = true;
            c.style.display = 'block';
            updateMobileSelectorHandles();
        } else if (isMobileSelectorActive && !activeDragHandle) {
            isMobileSelectorActive = false;
            c.style.display = 'none';
        }
    }

    // Synchronize handles on editor scroll and selectionchange
    [richEditor, plainEditor, editorArea].forEach(el => {
        if (el) {
            el.addEventListener('scroll', () => {
                if (isMobileSelectorActive && !activeDragHandle) {
                    updateMobileSelectorHandles();
                }
            }, { passive: true });
            el.addEventListener('mouseup', handleSelectionAutoShow);
            el.addEventListener('touchend', handleSelectionAutoShow);
            el.addEventListener('keyup', handleSelectionAutoShow);
        }
    });

    document.addEventListener('selectionchange', handleSelectionAutoShow);

    // Floating action toolbar clicks
    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sel-action]');
        if (!btn) return;
        const action = btn.dataset.selAction;

        switch (action) {
            case 'word':
                selectCurrentWordAtCaret();
                updateMobileSelectorHandles();
                break;
            case 'line':
                selectCurrentLineAtCaret();
                updateMobileSelectorHandles();
                break;
            case 'all': {
                const ed = getCurrentEditor();
                if (ed) ed.focus();
                if (AppState.isRichTextMode) {
                    document.execCommand('selectAll', false, null);
                } else {
                    document.getElementById('plain-editor')?.select();
                }
                updateMobileSelectorHandles();
                break;
            }
            case 'copy':
                document.execCommand('copy');
                showToast("Copied selection to clipboard");
                break;
            case 'cut':
                document.execCommand('cut');
                updateStats();
                saveCurrentStateToMemory();
                updateMobileSelectorHandles();
                showToast("Cut selection to clipboard");
                break;
            case 'bold':
                if (AppState.isRichTextMode) {
                    document.execCommand('bold');
                    syncToolbar();
                }
                break;
            case 'italic':
                if (AppState.isRichTextMode) {
                    document.execCommand('italic');
                    syncToolbar();
                }
                break;
            case 'done':
                toggleMobileSelector(false);
                break;
        }
    });
}

// Continuous Edge Auto-Scroll using requestAnimationFrame
function startEdgeAutoScroll() {
    if (edgeAutoScrollRaf) return;

    function step() {
        if (!activeDragHandle || edgeAutoScrollSpeed === 0) {
            stopEdgeAutoScroll();
            return;
        }

        const editorArea = document.getElementById('editor-area');
        const activeEd = getCurrentEditor();

        if (editorArea) editorArea.scrollTop += edgeAutoScrollSpeed;
        if (activeEd && activeEd !== editorArea) activeEd.scrollTop += edgeAutoScrollSpeed;

        // As text scrolls underneath the finger, update the selection caret
        applyDragCoordinatesToSelection(lastTouchX, lastTouchY);
        updateMobileSelectorHandles();

        edgeAutoScrollRaf = requestAnimationFrame(step);
    }

    edgeAutoScrollRaf = requestAnimationFrame(step);
}

function stopEdgeAutoScroll() {
    if (edgeAutoScrollRaf) {
        cancelAnimationFrame(edgeAutoScrollRaf);
        edgeAutoScrollRaf = null;
    }
    edgeAutoScrollSpeed = 0;
}

// Adjust selection range dynamically based on drag coordinates
function applyDragCoordinatesToSelection(clientX, clientY) {
    if (AppState.isRichTextMode) {
        const startHandle = document.getElementById('mobile-sel-start');
        const endHandle = document.getElementById('mobile-sel-end');
        const container = document.getElementById('mobile-selector-container');

        // Temporarily disable pointer events on handles so caretRangeFromPoint hits the text inside rich-editor
        if (startHandle) startHandle.style.pointerEvents = 'none';
        if (endHandle) endHandle.style.pointerEvents = 'none';
        if (container) container.style.pointerEvents = 'none';

        let pointRange = null;
        try {
            if (document.caretRangeFromPoint) {
                pointRange = document.caretRangeFromPoint(clientX, clientY);
            } else if (document.caretPositionFromPoint) {
                const pos = document.caretPositionFromPoint(clientX, clientY);
                if (pos) {
                    pointRange = document.createRange();
                    pointRange.setStart(pos.offsetNode, pos.offset);
                    pointRange.collapse(true);
                }
            }
        } finally {
            if (startHandle) startHandle.style.pointerEvents = 'auto';
            if (endHandle) endHandle.style.pointerEvents = 'auto';
        }

        if (!pointRange) return;

        const richEditor = document.getElementById('rich-editor');
        if (!richEditor.contains(pointRange.startContainer)) return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const currentRange = sel.getRangeAt(0);

        try {
            if (activeDragHandle === 'start') {
                // Moving start handle: compare with current end
                const comp = pointRange.compareBoundaryPoints(Range.START_TO_END, currentRange);
                if (comp <= 0) {
                    // Start is before or at current end
                    currentRange.setStart(pointRange.startContainer, pointRange.startOffset);
                } else {
                    // Start went past current end: swap handles
                    currentRange.setStart(currentRange.endContainer, currentRange.endOffset);
                    currentRange.setEnd(pointRange.startContainer, pointRange.startOffset);
                    activeDragHandle = 'end';
                }
            } else if (activeDragHandle === 'end') {
                // Moving end handle: compare with current start
                const comp = pointRange.compareBoundaryPoints(Range.START_TO_START, currentRange);
                if (comp >= 0) {
                    // End is after or at current start
                    currentRange.setEnd(pointRange.startContainer, pointRange.startOffset);
                } else {
                    // End went before current start: swap handles
                    currentRange.setEnd(currentRange.startContainer, currentRange.startOffset);
                    currentRange.setStart(pointRange.startContainer, pointRange.startOffset);
                    activeDragHandle = 'start';
                }
            }

            sel.removeAllRanges();
            sel.addRange(currentRange);
        } catch (e) {}

    } else {
        // Plain text editor (textarea) selection adjustments
        const ed = document.getElementById('plain-editor');
        if (!ed) return;
        // In textarea, approximate position or select based on relative position
        const textLen = ed.value.length;
        if (textLen === 0) return;

        const edRect = ed.getBoundingClientRect();
        const relY = Math.max(0, Math.min(edRect.height, clientY - edRect.top));
        const relX = Math.max(0, Math.min(edRect.width, clientX - edRect.left));

        const charRatio = Math.max(0, Math.min(1, (relY / edRect.height) * 0.9 + (relX / edRect.width) * 0.1));
        const targetIndex = Math.round(charRatio * textLen);

        if (activeDragHandle === 'start') {
            ed.selectionStart = Math.min(targetIndex, ed.selectionEnd);
        } else if (activeDragHandle === 'end') {
            ed.selectionEnd = Math.max(targetIndex, ed.selectionStart);
        }
    }

    updateMobileSelectorHandles();
}

// Visual Positioning of Handles & Floating Action Toolbar
function updateMobileSelectorHandles() {
    if (!isMobileSelectorActive) return;

    const startHandle = document.getElementById('mobile-sel-start');
    const endHandle = document.getElementById('mobile-sel-end');
    const toolbar = document.getElementById('mobile-sel-toolbar');
    const editorArea = document.getElementById('editor-area');
    const richEditor = document.getElementById('rich-editor');

    if (!startHandle || !endHandle || !toolbar || !editorArea) return;

    const areaRect = editorArea.getBoundingClientRect();

    if (AppState.isRichTextMode) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            startHandle.style.display = 'none';
            endHandle.style.display = 'none';
            toolbar.style.display = 'none';
            return;
        }

        const range = sel.getRangeAt(0);
        if (!richEditor || !richEditor.contains(range.commonAncestorContainer)) {
            startHandle.style.display = 'none';
            endHandle.style.display = 'none';
            toolbar.style.display = 'none';
            return;
        }

        let startX, startY, endX, endY;

        if (range.collapsed) {
            // Precise caret coordinates via temporary zero-width character span
            let r = null;
            const rects = range.getClientRects();
            if (rects.length > 0 && (rects[0].width > 0 || rects[0].height > 0)) {
                r = rects[0];
            } else {
                const span = document.createElement('span');
                span.appendChild(document.createTextNode('\u200b'));
                const tempRange = range.cloneRange();
                tempRange.insertNode(span);
                r = span.getBoundingClientRect();
                if (span.parentNode) span.parentNode.removeChild(span);
            }

            if (r && (r.left > 0 || r.top > 0)) {
                startX = r.left;
                startY = r.top;
                endX = r.right || (r.left + 2);
                endY = r.bottom || (r.top + 20);
            } else {
                const node = range.startContainer;
                const elem = (node && node.nodeType === Node.ELEMENT_NODE) ? node : (node ? node.parentElement : null);
                if (elem && elem !== richEditor && richEditor.contains(elem)) {
                    const eRect = elem.getBoundingClientRect();
                    startX = eRect.left;
                    startY = eRect.top;
                    endX = eRect.right;
                    endY = eRect.bottom;
                } else {
                    const edRect = richEditor.getBoundingClientRect();
                    startX = edRect.left + 48;
                    startY = edRect.top + 48;
                    endX = startX + 2;
                    endY = startY + 20;
                }
            }
        } else {
            const rects = range.getClientRects();
            if (rects.length > 0) {
                const firstRect = rects[0];
                const lastRect = rects[rects.length - 1];
                startX = firstRect.left;
                startY = firstRect.top;
                endX = lastRect.right;
                endY = lastRect.bottom;
            } else {
                const bounding = range.getBoundingClientRect();
                startX = bounding.left;
                startY = bounding.top;
                endX = bounding.right;
                endY = bounding.bottom;
            }
        }

        positionHandles(startX, startY, endX, endY, areaRect, startHandle, endHandle, toolbar);

    } else {
        // Plain text textarea handles based on selectionStart / selectionEnd
        const ed = document.getElementById('plain-editor');
        if (!ed) return;

        const edRect = ed.getBoundingClientRect();
        const textBefore = ed.value.substring(0, ed.selectionStart);
        const lines = textBefore.split('\n');
        const lineIdx = lines.length - 1;
        const colIdx = lines[lineIdx].length;

        const style = window.getComputedStyle(ed);
        const lineHeight = parseFloat(style.lineHeight) || 22;
        const charWidth = 8.5;
        const padTop = parseFloat(style.paddingTop) || 20;
        const padLeft = parseFloat(style.paddingLeft) || 20;

        const startX = edRect.left + padLeft + (colIdx * charWidth) - ed.scrollLeft;
        const startY = edRect.top + padTop + (lineIdx * lineHeight) - ed.scrollTop;

        let endX = startX + 2;
        let endY = startY + lineHeight;

        if (ed.selectionEnd > ed.selectionStart) {
            const selectedText = ed.value.substring(ed.selectionStart, ed.selectionEnd);
            const selLines = selectedText.split('\n');
            const endLineIdx = lineIdx + selLines.length - 1;
            const endColIdx = (selLines.length === 1 ? colIdx : 0) + selLines[selLines.length - 1].length;
            endX = edRect.left + padLeft + (endColIdx * charWidth) - ed.scrollLeft;
            endY = edRect.top + padTop + (endLineIdx * lineHeight) - ed.scrollTop;
        }

        positionHandles(startX, startY, endX, endY, areaRect, startHandle, endHandle, toolbar);
    }
}

function positionHandles(startX, startY, endX, endY, areaRect, startHandle, endHandle, toolbar) {
    const editorArea = document.getElementById('editor-area');
    const scrollLeft = editorArea ? editorArea.scrollLeft : 0;
    const scrollTop = editorArea ? editorArea.scrollTop : 0;

    startHandle.style.display = 'flex';
    endHandle.style.display = 'flex';
    toolbar.style.display = 'flex';

    // Position Start Handle: handle-line touches start point (startX, startY)
    const relStartX = (startX - areaRect.left) + scrollLeft - 16;
    const relStartY = (startY - areaRect.top) + scrollTop;
    startHandle.style.left = `${Math.max(4, relStartX)}px`;
    startHandle.style.top = `${Math.max(4, relStartY)}px`;

    // Position End Handle: handle-line touches end point (endX, endY)
    const relEndX = (endX - areaRect.left) + scrollLeft - 16;
    const relEndY = (endY - areaRect.top) + scrollTop - 20;
    endHandle.style.left = `${Math.max(4, relEndX)}px`;
    endHandle.style.top = `${Math.max(4, relEndY)}px`;

    // Position Floating Action Toolbar centered horizontally above selection
    const tbWidth = toolbar.offsetWidth || 260;
    const centerX = ((startX + endX) / 2 - areaRect.left) + scrollLeft - (tbWidth / 2);
    let toolbarY = (startY - areaRect.top) + scrollTop - 48;

    if (toolbarY < 10) {
        toolbarY = (endY - areaRect.top) + scrollTop + 28;
    }

    toolbar.style.left = `${Math.max(8, centerX)}px`;
    toolbar.style.top = `${Math.max(8, toolbarY)}px`;
}

// Helper: Select Word under caret
function selectCurrentWordAtCaret() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        let start = range.startOffset;
        let end = range.startOffset;

        while (start > 0 && !/\s/.test(text[start - 1])) start--;
        while (end < text.length && !/\s/.test(text[end])) end++;

        if (start < end) {
            range.setStart(node, start);
            range.setEnd(node, end);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
}

// Helper: Select Line / Paragraph under caret
function selectCurrentLineAtCaret() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let parentBlock = range.startContainer;

    while (parentBlock && parentBlock !== document.getElementById('rich-editor')) {
        const tag = parentBlock.nodeName.toUpperCase();
        if (['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE'].includes(tag)) {
            range.selectNodeContents(parentBlock);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }
        parentBlock = parentBlock.parentNode;
    }
}

function selectCurrentWordInPlainEditor() {
    const ed = document.getElementById('plain-editor');
    if (!ed) return;
    const val = ed.value;
    let s = ed.selectionStart;
    let e = ed.selectionEnd;

    while (s > 0 && !/\s/.test(val[s - 1])) s--;
    while (e < val.length && !/\s/.test(val[e])) e++;

    if (s < e) {
        ed.setSelectionRange(s, e);
    }
}

// ==========================================================================
// Productivity Suite Features (Word, Excel, PowerPoint, Paint, Notepad)
// ==========================================================================

// 1. MS Word Callout Note Box
function insertCalloutBox() {
    if (!AppState.isRichTextMode) {
        showToast("Switch to Rich Text mode to insert Callout Notes");
        return;
    }
    const html = `<div class="doc-callout">💡 <strong>Note:</strong> Enter important details here...</div><p><br></p>`;
    formatDoc('insertHTML', html);
    showToast("Callout note inserted");
}

// 2. MS Word Real Page Break
function insertPageBreak() {
    if (!AppState.isRichTextMode) {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const start = ed.selectionStart;
            ed.value = ed.value.substring(0, start) + "\n\n=== [Page Break] ===\n\n" + ed.value.substring(ed.selectionEnd);
            ed.selectionStart = ed.selectionEnd = start + 25;
            pushHistory(ed.value);
            updateStats();
            saveCurrentStateToMemory();
            showToast("Page break inserted");
        }
        return;
    }
    pushRichSnapshot();
    const id = 'pb-' + Date.now();
    const html = `
    <div class="doc-page-break" id="${id}" contenteditable="false">
        <div class="page-break-divider">
            <div class="page-break-badge-wrap">
                <span class="page-break-badge">📄 Page Break</span>
                <span class="page-break-hint">Next Page Below</span>
                <button class="page-break-del-btn" title="Remove page break" onclick="removePageBreak('${id}')">✕</button>
            </div>
        </div>
        <div class="page-break-gap"></div>
    </div><p><br></p>`;
    formatDoc('insertHTML', html);
    initPageBreakHandlers();
    pushRichSnapshot();
    saveCurrentStateToMemory();
    showToast("Page break inserted (Page separated)");
}

function removePageBreak(id) {
    const el = document.getElementById(id);
    if (el) {
        pushRichSnapshot();
        el.remove();
        pushRichSnapshot();
        updateStats();
        saveCurrentStateToMemory();
        showToast("Page break removed");
    }
}

function initPageBreakHandlers() {
    const editor = document.getElementById('rich-editor');
    if (!editor) return;
    editor.querySelectorAll('.page-break-del-btn').forEach(btn => {
        if (btn.dataset.handlerAttached) return;
        btn.dataset.handlerAttached = 'true';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wrapper = btn.closest('.doc-page-break');
            if (wrapper) {
                pushRichSnapshot();
                wrapper.remove();
                pushRichSnapshot();
                updateStats();
                saveCurrentStateToMemory();
                showToast("Page break removed");
            }
        });
    });
}

// --- Enhanced Math Expression Evaluator & Calculator Tool ---

// --- Advanced Equation Solver & Mathematical Engine ---
function solveAlgebraicEquation(inputStr) {
    if (!inputStr || typeof inputStr !== 'string' || !inputStr.includes('=')) return null;
    let clean = inputStr.trim();
    // Normalize brackets and math symbols
    clean = clean.replace(/[\[\{]/g, '(').replace(/[\]\}]/g, ')');
    clean = clean.replace(/π/gi, 'pi');
    clean = clean.replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)');
    clean = clean.replace(/√\s*(\d+(\.\d+)?)/g, 'sqrt($1)');
    // Normalize implicit multiplication 2x -> 2 * x, 4(x) -> 4 * (x)
    clean = clean.replace(/(\d)\s*([a-zA-Z])(?![a-zA-Z])/g, '$1 * $2');
    clean = clean.replace(/\b(\d+)\s*\(/g, '$1 * (');
    clean = clean.replace(/\)\s*([a-zA-Z])/g, ') * $1');
    
    // Find candidate variable (single letter, not part of function names)
    const matches = clean.match(/(?<![a-zA-Z])([a-zA-Z])(?![a-zA-Z])/g);
    if (!matches) return null;
    
    let variable = null;
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (['x', 'y', 'z', 'n', 't', 'a', 'b', 'c'].includes(lower)) {
            variable = lower;
            break;
        }
    }
    if (!variable) {
        for (const m of matches) {
            const lower = m.toLowerCase();
            if (lower !== 'e') {
                variable = lower;
                break;
            }
        }
    }
    if (!variable) return null;

    const parts = clean.split('=');
    if (parts.length !== 2) return null;
    let left = parts[0].trim();
    let right = parts[1].trim();
    if (!left || !right) return null;

    function f(xVal) {
        function subVar(side) {
            let s = side.replace(/(\d)\s*([a-zA-Z])(?![a-zA-Z])/g, '$1 * $2');
            s = s.replace(/(\d)\s*\(/g, '$1 * (');
            s = s.replace(/\)\s*\(/g, ') * (');
            s = s.replace(/\)\s*(\d)/g, ') * $1');
            s = s.replace(/\)\s*([a-zA-Z])/g, ') * $1');
            s = s.replace(new RegExp(`\\b${variable}\\b`, 'gi'), `(${xVal})`);
            s = s.replace(/\^/g, '**').replace(/[×✕]/g, '*').replace(/[÷]/g, '/').replace(/[−–—]/g, '-');
            s = s.replace(/[\[\{]/g, '(').replace(/[\]\}]/g, ')');
            s = s.replace(/√\s*\(([^)]+)\)/g, 'Math.sqrt($1)');
            s = s.replace(/√\s*(\d+(\.\d+)?)/g, 'Math.sqrt($1)');
            s = s.replace(/\bsqrt\b/gi, 'Math.sqrt');
            s = s.replace(/\bcbrt\b/gi, 'Math.cbrt');
            s = s.replace(/\babs\b/gi, 'Math.abs');
            s = s.replace(/\blog\b/gi, 'Math.log10');
            s = s.replace(/\bln\b/gi, 'Math.log');
            s = s.replace(/\bexp\b/gi, 'Math.exp');
            s = s.replace(/\bpi\b/gi, 'Math.PI');
            s = s.replace(/\be\b/gi, 'Math.E');
            return Function(`'use strict'; return (${s});`)();
        }
        try {
            return subVar(left) - subVar(right);
        } catch (e) {
            return NaN;
        }
    }

    const y0 = f(0);
    const y1 = f(1);
    const y2 = f(2);

    if (isNaN(y0) || isNaN(y1) || isNaN(y2)) return null;

    // Check if linear: (y2 - y1) === (y1 - y0)
    const d1 = y1 - y0;
    const d2 = y2 - y1;
    if (Math.abs(d2 - d1) < 1e-8) {
        const A = d1;
        const B = y0;
        if (Math.abs(A) < 1e-12) {
            if (Math.abs(B) < 1e-12) return { type: 'identity', display: 'Infinite solutions' };
            return { type: 'inconsistent', display: 'No solution' };
        }
        const sol = parseFloat((-B / A).toFixed(8));
        return { type: 'linear', variable, solution: sol, display: `${variable} = ${sol}` };
    }

    // Check if quadratic: f(x) = A*x^2 + B*x + C
    const ym1 = f(-1);
    const C = y0;
    const A = (y1 + ym1 - 2 * C) / 2;
    const B = (y1 - ym1) / 2;

    const test2 = A * 4 + B * 2 + C;
    if (Math.abs(f(2) - test2) < 1e-6) {
        const D = B * B - 4 * A * C;
        if (D < 0) {
            return { type: 'quadratic', variable, display: `No real solutions (D < 0)` };
        }
        if (Math.abs(D) < 1e-12) {
            const sol = parseFloat((-B / (2 * A)).toFixed(8));
            return { type: 'quadratic', variable, solution: sol, display: `${variable} = ${sol}` };
        }
        const s1 = parseFloat(((-B + Math.sqrt(D)) / (2 * A)).toFixed(8));
        const s2 = parseFloat(((-B - Math.sqrt(D)) / (2 * A)).toFixed(8));
        const minS = Math.min(s1, s2);
        const maxS = Math.max(s1, s2);
        if (minS === -maxS) {
            return { type: 'quadratic', variable, solutions: [s1, s2], display: `${variable} = ±${maxS}` };
        }
        return { type: 'quadratic', variable, solutions: [s1, s2], display: `${variable} = ${minS}, ${maxS}` };
    }

    return null;
}

// Current angle mode for trigonometry ('deg' or 'rad')
let currentAngleMode = 'deg';

function evaluateAdvancedMath(rawExpr, angleMode = currentAngleMode) {
    if (!rawExpr || typeof rawExpr !== 'string') return null;
    let expr = rawExpr.trim();
    expr = expr.replace(/=+\s*$/, '').trim();
    if (!expr) return null;

    // 1. Normalize Unicode symbols & bracket variants from keyboard ([ ] and { })
    expr = expr.replace(/[×✕]/g, '*').replace(/[÷]/g, '/').replace(/[−–—]/g, '-');
    expr = expr.replace(/[\[\{]/g, '(').replace(/[\]\}]/g, ')');
    expr = expr.replace(/π/gi, 'pi');
    expr = expr.replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)');
    expr = expr.replace(/√\s*(\d+(\.\d+)?)/g, 'sqrt($1)');
    expr = expr.replace(/∛\s*(\d+(\.\d+)?)/g, 'cbrt($1)');
    expr = expr.replace(/(\d+(\.\d+)?)\s*%\s*(?:of\s*)?(\d+(\.\d+)?)/gi, '($1 / 100 * $3)');
    expr = expr.replace(/(\d+(\.\d+)?)\s*%/g, '($1 / 100)');
    expr = expr.replace(/\bof\b/gi, '*');

    // 2. Normalize standalone function calls without parentheses: sqrt 16 -> sqrt(16), log 100 -> log(100), ln 10 -> ln(10), exp 2 -> exp(2)
    expr = expr.replace(/\bsqrt\s+([0-9.]+)/gi, 'sqrt($1)');
    expr = expr.replace(/\blog\s+([0-9.]+)/gi, 'log($1)');
    expr = expr.replace(/\bln\s+([0-9.]+)/gi, 'ln($1)');
    expr = expr.replace(/\bexp\s+([0-9.]+)/gi, 'exp($1)');

    // 3. Exponents & powers: e^x, 2^3, (x+y)^2
    expr = expr.replace(/\be\s*\^\s*\(([^)]+)\)/gi, 'exp($1)');
    expr = expr.replace(/\be\s*\^\s*([0-9.]+)/gi, 'exp($1)');
    expr = expr.replace(/\^/g, '**');

    // 4. Factorials: 5! -> fact(5), (3+2)! -> fact(3+2)
    expr = expr.replace(/\(([^)]+)\)\s*!/g, 'fact($1)');
    expr = expr.replace(/(\d+)\s*!/g, 'fact($1)');

    // 5. Degrees literal: e.g. 30 deg or 30° -> (30 * pi / 180)
    expr = expr.replace(/(\d+(?:\.\d+)?)\s*(?:deg|°)/gi, '($1 * pi / 180)');

    // 6. Implicit multiplication
    expr = expr.replace(/(\d)\s*\(/g, '$1 * (');
    expr = expr.replace(/\)\s*\(/g, ') * (');
    expr = expr.replace(/\)\s*(\d)/g, ') * $1');
    expr = expr.replace(/(\d)\s*([a-zA-Z])/g, '$1 * $2');
    expr = expr.replace(/\)\s*([a-zA-Z])/g, ') * $1');

    const isDeg = angleMode === 'deg';
    const mathContext = {
        sin: (x) => isDeg ? Math.sin(x * Math.PI / 180) : Math.sin(x),
        cos: (x) => isDeg ? Math.cos(x * Math.PI / 180) : Math.cos(x),
        tan: (x) => isDeg ? Math.tan(x * Math.PI / 180) : Math.tan(x),
        asin: (x) => isDeg ? (Math.asin(x) * 180 / Math.PI) : Math.asin(x),
        acos: (x) => isDeg ? (Math.acos(x) * 180 / Math.PI) : Math.acos(x),
        atan: (x) => isDeg ? (Math.atan(x) * 180 / Math.PI) : Math.atan(x),
        sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
        sqrt: Math.sqrt, cbrt: Math.cbrt,
        log: Math.log10,
        log10: Math.log10,
        ln: Math.log,
        log2: Math.log2,
        exp: Math.exp,
        abs: Math.abs,
        round: Math.round, floor: Math.floor, ceil: Math.ceil,
        pow: Math.pow,
        pi: Math.PI, PI: Math.PI,
        e: Math.E, E: Math.E,
        fact: (n) => {
            if (n < 0 || Math.floor(n) !== n) return NaN;
            let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
        }
    };

    if (/[^0-9a-zA-Z\s+\-*/().,_%]/.test(expr)) {
        return null;
    }

    try {
        const keys = Object.keys(mathContext);
        const vals = Object.values(mathContext);
        const fn = new Function(...keys, `'use strict'; return (${expr});`);
        const val = fn(...vals);
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            if (Math.abs(val) < 1e-12) return 0;
            return parseFloat(val.toFixed(10));
        }
    } catch (e) {
        return null;
    }
    return null;
}

// Backward-compatible alias
function evaluateMathExpression(rawExpr) {
    return evaluateAdvancedMath(rawExpr, currentAngleMode);
}

// 3. Calculator & Equation Solver Tool
function calculateSelection() {
    let text = "";
    if (AppState.isRichTextMode) {
        restoreEditorSelection(true);
        const sel = window.getSelection();
        text = sel ? sel.toString().trim() : "";
    } else {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const start = ed.selectionStart;
            const end = ed.selectionEnd;
            text = ed.value.substring(start, end).trim();
        }
    }

    // If text was selected, solve it and show in equation bar
    if (text) {
        const eqResult = solveAlgebraicEquation(text);
        if (eqResult !== null) {
            showToast(`Equation Solved: ${eqResult.display}`);
            toggleEquationBar(true, text, eqResult.display);
            return;
        }

        const mathResult = evaluateMathExpression(text);
        if (mathResult !== null) {
            const formattedResult = mathResult.toLocaleString('en-US', { maximumFractionDigits: 10 });
            showToast(`Result: ${formattedResult}`);
            toggleEquationBar(true, text, formattedResult);
            return;
        }

        const hasOperators = /[+\-*/^%]/.test(text.replace(/^-?\d/, ''));
        const numbers = text.match(/-?\d+(?:\.\d+)?/g);
        if (!hasOperators && numbers && numbers.length > 1) {
            const nums = numbers.map(Number);
            const sum = nums.reduce((a, b) => a + b, 0);
            const roundedSum = parseFloat(sum.toFixed(10));
            showToast(`∑ Sum: ${roundedSum}`);
            toggleEquationBar(true, text, `Sum: ${roundedSum}`);
            return;
        }
    }

    // Open Interactive Equation Solver Container Bar without corrupting document
    toggleEquationBar(true, text || "");
}

// Interactive Equation Solver Bar Controller
function toggleEquationBar(forceShow, initialText, initialResult) {
    const bar = document.getElementById('equation-bar');
    if (!bar) return;
    const isVisible = bar.style.display !== 'none';
    const shouldShow = forceShow !== undefined ? forceShow : !isVisible;

    if (shouldShow) {
        bar.style.display = 'flex';
        const input = document.getElementById('equation-input');
        const badge = document.getElementById('equation-result-value');
        if (input) {
            if (initialText !== undefined) {
                input.value = initialText;
            }
            input.focus();
        }
        if (badge && initialResult !== undefined) {
            badge.textContent = initialResult;
        } else if (input && input.value) {
            solveEquationBarInput();
        }
    } else {
        bar.style.display = 'none';
    }
}

function solveEquationBarInput() {
    const input = document.getElementById('equation-input');
    const badge = document.getElementById('equation-result-value');
    if (!input || !badge) return;
    const text = input.value.trim();
    if (!text) {
        badge.textContent = "Ready";
        return;
    }

    // 1. Try algebraic equation
    const eqRes = solveAlgebraicEquation(text);
    if (eqRes !== null) {
        badge.textContent = eqRes.display;
        return;
    }

    // 2. Try advanced math expression
    const mathRes = evaluateAdvancedMath(text, currentAngleMode);
    if (mathRes !== null) {
        badge.textContent = mathRes.toLocaleString('en-US', { maximumFractionDigits: 10 });
        return;
    }

    badge.textContent = "Invalid equation / expression";
}

function initEquationBarEvents() {
    const bar = document.getElementById('equation-bar');
    if (!bar) return;

    // Angle mode buttons (DEG / RAD)
    const degBtn = document.getElementById('eq-mode-deg');
    const radBtn = document.getElementById('eq-mode-rad');
    if (degBtn && radBtn) {
        degBtn.addEventListener('click', () => {
            currentAngleMode = 'deg';
            degBtn.classList.add('active');
            radBtn.classList.remove('active');
            solveEquationBarInput();
        });
        radBtn.addEventListener('click', () => {
            currentAngleMode = 'rad';
            radBtn.classList.add('active');
            degBtn.classList.remove('active');
            solveEquationBarInput();
        });
    }

    // Close button
    document.getElementById('eq-close-btn')?.addEventListener('click', () => {
        toggleEquationBar(false);
    });

    // Solve button & input events
    const solveBtn = document.getElementById('eq-solve-btn');
    const input = document.getElementById('equation-input');
    if (solveBtn) {
        solveBtn.addEventListener('click', () => solveEquationBarInput());
    }
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                solveEquationBarInput();
            }
        });
        input.addEventListener('input', () => {
            if (input.value.trim().length >= 2) {
                solveEquationBarInput();
            }
        });
    }

    // Insert into document button
    document.getElementById('eq-insert-btn')?.addEventListener('click', () => {
        const expr = input ? input.value.trim() : "";
        const badge = document.getElementById('equation-result-value');
        const res = badge ? badge.textContent.trim() : "";

        if (!expr || !res || res === "Ready" || res === "Invalid equation / expression") {
            showToast("Enter a valid equation or expression first");
            return;
        }

        let output = "";
        if (res.includes('=')) {
            // e.g. expr: 2x + 5 = 15, res: x = 5
            output = ` ${expr} => ${res} `;
        } else {
            output = ` ${expr} = ${res} `;
        }

        if (AppState.isRichTextMode) {
            restoreEditorSelection(true);
            formatDoc('insertText', output);
        } else {
            const ed = document.getElementById('plain-editor');
            if (ed) {
                const end = ed.selectionEnd;
                ed.value = ed.value.substring(0, end) + output + ed.value.substring(end);
                ed.selectionStart = ed.selectionEnd = end + output.length;
                pushHistory(ed.value);
                updateStats();
                saveCurrentStateToMemory();
            }
        }
        showToast("Inserted equation solution into document");
    });

    // Quick insertion buttons
    document.querySelectorAll('.eq-q-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sym = btn.getAttribute('data-insert');
            if (!sym || !input) return;
            const start = input.selectionStart || input.value.length;
            const end = input.selectionEnd || input.value.length;
            input.value = input.value.substring(0, start) + sym + input.value.substring(end);
            input.selectionStart = input.selectionEnd = start + sym.length;
            input.focus();
            solveEquationBarInput();
        });
    });
}

// 4. Excel Sort Lines Tool with Multiple Sort Modes
function sortSelectedLines(sortType = 'asc') {
    let isFullDoc = false;
    let text = "";

    if (AppState.isRichTextMode) {
        restoreEditorSelection(true);
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim()) {
            text = sel.toString();
        } else {
            text = document.getElementById('rich-editor').innerText;
            isFullDoc = true;
        }
    } else {
        const ed = document.getElementById('plain-editor');
        const s = ed.selectionStart;
        const e = ed.selectionEnd;
        if (s !== e && ed.value.substring(s, e).trim()) {
            text = ed.value.substring(s, e);
        } else {
            text = ed.value;
            isFullDoc = true;
        }
    }

    if (!text.trim()) {
        showToast("No lines to sort");
        return;
    }

    const lines = text.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length <= 1) {
        showToast("Select multiple lines to sort");
        return;
    }

    let sortLabel = "A → Z";
    switch (sortType) {
        case 'asc':
            lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            sortLabel = "A → Z";
            break;
        case 'desc':
            lines.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
            sortLabel = "Z → A";
            break;
        case 'num':
            lines.sort((a, b) => {
                const numA = parseFloat((a.match(/-?\d+(?:\.\d+)?/) || [0])[0]);
                const numB = parseFloat((b.match(/-?\d+(?:\.\d+)?/) || [0])[0]);
                return numA - numB;
            });
            sortLabel = "Numerical (0 → 9)";
            break;
        case 'len-asc':
            lines.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
            sortLabel = "Shortest to Longest";
            break;
        case 'len-desc':
            lines.sort((a, b) => (b.length - a.length) || a.localeCompare(b));
            sortLabel = "Longest to Shortest";
            break;
        case 'reverse':
            lines.reverse();
            sortLabel = "Reversed Order";
            break;
        default:
            lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            sortLabel = "A → Z";
            break;
    }

    const sortedText = lines.join('\n');
    if (AppState.isRichTextMode) {
        if (isFullDoc) {
            document.getElementById('rich-editor').innerText = sortedText;
        } else {
            document.execCommand('insertText', false, sortedText);
        }
        saveCurrentStateToMemory();
    } else {
        const ed = document.getElementById('plain-editor');
        if (isFullDoc) {
            ed.value = sortedText;
        } else {
            const s = ed.selectionStart;
            const e = ed.selectionEnd;
            ed.value = ed.value.substring(0, s) + sortedText + ed.value.substring(e);
            ed.selectionStart = s;
            ed.selectionEnd = s + sortedText.length;
        }
        pushHistory(ed.value);
        saveCurrentStateToMemory();
        updateStats();
    }

    showToast(`Sorted lines (${sortLabel})`);
}

// 5. Interactive MS Excel Spreadsheet Table System
let parsedExcelData = null;

function insertExcelTable() {
    if (!AppState.isRichTextMode) {
        showToast("Switch to Rich Text mode for interactive Excel Spreadsheets");
        return;
    }
    saveEditorSelection();
    openModal('excel-modal');
}

function parseDelimitedTextToRows(text, forcedDelim = 'auto') {
    if (!text || !text.trim()) return [];
    const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (rawLines.length === 0) return [];

    let delim = ',';
    if (forcedDelim && forcedDelim !== 'auto') {
        delim = forcedDelim === 'tab' ? '\t' : forcedDelim;
    } else {
        const firstLine = rawLines[0];
        if (firstLine.includes('\t')) delim = '\t';
        else if (firstLine.includes(';') && !firstLine.includes(',')) delim = ';';
        else if (firstLine.includes('|') && !firstLine.includes(',')) delim = '|';
    }

    const parseLine = (line) => {
        if (delim === '\t') {
            return line.split('\t').map(s => s.trim().replace(/^"|"$/g, ''));
        }
        const regex = new RegExp(`(?:^|${delim})(?:"([^"]*(?:""[^"]*)*)"|([^"${delim}]*))`, 'g');
        const fields = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
            fields.push(val ? val.trim() : '');
        }
        return fields.length > 0 ? fields : line.split(delim).map(s => s.trim());
    };

    return rawLines.map(parseLine);
}

function insertCustomSpreadsheet(rowsData, theme = 'excel-table') {
    if (!rowsData || rowsData.length === 0) return;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    richEditor.focus();
    restoreEditorSelection(false);
    pushRichSnapshot();

    const maxCols = Math.max(...rowsData.map(r => r.length));
    let tableHtml = `<table class="${theme}" style="border-collapse:collapse; width:100%; margin:12px 0;">`;

    rowsData.forEach((row, rIdx) => {
        if (rIdx === 0) {
            tableHtml += `<thead><tr>`;
            for (let c = 0; c < maxCols; c++) {
                const val = (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') ? escapeHtml(String(row[c])) : `Col ${c + 1}`;
                tableHtml += `<th>${val}</th>`;
            }
            tableHtml += `</tr></thead><tbody>`;
        } else {
            tableHtml += `<tr>`;
            for (let c = 0; c < maxCols; c++) {
                const val = (row[c] !== undefined && row[c] !== null) ? escapeHtml(String(row[c])) : '';
                tableHtml += `<td>${val}</td>`;
            }
            tableHtml += `</tr>`;
        }
    });

    tableHtml += `</tbody></table><p><br></p>`;
    formatDoc('insertHTML', tableHtml);
    initTableInteractions();
    pushRichSnapshot();
    saveCurrentStateToMemory();
    updateStats();
    showToast("Spreadsheet inserted");
}

function initExcelModalEvents() {
    let activeTab = 'upload';
    const tabBtns = document.querySelectorAll('[data-excel-tab]');
    const tabPanes = {
        upload: document.getElementById('excel-tab-upload'),
        paste: document.getElementById('excel-tab-paste'),
        custom: document.getElementById('excel-tab-custom')
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.excelTab;
            Object.keys(tabPanes).forEach(k => {
                if (tabPanes[k]) tabPanes[k].style.display = (k === activeTab ? 'block' : 'none');
            });
        });
    });

    const fileUpload = document.getElementById('excel-file-upload');
    const fileInfo = document.getElementById('excel-file-info');

    if (fileUpload) {
        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const fname = file.name.toLowerCase();
            if (fileInfo) {
                fileInfo.style.display = 'block';
                fileInfo.innerHTML = `<strong>Selected:</strong> ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)`;
            }

            if (fname.endsWith('.xlsx') || fname.endsWith('.xls')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        if (typeof XLSX !== 'undefined') {
                            const data = new Uint8Array(ev.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            parsedExcelData = rows;
                            if (fileInfo) {
                                fileInfo.innerHTML += `<br><span style="color:#10b981;">✓ Sheet loaded: <strong>${escapeHtml(firstSheetName)}</strong> (${rows.length} rows)</span>`;
                            }
                        } else {
                            showToast("Excel reader initialized, reading data...");
                        }
                    } catch (err) {
                        console.error("XLSX parsing error:", err);
                        showToast("Could not parse Excel file");
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const text = ev.target.result;
                    parsedExcelData = parseDelimitedTextToRows(text);
                    if (fileInfo) {
                        fileInfo.innerHTML += `<br><span style="color:#10b981;">✓ Loaded ${parsedExcelData.length} rows</span>`;
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    const confirmBtn = document.getElementById('btn-insert-excel-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const theme = document.getElementById('excel-theme-select')?.value || 'excel-table';
            let rowsData = [];

            if (activeTab === 'upload') {
                if (parsedExcelData && parsedExcelData.length > 0) {
                    rowsData = parsedExcelData;
                } else {
                    showToast("Please upload an Excel or CSV file first");
                    return;
                }
            } else if (activeTab === 'paste') {
                const text = document.getElementById('excel-paste-input')?.value.trim();
                if (!text) {
                    showToast("Please paste your spreadsheet data");
                    return;
                }
                rowsData = parseDelimitedTextToRows(text);
            } else if (activeTab === 'custom') {
                const cols = Math.min(20, Math.max(1, parseInt(document.getElementById('excel-cols-count')?.value) || 4));
                const rows = Math.min(50, Math.max(1, parseInt(document.getElementById('excel-rows-count')?.value) || 4));
                const headerRow = [];
                for (let c = 0; c < cols; c++) {
                    headerRow.push(String.fromCharCode(65 + c));
                }
                rowsData.push(headerRow);
                for (let r = 1; r <= rows; r++) {
                    const row = [];
                    for (let c = 0; c < cols; c++) {
                        row.push('');
                    }
                    rowsData.push(row);
                }
            }

            if (rowsData.length === 0) {
                showToast("No data to insert");
                return;
            }

            insertCustomSpreadsheet(rowsData, theme);
            closeModal('excel-modal');
        });
    }
}

// 6. CSV ⇄ Table Conversion (MS Word & Excel)
function convertCsvToTable() {
    if (!AppState.isRichTextMode) {
        showToast("CSV Table conversion available in Rich Text mode");
        return;
    }

    const richEditor = document.getElementById('rich-editor');
    richEditor.focus();
    restoreEditorSelection(false);

    const sel = window.getSelection();
    let text = sel ? sel.toString().trim() : "";

    // 1. If cursor is inside an existing table -> convert table back to CSV text
    if (sel && sel.anchorNode) {
        let node = sel.anchorNode;
        while (node && node !== richEditor) {
            if (node.tagName === 'TABLE') {
                pushRichSnapshot();
                const rows = Array.from(node.querySelectorAll('tr'));
                const csvLines = rows.map(r => {
                    const cells = Array.from(r.querySelectorAll('th, td'));
                    return cells.map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`).join(',');
                });
                const csvText = csvLines.join('\n');
                const p = document.createElement('pre');
                p.style.background = 'var(--hover-color)';
                p.style.padding = '10px 14px';
                p.style.borderRadius = '6px';
                p.style.border = '1px solid var(--border-color)';
                p.style.fontFamily = 'monospace';
                p.textContent = csvText;
                node.parentNode.replaceChild(p, node);
                hideTableToolbar();
                pushRichSnapshot();
                saveCurrentStateToMemory();
                showToast("Table converted to CSV text");
                return;
            }
            node = node.parentNode;
        }
    }

    // 2. If user highlighted text in editor that has commas/tabs/lines -> convert selection to table directly
    if (text && (text.includes('\n') || text.includes(',') || text.includes('\t'))) {
        const rows = parseDelimitedTextToRows(text);
        if (rows.length > 0) {
            insertCustomSpreadsheet(rows, 'excel-table');
            showToast("Selected text converted to Table");
            return;
        }
    }

    // 3. Otherwise, open CSV modal so user can paste their CSV or upload CSV file
    saveEditorSelection();
    openModal('csv-modal');
}

function initCsvModalEvents() {
    const filePicker = document.getElementById('csv-file-picker');
    const textInput = document.getElementById('csv-text-input');
    const delimSelect = document.getElementById('csv-delim-select');
    const confirmBtn = document.getElementById('btn-convert-csv-confirm');

    if (filePicker && textInput) {
        filePicker.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                textInput.value = ev.target.result;
                showToast(`Loaded ${file.name}`);
            };
            reader.readAsText(file);
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const text = textInput ? textInput.value.trim() : '';
            if (!text) {
                showToast("Please enter or paste CSV data");
                return;
            }
            const delim = delimSelect ? delimSelect.value : 'auto';
            const rows = parseDelimitedTextToRows(text, delim);
            if (rows.length === 0) {
                showToast("No valid rows found in CSV data");
                return;
            }
            closeModal('csv-modal');
            insertCustomSpreadsheet(rows, 'excel-table');
        });
    }
}

// --- Interactive Table Management & Floating Toolbar ---
let activeTable = null;
let activeTableCell = null;

function positionTableToolbar(table, cell) {
    const toolbar = document.getElementById('table-floating-toolbar');
    const editorArea = document.getElementById('editor-area');
    if (!toolbar || !editorArea || !table) return;

    toolbar.style.display = 'flex';
    const cellOrTable = cell || table;
    const targetRect = cellOrTable.getBoundingClientRect();
    const areaRect = editorArea.getBoundingClientRect();

    let top = (targetRect.top - areaRect.top) + editorArea.scrollTop - 44;
    let left = (targetRect.left - areaRect.left) + editorArea.scrollLeft;

    if (top < 10) top = (targetRect.bottom - areaRect.top) + editorArea.scrollTop + 8;
    if (left + toolbar.offsetWidth > areaRect.width - 20) {
        left = Math.max(10, areaRect.width - toolbar.offsetWidth - 20);
    }
    if (left < 10) left = 10;

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
}

function hideTableToolbar() {
    const toolbar = document.getElementById('table-floating-toolbar');
    if (toolbar) toolbar.style.display = 'none';
}

function initTableInteractions() {
    const editor = document.getElementById('rich-editor');
    if (!editor) return;

    editor.querySelectorAll('table').forEach(table => {
        if (table.dataset.tableInteractionsAttached) return;
        table.dataset.tableInteractionsAttached = 'true';

        table.addEventListener('click', (e) => {
            activeTable = table;
            const cell = e.target.closest('td, th');
            if (cell) {
                activeTableCell = cell;
                positionTableToolbar(table, cell);
            }
        });

        table.addEventListener('focusin', (e) => {
            activeTable = table;
            const cell = e.target.closest('td, th');
            if (cell) {
                activeTableCell = cell;
                positionTableToolbar(table, cell);
            }
        });

        // Tab key navigation inside table cells
        table.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const cell = e.target.closest('td, th');
                if (!cell) return;
                e.preventDefault();
                const allCells = Array.from(table.querySelectorAll('th, td'));
                const idx = allCells.indexOf(cell);

                if (!e.shiftKey) {
                    if (idx >= 0 && idx < allCells.length - 1) {
                        allCells[idx + 1].focus();
                        activeTableCell = allCells[idx + 1];
                        positionTableToolbar(table, activeTableCell);
                    } else if (idx === allCells.length - 1) {
                        // Last cell in last row: auto-insert a new row!
                        pushRichSnapshot();
                        const curRow = cell.closest('tr');
                        const colCount = curRow.children.length;
                        const newRow = document.createElement('tr');
                        for (let c = 0; c < colCount; c++) {
                            const td = document.createElement('td');
                            td.innerHTML = '<br>';
                            newRow.appendChild(td);
                        }
                        curRow.parentNode.appendChild(newRow);
                        const firstNewCell = newRow.querySelector('td');
                        if (firstNewCell) {
                            firstNewCell.focus();
                            activeTableCell = firstNewCell;
                            positionTableToolbar(table, activeTableCell);
                        }
                        pushRichSnapshot();
                        saveCurrentStateToMemory();
                    }
                } else {
                    // Shift + Tab
                    if (idx > 0) {
                        allCells[idx - 1].focus();
                        activeTableCell = allCells[idx - 1];
                        positionTableToolbar(table, activeTableCell);
                    }
                }
            }
        });
    });

    // Wire up floating table toolbar actions
    const toolbar = document.getElementById('table-floating-toolbar');
    if (toolbar && !toolbar.dataset.eventsBound) {
        toolbar.dataset.eventsBound = 'true';

        toolbar.querySelectorAll('[data-tbl-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeTable) return;
                const action = btn.dataset.tblAction;
                pushRichSnapshot();

                const curRow = activeTableCell ? activeTableCell.closest('tr') : activeTable.querySelector('tbody tr') || activeTable.querySelector('tr');
                const colIdx = activeTableCell ? activeTableCell.cellIndex : 0;

                switch (action) {
                    case 'add-row-above': {
                        if (!curRow) return;
                        const newRow = document.createElement('tr');
                        const numCols = curRow.children.length;
                        for (let i = 0; i < numCols; i++) {
                            const td = document.createElement('td');
                            td.innerHTML = '<br>';
                            newRow.appendChild(td);
                        }
                        curRow.parentNode.insertBefore(newRow, curRow);
                        const firstCell = newRow.querySelector('td');
                        if (firstCell) {
                            firstCell.focus();
                            activeTableCell = firstCell;
                        }
                        positionTableToolbar(activeTable, activeTableCell);
                        showToast("Row inserted above");
                        break;
                    }
                    case 'add-row-below': {
                        if (!curRow) return;
                        const newRow = document.createElement('tr');
                        const numCols = curRow.children.length;
                        for (let i = 0; i < numCols; i++) {
                            const td = document.createElement('td');
                            td.innerHTML = '<br>';
                            newRow.appendChild(td);
                        }
                        curRow.parentNode.insertBefore(newRow, curRow.nextSibling);
                        const firstCell = newRow.querySelector('td');
                        if (firstCell) {
                            firstCell.focus();
                            activeTableCell = firstCell;
                        }
                        positionTableToolbar(activeTable, activeTableCell);
                        showToast("Row inserted below");
                        break;
                    }
                    case 'del-row': {
                        if (!curRow) return;
                        const allRows = activeTable.querySelectorAll('tr');
                        if (allRows.length <= 1) {
                            activeTable.remove();
                            hideTableToolbar();
                            activeTable = null;
                            activeTableCell = null;
                            showToast("Table deleted");
                        } else {
                            const nextFocus = curRow.nextElementSibling || curRow.previousElementSibling;
                            curRow.remove();
                            if (nextFocus) {
                                const targetCell = nextFocus.children[Math.min(colIdx, nextFocus.children.length - 1)];
                                if (targetCell) {
                                    targetCell.focus();
                                    activeTableCell = targetCell;
                                }
                            }
                            positionTableToolbar(activeTable, activeTableCell);
                            showToast("Row deleted");
                        }
                        break;
                    }
                    case 'add-col-left': {
                        activeTable.querySelectorAll('tr').forEach(r => {
                            const isHeader = r.closest('thead') !== null;
                            const newCell = document.createElement(isHeader ? 'th' : 'td');
                            newCell.innerHTML = isHeader ? 'Header' : '<br>';
                            if (r.children[colIdx]) {
                                r.insertBefore(newCell, r.children[colIdx]);
                            } else {
                                r.appendChild(newCell);
                            }
                        });
                        positionTableToolbar(activeTable, activeTableCell);
                        showToast("Column inserted left");
                        break;
                    }
                    case 'add-col-right': {
                        activeTable.querySelectorAll('tr').forEach(r => {
                            const isHeader = r.closest('thead') !== null;
                            const newCell = document.createElement(isHeader ? 'th' : 'td');
                            newCell.innerHTML = isHeader ? 'Header' : '<br>';
                            if (r.children[colIdx + 1]) {
                                r.insertBefore(newCell, r.children[colIdx + 1]);
                            } else {
                                r.appendChild(newCell);
                            }
                        });
                        positionTableToolbar(activeTable, activeTableCell);
                        showToast("Column inserted right");
                        break;
                    }
                    case 'del-col': {
                        const firstRow = activeTable.querySelector('tr');
                        if (!firstRow || firstRow.children.length <= 1) {
                            activeTable.remove();
                            hideTableToolbar();
                            activeTable = null;
                            activeTableCell = null;
                            showToast("Table deleted");
                        } else {
                            activeTable.querySelectorAll('tr').forEach(r => {
                                if (r.children[colIdx]) {
                                    r.children[colIdx].remove();
                                }
                            });
                            const newActiveCell = curRow ? curRow.children[Math.min(colIdx, curRow.children.length - 1)] : null;
                            if (newActiveCell) {
                                newActiveCell.focus();
                                activeTableCell = newActiveCell;
                            }
                            positionTableToolbar(activeTable, activeTableCell);
                            showToast("Column deleted");
                        }
                        break;
                    }
                    case 'cycle-style': {
                        const themes = ['excel-table', 'corporate-table', 'minimal-table'];
                        let curTheme = themes.find(t => activeTable.classList.contains(t)) || 'excel-table';
                        let curIdx = themes.indexOf(curTheme);
                        let nextTheme = themes[(curIdx + 1) % themes.length];
                        themes.forEach(t => activeTable.classList.remove(t));
                        activeTable.classList.add(nextTheme);
                        showToast(`Table style: ${nextTheme}`);
                        break;
                    }
                    case 'del-table': {
                        activeTable.remove();
                        hideTableToolbar();
                        activeTable = null;
                        activeTableCell = null;
                        showToast("Table removed");
                        break;
                    }
                }

                pushRichSnapshot();
                saveCurrentStateToMemory();
                updateStats();
            });
        });
    }

    // Hide table toolbar on clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('table') && !e.target.closest('#table-floating-toolbar')) {
            hideTableToolbar();
        }
    });
}

// --- MS Word Multiple Bullet & Numbering Point Library ---

function applyBulletStyle(bulletType) {
    if (!AppState.isRichTextMode) {
        showToast("Bullet styles available in Rich Text mode");
        return;
    }
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();
    restoreEditorSelection(false);
    pushRichSnapshot();

    if (bulletType === 'none') {
        document.execCommand('insertUnorderedList', false, null);
        pushRichSnapshot();
        saveCurrentStateToMemory();
        syncToolbar();
        showToast("Bullets removed");
        return;
    }

    const sel = window.getSelection();
    let listEl = null;

    if (sel && sel.anchorNode) {
        let node = sel.anchorNode;
        while (node && node !== richEditor) {
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                listEl = node;
                break;
            }
            node = node.parentNode;
        }
    }

    if (!listEl) {
        document.execCommand('insertUnorderedList', false, null);
        const sel2 = window.getSelection();
        if (sel2 && sel2.anchorNode) {
            let n = sel2.anchorNode;
            while (n && n !== richEditor) {
                if (n.tagName === 'UL' || n.tagName === 'OL') {
                    listEl = n;
                    break;
                }
                n = n.parentNode;
            }
        }
    }

    if (listEl) {
        if (listEl.tagName === 'OL') {
            const ul = document.createElement('ul');
            while (listEl.firstChild) ul.appendChild(listEl.firstChild);
            listEl.parentNode.replaceChild(ul, listEl);
            listEl = ul;
        }

        const bulletClasses = ['bullet-disc', 'bullet-circle', 'bullet-square', 'bullet-diamond', 'bullet-arrow', 'bullet-check', 'bullet-star', 'bullet-dash'];
        bulletClasses.forEach(cls => listEl.classList.remove(cls));
        listEl.classList.add(`bullet-${bulletType}`);
    }

    pushRichSnapshot();
    saveCurrentStateToMemory();
    syncToolbar();
    showToast(`Bullet style: ${bulletType}`);
}

function applyNumberStyle(numType) {
    if (!AppState.isRichTextMode) {
        showToast("Numbering styles available in Rich Text mode");
        return;
    }
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();
    restoreEditorSelection(false);
    pushRichSnapshot();

    if (numType === 'none') {
        document.execCommand('insertOrderedList', false, null);
        pushRichSnapshot();
        saveCurrentStateToMemory();
        syncToolbar();
        showToast("Numbering removed");
        return;
    }

    const sel = window.getSelection();
    let listEl = null;

    if (sel && sel.anchorNode) {
        let node = sel.anchorNode;
        while (node && node !== richEditor) {
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                listEl = node;
                break;
            }
            node = node.parentNode;
        }
    }

    if (!listEl) {
        document.execCommand('insertOrderedList', false, null);
        const sel2 = window.getSelection();
        if (sel2 && sel2.anchorNode) {
            let n = sel2.anchorNode;
            while (n && n !== richEditor) {
                if (n.tagName === 'UL' || n.tagName === 'OL') {
                    listEl = n;
                    break;
                }
                n = n.parentNode;
            }
        }
    }

    if (listEl) {
        if (listEl.tagName === 'UL') {
            const ol = document.createElement('ol');
            while (listEl.firstChild) ol.appendChild(listEl.firstChild);
            listEl.parentNode.replaceChild(ol, listEl);
            listEl = ol;
        }

        const numClasses = ['num-decimal', 'num-decimal-paren', 'num-upper-alpha', 'num-lower-alpha', 'num-lower-alpha-paren', 'num-upper-roman', 'num-lower-roman'];
        numClasses.forEach(cls => listEl.classList.remove(cls));
        listEl.classList.add(`num-${numType}`);
    }

    pushRichSnapshot();
    saveCurrentStateToMemory();
    syncToolbar();
    showToast(`Numbering style: ${numType}`);
}

function initBulletLibraryEvents() {
    const btnBulletMenu = document.getElementById('btn-bullet-menu');
    const bulletMenu = document.getElementById('bullet-menu');
    const btnNumberMenu = document.getElementById('btn-number-menu');
    const numberMenu = document.getElementById('number-menu');

    if (btnBulletMenu && bulletMenu) {
        btnBulletMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (numberMenu) numberMenu.classList.remove('show');
            bulletMenu.classList.toggle('show');
        });

        bulletMenu.querySelectorAll('.bullet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const bType = item.dataset.bullet;
                bulletMenu.classList.remove('show');
                applyBulletStyle(bType);
            });
        });
    }

    if (btnNumberMenu && numberMenu) {
        btnNumberMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (bulletMenu) bulletMenu.classList.remove('show');
            numberMenu.classList.toggle('show');
        });

        numberMenu.querySelectorAll('.number-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const nType = item.dataset.num;
                numberMenu.classList.remove('show');
                applyNumberStyle(nType);
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (bulletMenu && !bulletMenu.contains(e.target) && e.target !== btnBulletMenu) {
            bulletMenu.classList.remove('show');
        }
        if (numberMenu && !numberMenu.contains(e.target) && e.target !== btnNumberMenu) {
            numberMenu.classList.remove('show');
        }
    });
}

// 7. Format Number / Currency $ (Excel)
function formatCurrency() {
    if (!AppState.isRichTextMode) {
        showToast("Currency formatting available in Rich Text mode");
        return;
    }

    const richEditor = document.getElementById('rich-editor');
    richEditor.focus();
    restoreEditorSelection(false);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let selectedText = sel.toString().trim();
    if (selectedText) {
        const num = parseFloat(selectedText.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
            const formatted = num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            document.execCommand('insertText', false, formatted);
            saveCurrentStateToMemory();
            showToast(`Formatted as ${formatted}`);
            return;
        }
    }

    // If inside a table cell
    if (sel.anchorNode) {
        let node = sel.anchorNode;
        while (node && node !== richEditor) {
            if (node.tagName === 'TD' || node.tagName === 'TH') {
                const val = parseFloat(node.textContent.trim().replace(/[^0-9.-]+/g, ''));
                if (!isNaN(val)) {
                    node.textContent = val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    node.style.textAlign = 'right';
                    saveCurrentStateToMemory();
                    showToast(`Cell formatted: ${node.textContent}`);
                    return;
                }
            }
            node = node.parentNode;
        }
    }
    showToast("Select a number to format as currency ($)");
}

function insertBorderBox() {
    if (!AppState.isRichTextMode) {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const pos = ed.selectionStart;
            const boxText = "\n+------------------------------------------------------------+\n| 📌 Note: Type your highlighted notice or summary here...   |\n+------------------------------------------------------------+\n";
            ed.value = ed.value.substring(0, pos) + boxText + ed.value.substring(ed.selectionEnd);
            ed.selectionStart = ed.selectionEnd = pos + boxText.length;
            pushHistory(ed.value);
            saveCurrentStateToMemory();
            showToast("Note Box inserted");
        }
        return;
    }

    pushRichSnapshot();
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();

    const boxHtml = '<div class="word-border-box" style="border:2px solid var(--accent-color); background:var(--hover-color); border-radius:6px; padding:12px 16px; margin:12px 0;"><strong style="color:var(--accent-color); font-size:14px; display:block; margin-bottom:4px;">📌 Important Note / Summary</strong><p style="margin:0;">Type your highlighted content, important notice, or summary here...</p></div><p><br></p>';

    let inserted = false;
    try {
        inserted = document.execCommand('insertHTML', false, boxHtml);
    } catch (e) {
        inserted = false;
    }

    if (!inserted) {
        const temp = document.createElement('div');
        temp.innerHTML = boxHtml;
        while (temp.firstChild) {
            richEditor.appendChild(temp.firstChild);
        }
    }

    pushRichSnapshot();
    saveCurrentStateToMemory();
    updateStats();
    showToast("Shaded Callout Box inserted");
}

// 9. Direct On-Page Paint Canvas Engine (Paint)
let pagePaint = {
    active: false,
    tool: 'pen',
    color: '#ef4444',
    size: 4,
    isDrawing: false,
    ctx: null,
    canvas: null
};

function togglePagePaint(force = null) {
    const canvas = document.getElementById('page-paint-canvas');
    const paintBar = document.getElementById('paint-bar');
    const paintBtn = document.getElementById('tool-paint');
    if (!canvas || !paintBar) return;

    pagePaint.active = force !== null ? force : !pagePaint.active;
    AppState.isPaintActive = pagePaint.active;

    if (pagePaint.active) {
        paintBar.classList.add('active');
        document.body.classList.add('paint-active');
        paintBar.style.display = 'flex';
        canvas.style.display = 'block';
        if (paintBtn) paintBtn.classList.add('active');
        initPagePaintCanvas();
        showToast("Paint Mode: Draw directly on document");
    } else {
        paintBar.classList.remove('active');
        document.body.classList.remove('paint-active');
        paintBar.style.display = 'none';
        canvas.style.display = 'none';
        if (paintBtn) paintBtn.classList.remove('active');
        showToast("Paint Mode closed");
    }
}

function initPagePaintCanvas() {
    const canvas = document.getElementById('page-paint-canvas');
    const container = document.getElementById('editor-area');
    if (!canvas || !container) return;

    pagePaint.canvas = canvas;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Resize canvas without wiping existing drawing
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (canvas.width > 0 && canvas.height > 0) {
            tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        pagePaint.ctx = canvas.getContext('2d');
        pagePaint.ctx.scale(dpr, dpr);
        pagePaint.ctx.lineCap = 'round';
        pagePaint.ctx.lineJoin = 'round';

        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            pagePaint.ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
        }
    } else {
        pagePaint.ctx = canvas.getContext('2d');
        pagePaint.ctx.lineCap = 'round';
        pagePaint.ctx.lineJoin = 'round';
    }

    if (canvas.dataset.listenersAttached) return;
    canvas.dataset.listenersAttached = 'true';

    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - r.left,
            y: clientY - r.top
        };
    }

    function onDown(e) {
        pagePaint.isDrawing = true;
        const pos = getPos(e);
        const ctx = pagePaint.ctx;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);

        if (pagePaint.tool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = pagePaint.color;
            ctx.lineWidth = pagePaint.size;
            ctx.globalAlpha = 1.0;
        } else if (pagePaint.tool === 'highlighter') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = pagePaint.color;
            ctx.lineWidth = pagePaint.size * 3.5;
            ctx.globalAlpha = 0.35;
        } else if (pagePaint.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = pagePaint.size * 5;
            ctx.globalAlpha = 1.0;
        }

        if (e.cancelable) e.preventDefault();
    }

    function onMove(e) {
        if (!pagePaint.isDrawing) return;
        const pos = getPos(e);
        pagePaint.ctx.lineTo(pos.x, pos.y);
        pagePaint.ctx.stroke();
        if (e.cancelable) e.preventDefault();
    }

    function onUp() {
        if (pagePaint.isDrawing) {
            pagePaint.isDrawing = false;
            pagePaint.ctx.closePath();
            pushRichSnapshot();
            saveCurrentStateToMemory(false);
        }
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    // Wire up paint-bar buttons
    document.querySelectorAll('[data-paint-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.paintAction;
            if (action === 'pen') {
                pagePaint.tool = 'pen';
                document.querySelectorAll('[data-paint-action="pen"], [data-paint-action="highlighter"], [data-paint-action="eraser"]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else if (action === 'highlighter') {
                pagePaint.tool = 'highlighter';
                document.querySelectorAll('[data-paint-action="pen"], [data-paint-action="highlighter"], [data-paint-action="eraser"]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else if (action === 'eraser') {
                pagePaint.tool = 'eraser';
                document.querySelectorAll('[data-paint-action="pen"], [data-paint-action="highlighter"], [data-paint-action="eraser"]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else if (action === 'clear') {
                if (pagePaint.ctx && canvas) {
                    pushRichSnapshot();
                    pagePaint.ctx.clearRect(0, 0, canvas.width, canvas.height);
                    pushRichSnapshot();
                    saveCurrentStateToMemory(false);
                    showToast("Page drawing cleared");
                }
            } else if (action === 'stamp') {
                embedPageDrawing();
            } else if (action === 'close') {
                togglePagePaint(false);
            }
        });
    });

    document.querySelectorAll('.paint-bar .paint-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.paint-bar .paint-color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            pagePaint.color = swatch.dataset.paintColor;
            if (pagePaint.tool === 'eraser') {
                pagePaint.tool = 'pen';
                document.getElementById('paint-page-pen')?.classList.add('active');
                document.getElementById('paint-page-eraser')?.classList.remove('active');
            }
        });
    });

    const customColor = document.getElementById('paint-page-color');
    if (customColor) {
        customColor.addEventListener('input', (e) => {
            pagePaint.color = e.target.value;
            if (pagePaint.tool === 'eraser') {
                pagePaint.tool = 'pen';
                document.getElementById('paint-page-pen')?.classList.add('active');
                document.getElementById('paint-page-eraser')?.classList.remove('active');
            }
        });
    }

    const strokeSelect = document.getElementById('paint-page-size');
    if (strokeSelect) {
        strokeSelect.addEventListener('change', (e) => {
            pagePaint.size = parseInt(e.target.value) || 4;
        });
    }
}

function embedPageDrawing() {
    const canvas = document.getElementById('page-paint-canvas');
    if (!canvas) return;

    if (!AppState.isRichTextMode) {
        showToast("Switch to Rich Text mode to embed drawings into content");
        return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const richEditor = document.getElementById('rich-editor');
    richEditor.focus();
    restoreEditorSelection(false);

    pushRichSnapshot();
    const imgHtml = `<img src="${dataUrl}" alt="On-Page Drawing" style="max-width:100%; border:1px solid var(--border-color); border-radius:4px; margin:8px 0; display:block;"><p><br></p>`;
    document.execCommand('insertHTML', false, imgHtml);
    togglePagePaint(false);
    initImageInteractions();
    pushRichSnapshot();
    saveCurrentStateToMemory();
    showToast("Drawing embedded into note content");
}

/* ==========================================================================
   10. Unified Rich Undo/Redo Snapshot Engine
   Supports Paint strokes, Shapes, Page breaks, Dividers, Tables, Images & HTML
   ========================================================================== */

let richSnapshotDebounceTimer = null;

function pushRichSnapshot() {
    if (!AppState.isRichTextMode) return;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    const html = richEditor.innerHTML;
    let canvasData = null;
    const canvas = document.getElementById('page-paint-canvas');
    if (canvas && pagePaint && pagePaint.active) {
        try {
            canvasData = canvas.toDataURL('image/png');
        } catch (e) {}
    }

    if (!Array.isArray(AppState.richUndoStack)) {
        AppState.richUndoStack = [];
        AppState.richUndoIndex = -1;
    }

    if (AppState.richUndoIndex < AppState.richUndoStack.length - 1) {
        AppState.richUndoStack = AppState.richUndoStack.slice(0, AppState.richUndoIndex + 1);
    }

    const top = AppState.richUndoStack[AppState.richUndoIndex];
    if (top && top.html === html && top.canvasData === canvasData) {
        return;
    }

    AppState.richUndoStack.push({
        html: html,
        canvasData: canvasData,
        isPaint: pagePaint ? pagePaint.active : false
    });

    if (AppState.richUndoStack.length > (AppState.maxHistory || 50)) {
        AppState.richUndoStack.shift();
    } else {
        AppState.richUndoIndex++;
    }
}

function executeRichUndo() {
    if (!AppState.isRichTextMode) {
        plainEditorUndo();
        return;
    }

    if (Array.isArray(AppState.richUndoStack) && AppState.richUndoIndex > 0) {
        AppState.richUndoIndex--;
        restoreRichSnapshot(AppState.richUndoStack[AppState.richUndoIndex]);
        showToast("Undo");
    } else {
        showToast("Nothing to undo");
    }
}

function executeRichRedo() {
    if (!AppState.isRichTextMode) {
        plainEditorRedo();
        return;
    }

    if (Array.isArray(AppState.richUndoStack) && AppState.richUndoIndex < AppState.richUndoStack.length - 1) {
        AppState.richUndoIndex++;
        restoreRichSnapshot(AppState.richUndoStack[AppState.richUndoIndex]);
        showToast("Redo");
    } else {
        showToast("Nothing to redo");
    }
}

function restoreRichSnapshot(snap) {
    if (!snap) return;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    richEditor.innerHTML = snap.html;

    const canvas = document.getElementById('page-paint-canvas');
    if (canvas && pagePaint && pagePaint.ctx) {
        pagePaint.ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (snap.canvasData) {
            const img = new Image();
            img.onload = () => {
                const dpr = window.devicePixelRatio || 1;
                pagePaint.ctx.save();
                pagePaint.ctx.setTransform(1, 0, 0, 1, 0, 0);
                pagePaint.ctx.drawImage(img, 0, 0);
                pagePaint.ctx.restore();
            };
            img.src = snap.canvasData;
        }
    }

    initPageBreakHandlers();
    initShapeInteractions();
    initTableInteractions();
    initImageInteractions();
    updateStats();
    saveCurrentStateToMemory(false);
}

/* ==========================================================================
   11. Shapes System (MS Word / PowerPoint Style)
   Clean shapes without inline top bars.
   Move handle & sizing handles appear on corner upon click/touch.
   Dynamic shape conversion dropdown, color swatches & border toggle.
   ========================================================================== */

let activeSelectedShape = null;

function getContrastTextColor(hex) {
    if (!hex || hex === 'transparent') return '#1e293b';
    if (hex.startsWith('#')) {
        const c = hex.substring(1);
        const r = parseInt(c.substr(0, 2), 16) || 0;
        const g = parseInt(c.substr(2, 2), 16) || 0;
        const b = parseInt(c.substr(4, 2), 16) || 0;
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 150) ? '#1e293b' : '#ffffff';
    }
    return '#ffffff';
}

function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function insertShape(type = 'rounded-rect', color = '#3b82f6', text = 'Shape Text') {
    if (!AppState.isRichTextMode) {
        showToast("Switch to Rich Text mode to insert Shapes");
        return;
    }
    pushRichSnapshot();
    const shapeId = 'shape-' + Date.now();
    const textColor = getContrastTextColor(color);
    const cleanText = text && text.trim() ? text.trim() : 'Type text inside shape';

    // In MS Word: Shape has NO static top bar!
    // Corner move button & 8 resize handles reside in .shape-selection-overlay (revealed on click/touch).
    const shapeHtml = `
    <div class="doc-shape-wrapper" id="${shapeId}" contenteditable="false" data-shape-type="${type}">
        <div class="shape-selection-overlay">
            <div class="shape-handle shape-move-corner" title="Click & drag to move shape">✥</div>
            <div class="shape-handle shape-handle-tl" data-handle="tl"></div>
            <div class="shape-handle shape-handle-tr" data-handle="tr"></div>
            <div class="shape-handle shape-handle-bl" data-handle="bl"></div>
            <div class="shape-handle shape-handle-br" data-handle="br"></div>
            <div class="shape-handle shape-handle-t" data-handle="t"></div>
            <div class="shape-handle shape-handle-b" data-handle="b"></div>
            <div class="shape-handle shape-handle-l" data-handle="l"></div>
            <div class="shape-handle shape-handle-r" data-handle="r"></div>
        </div>
        <div class="doc-shape-body shape-${type}" style="background-color: ${color}; color: ${textColor};">
            <div class="doc-shape-text" contenteditable="true" spellcheck="false">${escapeHtml(cleanText)}</div>
        </div>
    </div><p><br></p>`;

    formatDoc('insertHTML', shapeHtml);
    initShapeInteractions();
    pushRichSnapshot();
    saveCurrentStateToMemory();

    // Auto-select the newly inserted shape
    const newShape = document.getElementById(shapeId);
    if (newShape) {
        selectShape(newShape);
    }
    showToast(`Shape inserted: ${type}`);
}

function selectShape(wrapper) {
    if (!wrapper) return;
    if (activeSelectedShape && activeSelectedShape !== wrapper) {
        deselectShape(activeSelectedShape);
    }
    activeSelectedShape = wrapper;
    wrapper.classList.add('shape-selected');
    positionShapeToolbar(wrapper);

    // Sync shape convert select dropdown in floating toolbar
    const shapeSelect = document.getElementById('shape-convert-select');
    if (shapeSelect) {
        const curType = wrapper.dataset.shapeType || 'rectangle';
        shapeSelect.value = curType;
    }
}

function deselectShape(wrapper) {
    if (wrapper) wrapper.classList.remove('shape-selected');
    if (activeSelectedShape === wrapper) activeSelectedShape = null;
    hideShapeToolbar();
}

function positionShapeToolbar(wrapper) {
    const toolbar = document.getElementById('shape-floating-toolbar');
    const editorArea = document.getElementById('editor-area');
    if (!toolbar || !editorArea || !wrapper) return;

    toolbar.style.display = 'flex';
    const rect = wrapper.getBoundingClientRect();
    const areaRect = editorArea.getBoundingClientRect();

    let top = (rect.top - areaRect.top) + editorArea.scrollTop - 44;
    let left = (rect.left - areaRect.left) + editorArea.scrollLeft;

    if (top < 10) top = (rect.bottom - areaRect.top) + editorArea.scrollTop + 8;
    if (left + toolbar.offsetWidth > areaRect.width - 20) {
        left = Math.max(10, areaRect.width - toolbar.offsetWidth - 20);
    }
    if (left < 10) left = 10;

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
}

function hideShapeToolbar() {
    const toolbar = document.getElementById('shape-floating-toolbar');
    if (toolbar) toolbar.style.display = 'none';
}

function convertActiveShape(newType) {
    if (!activeSelectedShape) return;
    pushRichSnapshot();
    const body = activeSelectedShape.querySelector('.doc-shape-body');
    if (body) {
        const shapeClasses = [
            'shape-rectangle', 'shape-rounded-rect', 'shape-circle', 'shape-callout',
            'shape-diamond', 'shape-arrow', 'shape-triangle', 'shape-star',
            'shape-hexagon', 'shape-pentagon', 'shape-heart', 'shape-cloud',
            'shape-badge', 'shape-left-arrow', 'shape-pill', 'shape-cylinder',
            'shape-octagon', 'shape-parallelogram', 'shape-trapezoid', 'shape-cross', 'shape-custom'
        ];
        shapeClasses.forEach(cls => body.classList.remove(cls));
        body.classList.add(`shape-${newType}`);
        activeSelectedShape.dataset.shapeType = newType;
    }
    pushRichSnapshot();
    saveCurrentStateToMemory();
    positionShapeToolbar(activeSelectedShape);
    showToast(`Converted shape to ${newType}`);
}

function insertCustomShape(opts = {}) {
    if (!AppState.isRichTextMode) {
        showToast("Switch to Rich Text mode to insert Shapes");
        return;
    }
    const w = parseInt(opts.width) || 160;
    const h = parseInt(opts.height) || 80;
    const radius = parseInt(opts.radius) || 12;
    const bw = parseInt(opts.borderWidth) || 2;
    const color = opts.color || '#3b82f6';
    const text = opts.text || 'Custom Shape';

    pushRichSnapshot();
    const shapeId = 'shape-' + Date.now();
    const textColor = getContrastTextColor(color);

    const shapeHtml = `
    <div class="doc-shape-wrapper" id="${shapeId}" contenteditable="false" data-shape-type="custom" style="width:${w}px; height:${h}px;">
        <div class="shape-selection-overlay">
            <div class="shape-handle shape-move-corner" title="Click & drag to move shape">✥</div>
            <div class="shape-handle shape-handle-tl" data-handle="tl"></div>
            <div class="shape-handle shape-handle-tr" data-handle="tr"></div>
            <div class="shape-handle shape-handle-bl" data-handle="bl"></div>
            <div class="shape-handle shape-handle-br" data-handle="br"></div>
            <div class="shape-handle shape-handle-t" data-handle="t"></div>
            <div class="shape-handle shape-handle-b" data-handle="b"></div>
            <div class="shape-handle shape-handle-l" data-handle="l"></div>
            <div class="shape-handle shape-handle-r" data-handle="r"></div>
        </div>
        <div class="doc-shape-body shape-custom" style="background-color: ${color}; color: ${textColor}; border-radius: ${radius}px; border: ${bw}px solid rgba(0,0,0,0.3); width:100%; height:100%; box-sizing:border-box;">
            <div class="doc-shape-text" contenteditable="true" spellcheck="false">${escapeHtml(text)}</div>
        </div>
    </div><p><br></p>`;

    formatDoc('insertHTML', shapeHtml);
    initShapeInteractions();
    pushRichSnapshot();
    saveCurrentStateToMemory();

    const newShape = document.getElementById(shapeId);
    if (newShape) {
        selectShape(newShape);
    }
    showToast("Custom shape created and inserted");
}

function duplicateSelectedShape() {
    if (!activeSelectedShape) {
        showToast("Please select a shape to duplicate");
        return;
    }
    pushRichSnapshot();
    const clone = activeSelectedShape.cloneNode(true);
    const newId = 'shape-' + Date.now();
    clone.id = newId;
    delete clone.dataset.interactionsAttached;
    clone.classList.remove('shape-selected');

    activeSelectedShape.insertAdjacentElement('afterend', clone);
    initShapeInteractions();

    const inserted = document.getElementById(newId);
    if (inserted) {
        selectShape(inserted);
    }
    pushRichSnapshot();
    saveCurrentStateToMemory();
    showToast("Shape duplicated");
}

function initShapeInteractions() {
    const editor = document.getElementById('rich-editor');
    if (!editor) return;

    editor.querySelectorAll('.doc-shape-wrapper').forEach(wrapper => {
        if (wrapper.dataset.interactionsAttached) return;
        wrapper.dataset.interactionsAttached = 'true';

        // 1. Click / Touch to select shape (reveal corner move handle & 8 sizing handles)
        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            selectShape(wrapper);
        });

        wrapper.addEventListener('touchstart', (e) => {
            if (!wrapper.classList.contains('shape-selected')) {
                selectShape(wrapper);
            }
        }, { passive: true });

        // 2. Corner Move Handle Dragging (Top-right corner button with ✥)
        const moveCorner = wrapper.querySelector('.shape-move-corner');
        if (moveCorner) {
            let isMoving = false;
            let startX, startY, origLeft, origTop;

            const onStartMove = (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectShape(wrapper);
                isMoving = true;
                pushRichSnapshot();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                startX = clientX;
                startY = clientY;
                origLeft = parseFloat(wrapper.style.marginLeft) || 0;
                origTop = parseFloat(wrapper.style.marginTop) || 0;

                const onMove = (ev) => {
                    if (!isMoving) return;
                    if (ev.cancelable) ev.preventDefault();
                    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
                    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
                    const dx = cx - startX;
                    const dy = cy - startY;
                    wrapper.style.marginLeft = `${Math.max(0, origLeft + dx)}px`;
                    wrapper.style.marginTop = `${Math.max(0, origTop + dy)}px`;
                    positionShapeToolbar(wrapper);
                };

                const onEnd = () => {
                    if (!isMoving) return;
                    isMoving = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onEnd);
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('touchend', onEnd);
                    positionShapeToolbar(wrapper);
                    pushRichSnapshot();
                    saveCurrentStateToMemory();
                };

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onEnd);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onEnd);
            };

            moveCorner.addEventListener('mousedown', onStartMove);
            moveCorner.addEventListener('touchstart', onStartMove, { passive: false });
        }

        // 3. Smooth Resizing via Handles
        wrapper.querySelectorAll('.shape-handle[data-handle]').forEach(resizer => {
            let isResizing = false;
            let startW, startH, startX, startY;
            const hType = resizer.dataset.handle;

            const onStartResize = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                pushRichSnapshot();
                const body = wrapper.querySelector('.doc-shape-body');
                if (!body) return;
                startW = body.offsetWidth;
                startH = body.offsetHeight;
                startX = e.touches ? e.touches[0].clientX : e.clientX;
                startY = e.touches ? e.touches[0].clientY : e.clientY;

                const onResize = (ev) => {
                    if (!isResizing) return;
                    if (ev.cancelable) ev.preventDefault();
                    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
                    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
                    const dx = cx - startX;
                    const dy = cy - startY;

                    if (hType.includes('r')) {
                        body.style.width = `${Math.max(100, startW + dx)}px`;
                    } else if (hType.includes('l')) {
                        body.style.width = `${Math.max(100, startW - dx)}px`;
                    }

                    if (hType.includes('b')) {
                        body.style.height = `${Math.max(50, startH + dy)}px`;
                    } else if (hType.includes('t')) {
                        body.style.height = `${Math.max(50, startH - dy)}px`;
                    }
                    positionShapeToolbar(wrapper);
                };

                const onEndResize = () => {
                    if (!isResizing) return;
                    isResizing = false;
                    document.removeEventListener('mousemove', onResize);
                    document.removeEventListener('mouseup', onEndResize);
                    document.removeEventListener('touchmove', onResize);
                    document.removeEventListener('touchend', onEndResize);
                    positionShapeToolbar(wrapper);
                    pushRichSnapshot();
                    saveCurrentStateToMemory();
                };

                document.addEventListener('mousemove', onResize);
                document.addEventListener('mouseup', onEndResize);
                document.addEventListener('touchmove', onResize, { passive: false });
                document.addEventListener('touchend', onEndResize);
            };

            resizer.addEventListener('mousedown', onStartResize);
            resizer.addEventListener('touchstart', onStartResize, { passive: false });
        });

        // 4. Text editing inside shape
        const textElem = wrapper.querySelector('.doc-shape-text');
        if (textElem) {
            textElem.addEventListener('focus', () => {
                selectShape(wrapper);
            });
            textElem.addEventListener('input', () => {
                saveCurrentStateToMemory(false);
            });
            textElem.addEventListener('blur', () => {
                pushRichSnapshot();
                saveCurrentStateToMemory(false);
            });
        }
    });

    // Wire up Floating Shape Toolbar controls once
    const shapeToolbar = document.getElementById('shape-floating-toolbar');
    if (shapeToolbar && !shapeToolbar.dataset.eventsBound) {
        shapeToolbar.dataset.eventsBound = 'true';

        // 1. Shape Type Converter Dropdown (MS Word style)
        const typeSelect = document.getElementById('shape-convert-select');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                convertActiveShape(e.target.value);
            });
        }

        // 2. Quick Color Swatches
        shapeToolbar.querySelectorAll('.shape-quick-color').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeSelectedShape) return;
                const color = swatch.dataset.color;
                const body = activeSelectedShape.querySelector('.doc-shape-body');
                if (body) {
                    pushRichSnapshot();
                    body.style.backgroundColor = color;
                    body.style.color = getContrastTextColor(color);
                    pushRichSnapshot();
                    saveCurrentStateToMemory();
                }
            });
        });

        // 3. Custom Color Input
        const customColorInput = document.getElementById('shape-quick-color-input');
        if (customColorInput) {
            customColorInput.addEventListener('input', (e) => {
                if (!activeSelectedShape) return;
                const color = e.target.value;
                const body = activeSelectedShape.querySelector('.doc-shape-body');
                if (body) {
                    body.style.backgroundColor = color;
                    body.style.color = getContrastTextColor(color);
                    saveCurrentStateToMemory(false);
                }
            });
            customColorInput.addEventListener('change', () => {
                pushRichSnapshot();
                saveCurrentStateToMemory();
            });
        }

        // 4. Border Toggle
        document.getElementById('btn-shape-toggle-border')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeSelectedShape) return;
            const body = activeSelectedShape.querySelector('.doc-shape-body');
            if (body) {
                pushRichSnapshot();
                if (body.style.border && body.style.border !== 'none') {
                    body.style.border = 'none';
                    showToast("Border removed");
                } else {
                    body.style.border = '2px solid var(--accent-color)';
                    showToast("Border added");
                }
                pushRichSnapshot();
                saveCurrentStateToMemory();
            }
        });

        // 4b. Add New Shape Button
        document.getElementById('btn-shape-add-new')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof openModal === 'function') {
                openModal('shape-modal');
            }
        });

        // 4c. Duplicate Shape Button
        document.getElementById('btn-shape-duplicate')?.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateSelectedShape();
        });

        // 5. Delete Shape Button
        document.getElementById('btn-shape-quick-delete')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeSelectedShape) return;
            pushRichSnapshot();
            activeSelectedShape.remove();
            deselectShape(activeSelectedShape);
            pushRichSnapshot();
            updateStats();
            saveCurrentStateToMemory();
            showToast("Shape removed");
        });
    }

    // Deselect shape when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.doc-shape-wrapper') && !e.target.closest('#shape-floating-toolbar')) {
            if (activeSelectedShape) {
                deselectShape(activeSelectedShape);
            }
        }
    });
}

function initShapeModalEvents() {
    let chosenShape = 'rectangle';
    let chosenColor = '#3b82f6';

    const shapeGrid = document.getElementById('shape-type-grid');
    if (shapeGrid) {
        shapeGrid.querySelectorAll('.shape-grid-item').forEach(item => {
            item.addEventListener('click', () => {
                shapeGrid.querySelectorAll('.shape-grid-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                chosenShape = item.dataset.shape || 'rectangle';
            });
        });
    }

    const swatches = document.getElementById('shape-color-swatches');
    if (swatches) {
        swatches.querySelectorAll('.shape-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                swatches.querySelectorAll('.shape-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                chosenColor = swatch.dataset.color || '#3b82f6';
                const customPicker = document.getElementById('shape-custom-color');
                if (customPicker) customPicker.value = chosenColor;
            });
        });

        const customPicker = document.getElementById('shape-custom-color');
        if (customPicker) {
            customPicker.addEventListener('input', (e) => {
                chosenColor = e.target.value;
                swatches.querySelectorAll('.shape-swatch').forEach(s => s.classList.remove('active'));
            });
        }
    }

    const confirmBtn = document.getElementById('btn-insert-shape-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const textInput = document.getElementById('shape-initial-text');
            const initialText = textInput ? textInput.value : 'Shape Text';
            closeModal('shape-modal');
            insertShape(chosenShape, chosenColor, initialText);
        });
    }

    const customShapeBtn = document.getElementById('btn-create-custom-shape');
    if (customShapeBtn) {
        customShapeBtn.addEventListener('click', () => {
            const w = document.getElementById('custom-shape-w')?.value || 150;
            const h = document.getElementById('custom-shape-h')?.value || 75;
            const radius = document.getElementById('custom-shape-radius')?.value || 12;
            const bw = document.getElementById('custom-shape-bw')?.value || 2;
            closeModal('shape-modal');
            insertCustomShape({ width: w, height: h, radius: radius, borderWidth: bw, color: chosenColor });
        });
    }
}

/* ==========================================================================
   12. Floating Image Management & Cropping Toolset
   ========================================================================== */

let activeSelectedImage = null;
let targetCropImage = null;

function initImageInteractions() {
    const editor = document.getElementById('rich-editor');
    const toolbar = document.getElementById('image-floating-toolbar');
    if (!editor || !toolbar) return;

    editor.querySelectorAll('img').forEach(img => {
        if (img.dataset.imgManaged) return;
        img.dataset.imgManaged = 'true';

        img.addEventListener('click', (e) => {
            e.stopPropagation();
            selectImageForManagement(img);
        });
    });

    if (toolbar.dataset.eventsBound) return;
    toolbar.dataset.eventsBound = 'true';

    // Crop button
    document.getElementById('img-tool-crop')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeSelectedImage) {
            openImageCropModal(activeSelectedImage);
        }
    });

    // Increase / Decrease Size
    document.getElementById('img-tool-smaller')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!activeSelectedImage) return;
        pushRichSnapshot();
        const editorWidth = document.getElementById('rich-editor').clientWidth || 800;
        const curWidth = activeSelectedImage.clientWidth;
        let curPercent = Math.round((curWidth / editorWidth) * 100);
        let newPercent = Math.max(15, curPercent - 15);
        activeSelectedImage.style.width = `${newPercent}%`;
        activeSelectedImage.style.maxWidth = '100%';
        activeSelectedImage.style.height = 'auto';
        pushRichSnapshot();
        positionImageToolbar(activeSelectedImage);
        saveCurrentStateToMemory();
        showToast(`Image resized to ${newPercent}%`);
    });

    document.getElementById('img-tool-bigger')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!activeSelectedImage) return;
        pushRichSnapshot();
        const editorWidth = document.getElementById('rich-editor').clientWidth || 800;
        const curWidth = activeSelectedImage.clientWidth;
        let curPercent = Math.round((curWidth / editorWidth) * 100);
        let newPercent = Math.min(100, curPercent + 15);
        activeSelectedImage.style.width = `${newPercent}%`;
        activeSelectedImage.style.maxWidth = '100%';
        activeSelectedImage.style.height = 'auto';
        pushRichSnapshot();
        positionImageToolbar(activeSelectedImage);
        saveCurrentStateToMemory();
        showToast(`Image resized to ${newPercent}%`);
    });

    // Width presets
    toolbar.querySelectorAll('[data-img-size]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeSelectedImage) return;
            pushRichSnapshot();
            const sz = btn.dataset.imgSize;
            if (sz === 'auto') {
                activeSelectedImage.style.width = 'auto';
                activeSelectedImage.style.maxWidth = '100%';
            } else {
                activeSelectedImage.style.width = `${sz}%`;
            }
            activeSelectedImage.style.height = 'auto';
            pushRichSnapshot();
            positionImageToolbar(activeSelectedImage);
            saveCurrentStateToMemory();
            showToast(`Image resized to ${sz}%`);
        });
    });

    // Alignment
    toolbar.querySelectorAll('[data-img-align]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeSelectedImage) return;
            pushRichSnapshot();
            const align = btn.dataset.imgAlign;
            activeSelectedImage.style.display = 'block';
            if (align === 'left') {
                activeSelectedImage.style.margin = '8px auto 8px 0';
            } else if (align === 'center') {
                activeSelectedImage.style.margin = '8px auto';
            } else if (align === 'right') {
                activeSelectedImage.style.margin = '8px 0 8px auto';
            }
            pushRichSnapshot();
            positionImageToolbar(activeSelectedImage);
            saveCurrentStateToMemory();
            showToast(`Image aligned ${align}`);
        });
    });

    // Border & Shadow
    document.getElementById('img-tool-border')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!activeSelectedImage) return;
        pushRichSnapshot();
        activeSelectedImage.classList.toggle('img-bordered');
        pushRichSnapshot();
        saveCurrentStateToMemory();
        showToast("Image border toggled");
    });

    // Delete image
    document.getElementById('img-tool-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!activeSelectedImage) return;
        pushRichSnapshot();
        activeSelectedImage.remove();
        hideImageToolbar();
        pushRichSnapshot();
        saveCurrentStateToMemory();
        showToast("Image removed (Ctrl+Z to undo)");
    });

    // Deselect image when clicking away
    document.addEventListener('click', (e) => {
        if (!toolbar.contains(e.target) && e.target.tagName !== 'IMG') {
            hideImageToolbar();
        }
    });
}

function selectImageForManagement(img) {
    const editor = document.getElementById('rich-editor');
    const toolbar = document.getElementById('image-floating-toolbar');
    if (!toolbar || !editor) return;

    editor.querySelectorAll('img').forEach(i => i.classList.remove('selected-img'));
    img.classList.add('selected-img');
    activeSelectedImage = img;
    positionImageToolbar(img);
    toolbar.style.display = 'flex';
}

function positionImageToolbar(img) {
    const toolbar = document.getElementById('image-floating-toolbar');
    const container = document.getElementById('editor-area');
    if (!toolbar || !img || !container) return;

    const imgRect = img.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    let top = imgRect.top - contRect.top - 44;
    if (top < 10) top = imgRect.bottom - contRect.top + 8;
    let left = imgRect.left - contRect.left + (imgRect.width / 2) - 160;
    if (left < 10) left = 10;
    if (left + 320 > contRect.width) left = Math.max(10, contRect.width - 330);

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
}

function hideImageToolbar() {
    const toolbar = document.getElementById('image-floating-toolbar');
    if (toolbar) toolbar.style.display = 'none';
    if (activeSelectedImage) {
        activeSelectedImage.classList.remove('selected-img');
        activeSelectedImage = null;
    }
}

/* --- Image Crop Modal Controller --- */
let cropState = {
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    ratio: 'free'
};

function openImageCropModal(img) {
    if (!img) return;
    targetCropImage = img;
    const cropImg = document.getElementById('crop-source-img');
    const modal = document.getElementById('crop-modal');
    if (!cropImg || !modal) return;

    cropImg.onload = () => {
        initCropBoxPosition();
    };
    cropImg.src = img.src;
    openModal('crop-modal');
    setTimeout(initCropBoxPosition, 80);
}

function initCropBoxPosition() {
    const cropImg = document.getElementById('crop-source-img');
    const cropBox = document.getElementById('crop-box');
    const stage = document.getElementById('crop-stage-wrapper');
    if (!cropImg || !cropBox || !stage) return;

    const imgRect = cropImg.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    const imgLeft = imgRect.left - stageRect.left;
    const imgTop = imgRect.top - stageRect.top;
    const imgW = imgRect.width;
    const imgH = imgRect.height;

    if (imgW <= 0 || imgH <= 0) return;

    // Default crop box: 80% centered inside the image
    cropState.w = Math.round(imgW * 0.8);
    cropState.h = Math.round(imgH * 0.8);
    cropState.x = Math.round(imgLeft + (imgW - cropState.w) / 2);
    cropState.y = Math.round(imgTop + (imgH - cropState.h) / 2);

    updateCropBoxDOM();
    initCropBoxDragHandlers();
}

function updateCropBoxDOM() {
    const cropBox = document.getElementById('crop-box');
    if (!cropBox) return;
    cropBox.style.left = `${cropState.x}px`;
    cropBox.style.top = `${cropState.y}px`;
    cropBox.style.width = `${cropState.w}px`;
    cropBox.style.height = `${cropState.h}px`;
}

function initCropBoxDragHandlers() {
    const cropBox = document.getElementById('crop-box');
    const cropImg = document.getElementById('crop-source-img');
    const stage = document.getElementById('crop-stage-wrapper');
    if (!cropBox || !cropImg || !stage || cropBox.dataset.dragAttached) return;
    cropBox.dataset.dragAttached = 'true';

    let activeDrag = null; // 'move' or handle name
    let startMouseX = 0, startMouseY = 0;
    let startState = null;

    const onStart = (e, mode) => {
        e.preventDefault();
        e.stopPropagation();
        activeDrag = mode;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        startMouseX = cx;
        startMouseY = cy;
        startState = { ...cropState };

        const onMove = (ev) => {
            if (!activeDrag) return;
            if (ev.cancelable) ev.preventDefault();
            const curX = ev.touches ? ev.touches[0].clientX : ev.clientX;
            const curY = ev.touches ? ev.touches[0].clientY : ev.clientY;
            const dx = curX - startMouseX;
            const dy = curY - startMouseY;

            const imgRect = cropImg.getBoundingClientRect();
            const stageRect = stage.getBoundingClientRect();
            const minX = imgRect.left - stageRect.left;
            const minY = imgRect.top - stageRect.top;
            const maxX = minX + imgRect.width;
            const maxY = minY + imgRect.height;

            if (activeDrag === 'move') {
                cropState.x = Math.max(minX, Math.min(maxX - startState.w, startState.x + dx));
                cropState.y = Math.max(minY, Math.min(maxY - startState.h, startState.y + dy));
            } else {
                let newX = startState.x;
                let newY = startState.y;
                let newW = startState.w;
                let newH = startState.h;

                if (activeDrag.includes('r')) newW = Math.max(30, Math.min(maxX - startState.x, startState.w + dx));
                if (activeDrag.includes('b')) newH = Math.max(30, Math.min(maxY - startState.y, startState.h + dy));
                if (activeDrag.includes('l')) {
                    const candidateX = Math.max(minX, Math.min(startState.x + startState.w - 30, startState.x + dx));
                    newW = (startState.x + startState.w) - candidateX;
                    newX = candidateX;
                }
                if (activeDrag.includes('t')) {
                    const candidateY = Math.max(minY, Math.min(startState.y + startState.h - 30, startState.y + dy));
                    newH = (startState.y + startState.h) - candidateY;
                    newY = candidateY;
                }

                if (cropState.ratio === '1:1') {
                    const side = Math.min(newW, newH);
                    newW = side;
                    newH = side;
                } else if (cropState.ratio === '4:3') {
                    newH = Math.round(newW * 0.75);
                } else if (cropState.ratio === '16:9') {
                    newH = Math.round(newW * (9 / 16));
                }

                cropState.x = newX;
                cropState.y = newY;
                cropState.w = newW;
                cropState.h = newH;
            }
            updateCropBoxDOM();
        };

        const onEnd = () => {
            activeDrag = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    };

    cropBox.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('crop-handle')) {
            onStart(e, 'move');
        }
    });
    cropBox.addEventListener('touchstart', (e) => {
        if (!e.target.classList.contains('crop-handle')) {
            onStart(e, 'move');
        }
    }, { passive: false });

    cropBox.querySelectorAll('.crop-handle').forEach(handle => {
        const hName = handle.dataset.handle;
        handle.addEventListener('mousedown', (e) => onStart(e, hName));
        handle.addEventListener('touchstart', (e) => onStart(e, hName), { passive: false });
    });
}

function initCropModalEvents() {
    document.querySelectorAll('[data-crop-ratio]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-crop-ratio]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            cropState.ratio = btn.dataset.cropRatio || 'free';
            initCropBoxPosition();
        });
    });

    document.getElementById('btn-crop-reset')?.addEventListener('click', () => {
        initCropBoxPosition();
    });

    document.getElementById('btn-apply-crop')?.addEventListener('click', () => {
        applyImageCrop();
    });
}

function applyImageCrop() {
    if (!targetCropImage) return;
    const cropImg = document.getElementById('crop-source-img');
    const cropBox = document.getElementById('crop-box');
    const stage = document.getElementById('crop-stage-wrapper');
    if (!cropImg || !cropBox || !stage) return;

    const imgRect = cropImg.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    const imgLeft = imgRect.left - stageRect.left;
    const imgTop = imgRect.top - stageRect.top;

    const scaleX = cropImg.naturalWidth / imgRect.width;
    const scaleY = cropImg.naturalHeight / imgRect.height;

    const relX = cropState.x - imgLeft;
    const relY = cropState.y - imgTop;

    const sx = Math.max(0, Math.round(relX * scaleX));
    const sy = Math.max(0, Math.round(relY * scaleY));
    const sw = Math.min(cropImg.naturalWidth - sx, Math.round(cropState.w * scaleX));
    const sh = Math.min(cropImg.naturalHeight - sy, Math.round(cropState.h * scaleY));

    if (sw <= 10 || sh <= 10) {
        showToast("Crop area is too small");
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cropImg, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedDataUrl = canvas.toDataURL('image/png');

    pushRichSnapshot();
    targetCropImage.src = croppedDataUrl;
    targetCropImage.style.maxWidth = '100%';
    targetCropImage.style.height = 'auto';
    pushRichSnapshot();

    closeModal('crop-modal');
    saveCurrentStateToMemory();
    positionImageToolbar(targetCropImage);
    showToast("Image cropped successfully (Ctrl+Z to undo)");
}

// --- Dedicated Clean Document Printing ---

function hideAllFloatingToolbars() {
    const tableTb = document.getElementById('table-floating-toolbar');
    if (tableTb) tableTb.style.display = 'none';

    const shapeTb = document.getElementById('shape-floating-toolbar');
    if (shapeTb) shapeTb.style.display = 'none';

    const imgTb = document.getElementById('image-floating-toolbar');
    if (imgTb) imgTb.style.display = 'none';

    const selContainer = document.getElementById('mobile-selector-container');
    if (selContainer) selContainer.style.display = 'none';

    document.querySelectorAll('.doc-shape-wrapper.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.table-selected').forEach(el => el.classList.remove('table-selected'));
}

function openPrintSetupModal() {
    if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
    hideAllFloatingToolbars();

    // Pre-populate Print Setup modal with current paper size, margin and orientation
    const toolPaperSize = document.getElementById('tool-paper-size');
    const toolMargin = document.getElementById('tool-margin-select');
    const printSizeSelect = document.getElementById('print-paper-size');
    const printMarginSelect = document.getElementById('print-paper-margin');
    const printOrientSelect = document.getElementById('print-paper-orient');

    if (printSizeSelect && toolPaperSize) {
        printSizeSelect.value = toolPaperSize.value || 'letter';
    }
    if (printMarginSelect && toolMargin) {
        printMarginSelect.value = toolMargin.value || 'normal';
    }
    if (printOrientSelect) {
        const richEd = document.getElementById('rich-editor');
        const isLandscape = richEd && richEd.classList.contains('landscape-mode');
        printOrientSelect.value = isLandscape ? 'landscape' : 'portrait';
    }

    if (typeof openModal === 'function') {
        openModal('print-setup-modal');
    } else {
        executeDirectPrint();
    }
}

function printDocument() {
    openPrintSetupModal();
}

function executeDirectPrint(paperSize = 'a4', margin = 'normal', orientation = 'portrait') {
    if (typeof closeAllModals === 'function') closeAllModals();
    if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
    hideAllFloatingToolbars();

    // Sync plain editor text into plain-print-mirror for multi-page printing in plain mode
    const plainEd = document.getElementById('plain-editor');
    const mirror = document.getElementById('plain-print-mirror');
    if (plainEd && mirror) {
        mirror.textContent = plainEd.value;
    }

    // 1. Apply chosen paper size and margin to the editor
    if (typeof changePaperSize === 'function') changePaperSize(paperSize);
    if (typeof changeMargin === 'function') changeMargin(margin);

    // 2. Set dynamic @page CSS rule for browser print engine with strict 0mm margin to suppress header/footer
    let pageCssSize = paperSize.toUpperCase();
    if (paperSize === 'letter' || paperSize === 'legal' || paperSize === 'executive') {
        pageCssSize = paperSize;
    }
    let marginCss = '1in';
    if (margin === 'narrow') marginCss = '0.5in';
    else if (margin === 'moderate') marginCss = '1in 0.75in';
    else if (margin === 'wide') marginCss = '1in 1.5in';
    else if (margin === 'none') marginCss = '0mm';

    let printStyleEl = document.getElementById('dynamic-print-page-style');
    if (!printStyleEl) {
        printStyleEl = document.createElement('style');
        printStyleEl.id = 'dynamic-print-page-style';
        document.head.appendChild(printStyleEl);
    }
    printStyleEl.innerHTML = `
        @page {
            size: ${pageCssSize} ${orientation} !important;
            margin: 0mm !important; /* Zero margin completely suppresses browser default header (file name) and footer (date & time, URL, page #) */
        }
        @media print {
            body {
                margin: 0 !important;
                padding: ${margin === 'none' ? '0mm' : marginCss} !important;
                box-sizing: border-box !important;
            }
        }
    `;

    // 3. Clear document.title so browser headers do not print file name or application name
    const originalTitle = document.title;
    document.title = "";

    document.body.classList.add('is-printing');

    const cleanUpAfterPrint = () => {
        document.title = originalTitle;
        document.body.classList.remove('is-printing');
        window.removeEventListener('afterprint', cleanUpAfterPrint);
    };
    window.addEventListener('afterprint', cleanUpAfterPrint, { once: true });

    setTimeout(() => {
        window.print();
        setTimeout(cleanUpAfterPrint, 1500);
    }, 80);
}

// --- Office Ribbon Extensions (Duplicate, Select All, Clear, Watermark, Columns, Margins, TTS, Fullscreen) ---

function duplicateCurrentFile() {
    if (typeof saveCurrentStateToMemory === 'function') saveCurrentStateToMemory();
    const cur = AppState.files.find(f => f.id === AppState.currentFileId);
    if (!cur) return;
    const baseName = cur.name.replace(/(\.[^.]+)$/, ' - Copy$1');
    const copyName = typeof getUniqueFileName === 'function'
        ? getUniqueFileName(baseName === cur.name ? cur.name + ' - Copy' : baseName)
        : cur.name + ' - Copy';
    addFileToSystem(copyName, cur.content, cur.isRichText, false, false);
    showToast(`Duplicated document as ${copyName}`);
}

function selectAllText() {
    if (AppState.isRichTextMode) {
        const richEditor = document.getElementById('rich-editor');
        if (!richEditor) return;
        richEditor.focus();
        const range = document.createRange();
        range.selectNodeContents(richEditor);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        const plainEditor = document.getElementById('plain-editor');
        if (!plainEditor) return;
        plainEditor.focus();
        plainEditor.select();
    }
    showToast("Selected all text");
}

function clearEditorContent() {
    if (AppState.isRichTextMode) {
        pushRichSnapshot();
        const richEditor = document.getElementById('rich-editor');
        if (richEditor) richEditor.innerHTML = '';
        pushRichSnapshot();
    } else {
        const plainEditor = document.getElementById('plain-editor');
        if (plainEditor) {
            pushHistory(plainEditor.value);
            plainEditor.value = '';
            pushHistory('');
        }
    }
    saveCurrentStateToMemory();
    updateStats();
    showToast("Cleared document content");
}

function isCaretInCodeBlock() {
    if (!AppState.isRichTextMode) return null;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    let node = sel.anchorNode;
    const richEditor = document.getElementById('rich-editor');
    while (node && node !== richEditor) {
        if (node.nodeName === 'PRE' || node.nodeName === 'CODE' || (node.classList && (node.classList.contains('code-block-snippet') || node.classList.contains('code-block-container')))) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

function exitCodeBlock(codeElement) {
    if (!codeElement) {
        codeElement = isCaretInCodeBlock();
    }
    if (!codeElement) return false;

    // Find the topmost code block container or pre tag inside rich-editor
    let topBlock = codeElement;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return false;

    while (topBlock.parentNode && topBlock.parentNode !== richEditor && 
           (topBlock.parentNode.nodeName === 'PRE' || (topBlock.parentNode.classList && (topBlock.parentNode.classList.contains('code-block-container') || topBlock.parentNode.classList.contains('code-block-snippet'))))) {
        topBlock = topBlock.parentNode;
    }

    // Check if next sibling is a writable paragraph
    let nextEl = topBlock.nextSibling;
    while (nextEl && nextEl.nodeType === Node.TEXT_NODE && !nextEl.textContent.trim()) {
        nextEl = nextEl.nextSibling;
    }

    let targetP;
    if (nextEl && (nextEl.nodeName === 'P' || nextEl.nodeName === 'DIV')) {
        targetP = nextEl;
    } else {
        targetP = document.createElement('p');
        targetP.innerHTML = '<br>';
        if (topBlock.nextSibling) {
            topBlock.parentNode.insertBefore(targetP, topBlock.nextSibling);
        } else {
            topBlock.parentNode.appendChild(targetP);
        }
    }

    // Move caret smoothly inside targetP
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(targetP, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    targetP.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    richEditor.focus();

    pushRichSnapshot();
    saveCurrentStateToMemory();
    showToast("Exited code block — ready to type text below");
    return true;
}

function insertCodeBlock() {
    if (AppState.isRichTextMode) {
        // If caret is already inside a code block, clicking "Code" exits it cleanly!
        const existingCodeBlock = isCaretInCodeBlock();
        if (existingCodeBlock) {
            exitCodeBlock(existingCodeBlock);
            return;
        }

        pushRichSnapshot();
        const richEditor = document.getElementById('rich-editor');
        if (!richEditor) return;
        richEditor.focus();

        const container = document.createElement('div');
        container.className = 'code-block-container';

        const pre = document.createElement('pre');
        pre.className = 'code-block-snippet';
        const code = document.createElement('code');
        code.textContent = '// Paste or type code here\n';
        pre.appendChild(code);
        container.appendChild(pre);

        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.className = 'btn-exit-code-block';
        exitBtn.setAttribute('contenteditable', 'false');
        exitBtn.textContent = 'Exit Code Block ↵';
        exitBtn.title = 'Click to exit code block and type normal text below (or press Shift+Enter)';
        container.appendChild(exitBtn);

        const p = document.createElement('p');
        p.innerHTML = '<br>';

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && richEditor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(p);
            range.insertNode(container);
            // Place caret inside code element
            range.setStart(code, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            richEditor.appendChild(container);
            richEditor.appendChild(p);
            const range = document.createRange();
            range.setStart(code, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        pushRichSnapshot();
        saveCurrentStateToMemory();
        showToast("Code block inserted (Click 'Exit Code Block' or press Shift+Enter to exit)");
    } else {
        handlePlainTextFormat('codeBlock');
    }
}

function toggleWatermark() {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const editorArea = document.getElementById('editor-area');
    let wmEl = document.getElementById('document-watermark');
    const wmBtn = document.getElementById('tool-watermark');
    if (!richEditor) return;

    if (!wmEl && editorArea) {
        wmEl = document.createElement('div');
        wmEl.id = 'document-watermark';
        wmEl.className = 'document-watermark';
        wmEl.setAttribute('aria-hidden', 'true');
        editorArea.appendChild(wmEl);
    }

    const isWatermarked = document.body.classList.contains('watermarked') || 
                          richEditor.classList.contains('watermarked') || 
                          (editorArea && editorArea.classList.contains('watermarked')) ||
                          (wmEl && wmEl.style.display !== 'none' && wmEl.textContent.trim().length > 0);

    const currentText = (wmEl && wmEl.textContent.trim()) || 
                        richEditor.getAttribute('data-watermark') || 
                        "CONFIDENTIAL";

    if (isWatermarked) {
        document.body.classList.remove('watermarked');
        richEditor.classList.remove('watermarked');
        if (plainEditor) plainEditor.classList.remove('watermarked');
        if (editorArea) editorArea.classList.remove('watermarked');
        richEditor.removeAttribute('data-watermark');
        if (plainEditor) plainEditor.removeAttribute('data-watermark');
        if (editorArea) editorArea.removeAttribute('data-watermark');
        if (wmEl) {
            wmEl.textContent = '';
            wmEl.style.display = 'none';
        }
        if (wmBtn) wmBtn.classList.remove('active');
        saveCurrentStateToMemory();
        showToast("Watermark removed");
    } else {
        const applyText = (text) => {
            const wm = (text || "").trim();
            if (!wm) {
                showToast("Watermark cancelled");
                return;
            }
            const upperWm = wm.toUpperCase();
            document.body.classList.add('watermarked');
            richEditor.classList.add('watermarked');
            if (plainEditor) plainEditor.classList.add('watermarked');
            if (editorArea) editorArea.classList.add('watermarked');
            richEditor.setAttribute('data-watermark', upperWm);
            if (plainEditor) plainEditor.setAttribute('data-watermark', upperWm);
            if (editorArea) editorArea.setAttribute('data-watermark', upperWm);

            if (wmEl) {
                wmEl.textContent = upperWm;
                wmEl.style.display = 'block';
            }
            if (wmBtn) wmBtn.classList.add('active');
            saveCurrentStateToMemory();
            showToast(`Watermark applied: "${upperWm}"`);
        };

        if (typeof showCustomPrompt === 'function') {
            showCustomPrompt("Enter Watermark Text / Name", currentText, applyText);
        } else {
            const wm = (prompt("Enter Watermark Text / Name:", currentText) || "").trim();
            if (wm) applyText(wm);
        }
    }
}

function toggleColumns() {
    // Prompt/ask user first how many columns they want
    if (typeof openModal === 'function') {
        openModal('columns-modal');
    }
}

function applyColumns(num) {
    num = parseInt(num, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 6) num = 6;

    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const colBtn = document.getElementById('tool-layout-columns');

    if (num <= 1) {
        if (richEditor) {
            // Restore independent columns to flat structure
            const existingContainer = richEditor.querySelector('.doc-columns-container');
            if (existingContainer) {
                const cells = existingContainer.querySelectorAll('.doc-column-cell');
                const fragment = document.createDocumentFragment();
                cells.forEach(cell => {
                    while (cell.firstChild) {
                        fragment.appendChild(cell.firstChild);
                    }
                });
                existingContainer.parentNode.replaceChild(fragment, existingContainer);
            }
            richEditor.style.columnCount = '';
            richEditor.style.columnGap = '';
            richEditor.style.columnRule = '';
            richEditor.classList.remove('two-columns', 'three-columns', 'multi-columns');
        }
        if (plainEditor) {
            plainEditor.style.columnCount = '';
            plainEditor.classList.remove('two-columns', 'three-columns', 'multi-columns');
        }
        if (colBtn) colBtn.classList.remove('active');
        showToast("Single column layout restored (1 column)");
    } else {
        if (richEditor) {
            // Clean up legacy CSS column count
            richEditor.style.columnCount = '';
            richEditor.style.columnGap = '';
            richEditor.style.columnRule = '';
            richEditor.classList.remove('two-columns', 'three-columns', 'multi-columns');

            // If there's an existing columns container, unwrap it first so we can re-divide
            const existingContainer = richEditor.querySelector('.doc-columns-container');
            if (existingContainer) {
                const cells = existingContainer.querySelectorAll('.doc-column-cell');
                const fragment = document.createDocumentFragment();
                cells.forEach(cell => {
                    while (cell.firstChild) {
                        fragment.appendChild(cell.firstChild);
                    }
                });
                existingContainer.parentNode.replaceChild(fragment, existingContainer);
            }

            // Gather existing top-level blocks or child elements
            const existingNodes = Array.from(richEditor.childNodes).filter(node => {
                if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return false;
                return true;
            });

            const cellContents = [];
            for (let i = 0; i < num; i++) {
                cellContents.push([]);
            }

            if (existingNodes.length > 0) {
                // Distribute existing content across columns
                const chunkSize = Math.max(1, Math.ceil(existingNodes.length / num));
                existingNodes.forEach((node, idx) => {
                    const targetCol = Math.min(num - 1, Math.floor(idx / chunkSize));
                    cellContents[targetCol].push(node);
                });
            }

            const container = document.createElement('div');
            container.className = `doc-columns-container cols-${num}`;
            container.setAttribute('data-columns', num);
            container.contentEditable = "true";

            for (let i = 0; i < num; i++) {
                if (i > 0) {
                    const divider = document.createElement('div');
                    divider.className = 'doc-column-divider';
                    divider.contentEditable = "false";
                    divider.setAttribute('aria-hidden', 'true');
                    container.appendChild(divider);
                }
                const cell = document.createElement('div');
                cell.className = 'doc-column-cell';
                cell.contentEditable = "true";
                cell.setAttribute('spellcheck', 'true');
                cell.setAttribute('data-col-index', i + 1);

                if (cellContents[i] && cellContents[i].length > 0) {
                    cellContents[i].forEach(n => cell.appendChild(n));
                } else {
                    cell.innerHTML = `<p>Type here in Column ${i + 1}...</p>`;
                }

                // Click to focus cell directly
                if (typeof cell.addEventListener === 'function') {
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        cell.focus();
                    });

                    // Prevent backspace at start of cell from deleting the cell or merging columns
                    cell.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace') {
                            const sel = window.getSelection();
                            if (sel && sel.isCollapsed && sel.anchorOffset === 0) {
                                if (sel.anchorNode === cell || sel.anchorNode === cell.firstElementChild || (sel.anchorNode.parentNode === cell && sel.anchorNode === cell.firstChild)) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }
                        }
                    });
                }

                container.appendChild(cell);
            }

            richEditor.innerHTML = '';
            richEditor.appendChild(container);

            // Focus the first column cell
            const firstCell = container.querySelector('.doc-column-cell');
            if (firstCell) {
                setTimeout(() => {
                    firstCell.focus();
                    const p = firstCell.querySelector('p');
                    if (p) {
                        const range = document.createRange();
                        range.selectNodeContents(p);
                        range.collapse(false);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }, 50);
            }
        }

        if (plainEditor) {
            plainEditor.style.columnCount = num;
            plainEditor.classList.add('multi-columns');
        }
        if (colBtn) colBtn.classList.add('active');
        showToast(`Page divided into ${num} independent columns`);
    }
    if (typeof closeModal === 'function') {
        closeModal('columns-modal');
    }
    saveCurrentStateToMemory();
}

function changePaperSize(val) {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const paperSelect = document.getElementById('tool-paper-size');
    if (paperSelect && val && paperSelect.value !== val) {
        paperSelect.value = val;
    }
    const valClean = (val || (paperSelect ? paperSelect.value : 'a4')).toLowerCase();
    
    const paperClasses = ['paper-letter', 'paper-a4', 'paper-legal', 'paper-a3', 'paper-a5', 'paper-executive', 'paper-full'];
    
    if (richEditor) {
        paperClasses.forEach(c => richEditor.classList.remove(c));
        richEditor.classList.add(`paper-${valClean}`);
    }
    if (plainEditor) {
        paperClasses.forEach(c => plainEditor.classList.remove(c));
        plainEditor.classList.add(`paper-${valClean}`);
    }
    
    const labels = {
        letter: 'Letter (8.5" × 11")',
        a4: 'A4 (210 × 297 mm)',
        legal: 'Legal (8.5" × 14")',
        a3: 'A3 (297 × 420 mm)',
        a5: 'A5 (148 × 210 mm)',
        executive: 'Executive (7.25" × 10.5")',
        full: 'Full Width (Window)'
    };
    showToast(`Paper size: ${labels[valClean] || valClean}`);
    saveCurrentStateToMemory();
}

function toggleOrientation() {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const orientBtn = document.getElementById('tool-layout-orientation');
    if (!richEditor) return;

    const isLandscape = richEditor.classList.contains('landscape-mode');
    if (isLandscape) {
        richEditor.classList.remove('landscape-mode');
        if (plainEditor) plainEditor.classList.remove('landscape-mode');
        document.body.classList.remove('is-landscape');
        if (orientBtn) orientBtn.classList.remove('active');
        showToast("Orientation: Portrait");
    } else {
        richEditor.classList.add('landscape-mode');
        if (plainEditor) plainEditor.classList.add('landscape-mode');
        document.body.classList.add('is-landscape');
        if (orientBtn) orientBtn.classList.add('active');
        showToast("Orientation: Landscape");
    }
}

// --- Animated GIF System (Curated + Live Tenor/GIPHY with Auto-Update) ---
var CURATED_GIFS = {
    trending: [
        { title: "Dancing Cat", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
        { title: "Popcorn Celebration", url: "https://media.giphy.com/media/GLbiGvv9RiNpdpAAax/giphy.gif" },
        { title: "Excited Minion", url: "https://media.giphy.com/media/oF5oUYTOhvvcOcxTbK/giphy.gif" },
        { title: "Clapping Leonardo", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
        { title: "Happy Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
        { title: "Thumbs Up Kid", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
        { title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
        { title: "Party Parrot", url: "https://media.giphy.com/media/l3q2wJsC23ikJg9xe/giphy.gif" }
    ],
    reactions: [
        { title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
        { title: "Shocked Face", url: "https://media.giphy.com/media/tfUW8mhiFk8NlNuSmX/giphy.gif" },
        { title: "Wow Excited", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
        { title: "Confused Travolta", url: "https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif" },
        { title: "Nodding Yes", url: "https://media.giphy.com/media/NEvPzZ8bd1V4Y/giphy.gif" },
        { title: "Facepalm", url: "https://media.giphy.com/media/3og0INyCmHlNylks9n/giphy.gif" }
    ],
    celebrate: [
        { title: "Party Confetti", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
        { title: "Victory Celebration", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
        { title: "Champagne Toast", url: "https://media.giphy.com/media/Zw3oBUuIg23Ls16pUx/giphy.gif" },
        { title: "Balloons & Cheers", url: "https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif" },
        { title: "Fireworks", url: "https://media.giphy.com/media/peAFQfg7Ol6IE/giphy.gif" }
    ],
    funny: [
        { title: "Laughing Out Loud", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif" },
        { title: "Kangaroo Dance", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
        { title: "Dog Smile", url: "https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif" },
        { title: "Cat Keyboard", url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif" },
        { title: "Silly Face", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" }
    ],
    dancing: [
        { title: "Happy Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
        { title: "Carlton Dance", url: "https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif" },
        { title: "Groovy Disco", url: "https://media.giphy.com/media/14qb1Uhf40ndw4/giphy.gif" },
        { title: "Robot Dance", url: "https://media.giphy.com/media/cklPOHnHepdwBLRnQ3/giphy.gif" }
    ],
    thumbsup: [
        { title: "Thumbs Up Kid", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
        { title: "Great Job", url: "https://media.giphy.com/media/GCvktC0KFy9l6/giphy.gif" },
        { title: "Double Thumbs Up", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
        { title: "Cool Approval", url: "https://media.giphy.com/media/diUKszNTUghVe/giphy.gif" }
    ],
    love: [
        { title: "Heart Love", url: "https://media.giphy.com/media/26FLdmG4ALHNRxijC/giphy.gif" },
        { title: "Blowing Kisses", url: "https://media.giphy.com/media/3oEjI4sFlIEZOqmNiM/giphy.gif" },
        { title: "Cute Bear Hug", url: "https://media.giphy.com/media/VbawWIGNtKYwOFXF7U/giphy.gif" }
    ],
    animals: [
        { title: "Cute Kitten", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
        { title: "Happy Puppy", url: "https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif" },
        { title: "Panda Roll", url: "https://media.giphy.com/media/EatwJZRUIv41G/giphy.gif" },
        { title: "Dancing Otter", url: "https://media.giphy.com/media/3xz2BCe5jn2j4OM9ZS/giphy.gif" }
    ]
};

if (typeof window !== 'undefined') {
    window.CURATED_GIFS = CURATED_GIFS;
}

let currentGifCategory = 'trending';

function renderGifList(gifs) {
    const grid = document.getElementById('gif-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!gifs || gifs.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--text-secondary);">No animated GIFs found. Try another search.</div>';
        return;
    }
    gifs.forEach(g => {
        const card = document.createElement('div');
        card.className = 'gif-card';
        card.dataset.gifUrl = g.url;
        card.dataset.gifTitle = g.title || 'GIF';
        card.innerHTML = `<img src="${g.url}" alt="${g.title || 'GIF'}" loading="lazy"><span class="gif-title">${g.title || 'GIF'}</span>`;
        card.onclick = () => insertAnimatedGif(g.url, g.title);
        grid.appendChild(card);
    });
}

async function loadGifs(category = 'trending', query = '', isRefresh = false) {
    currentGifCategory = category;
    const grid = document.getElementById('gif-grid');
    const statusText = document.getElementById('gif-status-text');
    if (statusText) statusText.textContent = "Loading fresh animated GIFs...";

    // Determine query or category
    const searchTerm = query.trim() || category;
    
    // First render curated list immediately for zero delay
    let fallbackList = CURATED_GIFS[category] || CURATED_GIFS.trending;
    if (query.trim()) {
        const qLower = query.toLowerCase();
        const matched = [];
        Object.values(CURATED_GIFS).flat().forEach(item => {
            if (item.title.toLowerCase().includes(qLower) && !matched.some(m => m.url === item.url)) {
                matched.push(item);
            }
        });
        if (matched.length > 0) fallbackList = matched;
    }
    if (isRefresh) {
        // Shuffle fallback list for freshness
        fallbackList = [...fallbackList].sort(() => Math.random() - 0.5);
    }
    renderGifList(fallbackList);

    // Fetch live animated GIFs from internet (GIPHY live API)
    try {
        const apiKey = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';
        const isTrending = (!query.trim() && (category === 'trending' || !category));
        const apiUrl = isTrending
            ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`
            : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchTerm)}&limit=24&rating=g`;

        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            if (data && data.data && data.data.length > 0) {
                const liveGifs = data.data.map(item => {
                    const imgObj = (item.images && (item.images.fixed_height || item.images.downsized || item.images.original)) || {};
                    return {
                        title: item.title ? item.title.replace(/\s*GIF.*$/i, '') : searchTerm,
                        url: imgObj.url || ''
                    };
                }).filter(g => Boolean(g.url));

                if (liveGifs.length > 0) {
                    renderGifList(liveGifs);
                    if (statusText) statusText.textContent = `Showing live internet GIFs for "${searchTerm}" • Click to insert`;
                    return;
                }
            }
        }
    } catch (err) {
        console.warn("Internet GIF search fallback to curated:", err);
    }
    if (statusText) statusText.textContent = `Showing GIFs for "${searchTerm}" • Click to insert`;
}

function insertAnimatedGif(url, title) {
    if (!url) return;
    if (AppState.isRichTextMode) {
        if (typeof restoreEditorSelection === 'function') restoreEditorSelection(true);
        const id = 'gif-' + Date.now();
        const html = `<p><img src="${url}" alt="${title || 'Animated GIF'}" class="editor-gif" id="${id}" style="max-width:320px; border-radius:8px; display:block; margin:12px auto; box-shadow:0 4px 14px rgba(0,0,0,0.15);" /></p><p><br></p>`;
        formatDoc('insertHTML', html);
        pushRichSnapshot();
        saveCurrentStateToMemory();
    } else {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const s = ed.selectionStart;
            const text = `\n![${title || 'Animated GIF'}](${url})\n`;
            ed.value = ed.value.substring(0, s) + text + ed.value.substring(ed.selectionEnd);
            ed.selectionStart = ed.selectionEnd = s + text.length;
            pushHistory(ed.value);
            saveCurrentStateToMemory();
        }
    }
    if (typeof closeModal === 'function') {
        closeModal('gif-modal');
    }
    showToast("Animated GIF inserted!");
}

function toggleTextDirection() {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    if (!richEditor) return;
    const currentDir = richEditor.getAttribute('dir') || 'ltr';
    const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
    richEditor.setAttribute('dir', newDir);
    if (plainEditor) plainEditor.setAttribute('dir', newDir);
    showToast(`Text direction: ${newDir.toUpperCase()}`);
}

function changeMargin(val) {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const marginSelect = document.getElementById('tool-margin-select');
    if (marginSelect && val && marginSelect.value !== val) {
        marginSelect.value = val;
    }
    const valClean = (val || (marginSelect ? marginSelect.value : 'normal')).toLowerCase();
    
    const marginClasses = ['margin-normal', 'margin-narrow', 'margin-moderate', 'margin-wide', 'margin-none', 'margin-zero'];
    
    if (richEditor) {
        marginClasses.forEach(c => richEditor.classList.remove(c));
        richEditor.classList.add(`margin-${valClean}`);
    }
    if (plainEditor) {
        marginClasses.forEach(c => plainEditor.classList.remove(c));
        plainEditor.classList.add(`margin-${valClean}`);
    }
    
    const labels = {
        normal: 'Normal (1")',
        narrow: 'Narrow (0.5")',
        moderate: 'Moderate (0.75")',
        wide: 'Wide (1.5")',
        none: 'None (0")'
    };
    showToast(`Margins set to ${labels[valClean] || valClean}`);
    saveCurrentStateToMemory();
}

function changeEditorZoom(scale) {
    let num = parseInt(scale) || 100;
    num = Math.max(25, Math.min(800, num));
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    if (richEditor) richEditor.style.zoom = `${num}%`;
    if (plainEditor) plainEditor.style.zoom = `${num}%`;

    // Sync Settings ribbon dropdown
    const select = document.getElementById('tool-setting-zoom');
    if (select) {
        const exactOpt = select.querySelector(`option[value="${num}"]`);
        if (exactOpt) {
            select.value = String(num);
        }
    }

    // Sync Status Bar slider and label
    const slider = document.getElementById('status-zoom-slider');
    if (slider) slider.value = num;
    const valSpan = document.getElementById('status-zoom-val');
    if (valSpan) valSpan.textContent = `${num}%`;

    showToast(`Zoom: ${num}%`);
}

function readAloud() {
    if (!('speechSynthesis' in window)) {
        showToast("Text-to-speech is not supported in this browser");
        return;
    }
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        showToast("Speech stopped");
        return;
    }
    let text = '';
    if (AppState.isRichTextMode) {
        const sel = window.getSelection();
        text = (sel && !sel.isCollapsed) ? sel.toString().trim() : document.getElementById('rich-editor')?.innerText?.trim();
    } else {
        const ed = document.getElementById('plain-editor');
        if (ed) {
            const s = ed.selectionStart;
            const e = ed.selectionEnd;
            text = (s !== e) ? ed.value.substring(s, e).trim() : ed.value.trim();
        }
    }
    if (!text) {
        showToast("No text to read aloud");
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => showToast("Finished reading aloud");
    window.speechSynthesis.speak(utterance);
    showToast("Reading aloud... (click Read Aloud again to stop)");
}

function toggleFullscreen() {
    const isFull = document.body.classList.toggle('fullscreen-mode');
    if (isFull) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
        showToast("Fullscreen Focus Mode (Click Fullscreen or Esc to exit)");
    } else {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        showToast("Exited Fullscreen Mode");
    }
}

// --- Caret Color, Highlight & Reset Controller ---

function applyColorToSelectionRange(range, type, color) {
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor || !range || range.collapsed) return false;

    const sel = window.getSelection();
    if (sel) {
        try {
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {}
    }

    // Attempt browser execCommand with styleWithCSS
    let execSuccess = false;
    try {
        document.execCommand('styleWithCSS', false, true);
        if (type === 'foreColor') {
            execSuccess = document.execCommand('foreColor', false, color);
        } else {
            execSuccess = document.execCommand('hiliteColor', false, color);
            if (!execSuccess) {
                execSuccess = document.execCommand('backColor', false, color);
            }
        }
    } catch (e) {
        execSuccess = false;
    }

    // Verify if execCommand successfully colored the text in DOM
    const activeSel = window.getSelection();
    let hasApplied = false;
    if (execSuccess && activeSel && activeSel.rangeCount > 0) {
        const curRange = activeSel.getRangeAt(0);
        let container = curRange.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        if (container && richEditor.contains(container)) {
            if (type === 'foreColor' && (container.style.color || container.getAttribute('color'))) hasApplied = true;
            if (type === 'hiliteColor' && (container.style.backgroundColor || container.tagName === 'MARK')) hasApplied = true;
        }
    }

    // Direct DOM fallback if execCommand was not applied (e.g. while OS color picker holds focus)
    if (!hasApplied && range && !range.collapsed) {
        try {
            const fragment = range.extractContents();
            function cleanInner(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (type === 'foreColor') {
                        node.style.color = '';
                        if (node.tagName === 'FONT') node.removeAttribute('color');
                    } else {
                        node.style.backgroundColor = '';
                        if (node.tagName === 'MARK') {
                            const p = node.parentNode;
                            while (node.firstChild) p.insertBefore(node.firstChild, node);
                            p.removeChild(node);
                            return;
                        }
                    }
                }
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    cleanInner(node.childNodes[i]);
                }
            }
            cleanInner(fragment);

            const span = document.createElement('span');
            if (type === 'foreColor') {
                span.style.color = color;
            } else {
                span.style.backgroundColor = color;
            }
            span.appendChild(fragment);
            range.insertNode(span);

            if (sel) {
                const newRange = document.createRange();
                newRange.selectNodeContents(span);
                sel.removeAllRanges();
                sel.addRange(newRange);
            }
            return true;
        } catch (err) {
            console.warn('Direct DOM style wrap fallback error:', err);
        }
    }
    return true;
}

function prepareCaretForFutureTyping() {
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    richEditor.focus();
    restoreEditorSelection(false);

    // Finalize any previous notepad-typing-span
    richEditor.querySelectorAll('.notepad-typing-span').forEach(sp => {
        if (sp.textContent.replace(/\u200B/g, '').trim().length > 0) {
            sp.classList.remove('notepad-typing-span');
        } else {
            sp.remove();
        }
    });

    // Provide browser execCommand hints
    try {
        document.execCommand('styleWithCSS', false, true);
        if (AppState.activeTextColor) {
            document.execCommand('foreColor', false, AppState.activeTextColor);
        } else {
            document.execCommand('foreColor', false, '#000000');
        }
        if (AppState.activeHiliteColor) {
            if (!document.execCommand('hiliteColor', false, AppState.activeHiliteColor)) {
                document.execCommand('backColor', false, AppState.activeHiliteColor);
            }
        }
    } catch (e) {}
}

function applyCaretColorOrHighlight(type, color) {
    if (type === 'foreColor') {
        AppState.activeTextColor = color;
    } else {
        AppState.activeHiliteColor = color;
    }
    prepareCaretForFutureTyping();
}

function applyTextColor(color) {
    if (!AppState.isRichTextMode) {
        showToast("Text color is available in Rich Text Mode");
        return;
    }
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    richEditor.focus();
    restoreEditorSelection(false);

    // Check if user currently has an active text selection inside richEditor
    const sel = window.getSelection();
    let hasRealSelection = false;
    if (sel && sel.rangeCount > 0) {
        const cur = sel.getRangeAt(0);
        if (richEditor.contains(cur.startContainer) && richEditor.contains(cur.endContainer) && !cur.collapsed && cur.toString().length > 0) {
            hasRealSelection = true;
            applyColorToSelectionRange(cur, 'foreColor', color);
            cur.collapse(false);
            sel.removeAllRanges();
            sel.addRange(cur);
        }
    }

    // Set state for future typing
    AppState.activeTextColor = color;
    AppState.lastNonCollapsedSelection = null;

    // Prepare caret for new typing with this color
    prepareCaretForFutureTyping();

    const bar = document.getElementById('fore-color-bar');
    if (bar) bar.style.backgroundColor = color;
    const input = document.getElementById('fore-color-input');
    if (input && input.value !== color) input.value = color;

    saveEditorSelection();
    syncToolbar();
    pushRichSnapshot();
    saveCurrentStateToMemory();

    showToast(hasRealSelection ? "Text color applied" : "Text color set for new text");
}

function applyHighlightColor(color) {
    if (!AppState.isRichTextMode) {
        showToast("Highlight color is available in Rich Text Mode");
        return;
    }
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    richEditor.focus();
    restoreEditorSelection(false);

    // Check if user currently has an active text selection inside richEditor
    const sel = window.getSelection();
    let hasRealSelection = false;
    if (sel && sel.rangeCount > 0) {
        const cur = sel.getRangeAt(0);
        if (richEditor.contains(cur.startContainer) && richEditor.contains(cur.endContainer) && !cur.collapsed && cur.toString().length > 0) {
            hasRealSelection = true;
            applyColorToSelectionRange(cur, 'hiliteColor', color);
            cur.collapse(false);
            sel.removeAllRanges();
            sel.addRange(cur);
        }
    }

    // Set state for future typing
    AppState.activeHiliteColor = color;
    AppState.lastNonCollapsedSelection = null;

    // Prepare caret for new typing with this highlight color
    prepareCaretForFutureTyping();

    const bar = document.getElementById('hilite-color-bar');
    if (bar) bar.style.backgroundColor = color;
    const input = document.getElementById('hilite-color-input');
    if (input && input.value !== color) input.value = color;

    saveEditorSelection();
    syncToolbar();
    pushRichSnapshot();
    saveCurrentStateToMemory();

    showToast(hasRealSelection ? "Highlight applied" : "Highlight set for new text");
}

function applyCurrentColors() {
    const foreInput = document.getElementById('fore-color-input');
    const hiliteInput = document.getElementById('hilite-color-input');
    if (foreInput) applyTextColor(foreInput.value);
    if (hiliteInput) applyHighlightColor(hiliteInput.value);
}

function resetColorAndHighlight() {
    if (!AppState.isRichTextMode) return;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;

    richEditor.focus();
    restoreEditorSelection(false);

    // Reset future typing states
    AppState.activeTextColor = null;
    AppState.activeHiliteColor = null;
    AppState.lastNonCollapsedSelection = null;

    // Prepare caret for normal future typing without modifying ANY previously written text
    prepareCaretForFutureTyping();

    // Reset toolbar indicators
    const foreBar = document.getElementById('fore-color-bar');
    const hiliteBar = document.getElementById('hilite-color-bar');
    if (foreBar) foreBar.style.backgroundColor = 'var(--text-primary, #000000)';
    const foreInput = document.getElementById('fore-color-input');
    if (foreInput) foreInput.value = '#000000';
    if (hiliteBar) hiliteBar.style.backgroundColor = 'transparent';
    const hiliteInput = document.getElementById('hilite-color-input');
    if (hiliteInput) hiliteInput.value = '#ffffff';

    saveEditorSelection();
    syncToolbar();
    pushRichSnapshot();
    saveCurrentStateToMemory();

    showToast("Normal mode: New text will have default color & no highlight");
}

function removeLink() {
    if (!AppState.isRichTextMode) return;
    const richEditor = document.getElementById('rich-editor');
    if (!richEditor) return;
    richEditor.focus();
    restoreEditorSelection(false);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let aNode = null;
    let curr = sel.anchorNode;
    while (curr && curr !== richEditor) {
        if (curr.nodeName === 'A') {
            aNode = curr;
            break;
        }
        curr = curr.parentNode;
    }

    if (aNode) {
        const textNode = document.createTextNode(aNode.textContent);
        aNode.parentNode.replaceChild(textNode, aNode);
        showToast("Link removed");
        pushRichSnapshot();
        saveCurrentStateToMemory();
        return;
    }

    document.execCommand('unlink', false, null);
    showToast("Link removed");
    pushRichSnapshot();
    saveCurrentStateToMemory();
}
