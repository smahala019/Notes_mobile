/* ==========================================================================
   Ultimate Web Notepad - Application Main Controller & Event Wiring
   ========================================================================== */

let autoSaveDebounceTimer = null;
let recognition = null;
let isRecording = false;

// --- DOM Ready Initialization ---

window.addEventListener('DOMContentLoaded', async () => {
    await initTheme();
    await loadFilesFromStorage();
    await loadRecentFiles();
    await loadAppSettings();
    initMenuEvents();
    initActionDelegation();
    initEditorEvents();
    initToolbarEvents();
    initEquationBarEvents();
    initModalEvents();
    initShapeModalEvents();
    initCropModalEvents();
    initExcelModalEvents();
    initCsvModalEvents();
    initShapeInteractions();
    initTableInteractions();
    initBulletLibraryEvents();
    initImageInteractions();
    initVoiceRecognition();
    if (typeof applyWordWrapState === 'function') applyWordWrapState();
    if (typeof initAccessibilityTooltips === 'function') initAccessibilityTooltips();
    if (typeof changePaperSize === 'function') changePaperSize('a4');
    initAppHeaderObserver();

    // Auto-update year in status bar and about modal
    const currentYear = new Date().getFullYear();
    const statusYearEl = document.getElementById('status-current-year');
    if (statusYearEl) statusYearEl.textContent = currentYear;
    const aboutYearEl = document.getElementById('about-copyright-year');
    if (aboutYearEl) aboutYearEl.textContent = currentYear;

    startAutoSaveInterval();
});

// --- Editor Event Listeners & Debouncing (Fixed BUG-18) ---

function initEditorEvents() {
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    const editorArea = document.getElementById('editor-area');

    // Debounced memory save on input
    const onInputHandler = () => {
        if (AppState.isSwitchingFiles) return;
        updateStats();
        if (!AppState.isRichTextMode) {
            pushHistory(plainEditor.value);
        } else {
            const activeSpan = richEditor ? richEditor.querySelector('.notepad-typing-span') : null;
            if (activeSpan && activeSpan.textContent.length > 1 && activeSpan.textContent.includes('\u200B')) {
                const sel = window.getSelection();
                const anchorNode = sel ? sel.anchorNode : null;
                const anchorOffset = sel ? sel.anchorOffset : 0;
                let stripped = false;
                activeSpan.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE && child.nodeValue.includes('\u200B')) {
                        child.nodeValue = child.nodeValue.replace(/\u200B/g, '');
                        stripped = true;
                    }
                });
                if (stripped && sel && anchorNode) {
                    try {
                        const r = document.createRange();
                        r.setStart(anchorNode, Math.min(anchorOffset, anchorNode.nodeValue ? anchorNode.nodeValue.length : 0));
                        r.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(r);
                    } catch (err) {}
                }
            }
            if (typeof richSnapshotDebounceTimer !== 'undefined' && richSnapshotDebounceTimer) {
                clearTimeout(richSnapshotDebounceTimer);
            }
            if (typeof pushRichSnapshot === 'function') {
                richSnapshotDebounceTimer = setTimeout(() => {
                    pushRichSnapshot();
                }, 600);
            }
        }
        if (autoSaveDebounceTimer) clearTimeout(autoSaveDebounceTimer);
        autoSaveDebounceTimer = setTimeout(() => {
            if (!AppState.isSwitchingFiles) {
                saveCurrentStateToMemory(false);
            }
        }, 800);
        if (!AppState.isWordWrap && typeof ensureCaretVisible === 'function') {
            ensureCaretVisible();
        }
        if (document.body.classList.contains('watermarked') && typeof updateWatermarkLayout === 'function') {
            if (window.__wmDebounceTimer) clearTimeout(window.__wmDebounceTimer);
            window.__wmDebounceTimer = setTimeout(() => {
                updateWatermarkLayout();
            }, 250);
        }
        // Auto-grow plain-editor textarea (fallback for browsers without field-sizing: content)
        if (!AppState.isRichTextMode && plainEditor) {
            autoGrowPlainEditor(plainEditor);
        }
    };

    // Auto-grow plain-editor: expand height to match content so page scrollbar is used
    function autoGrowPlainEditor(ed) {
        // Temporarily shrink to measure real scrollHeight
        ed.style.height = 'auto';
        const minH = parseFloat(window.getComputedStyle(ed).minHeight) || 800;
        ed.style.height = `${Math.max(minH, ed.scrollHeight)}px`;
    }
    // Expose for external callers (e.g. loadFileContent)
    window.autoGrowPlainEditor = autoGrowPlainEditor;

    if (typeof ResizeObserver !== 'undefined') {
        const wmResizeObserver = new ResizeObserver(() => {
            if (document.body.classList.contains('watermarked') && typeof updateWatermarkLayout === 'function') {
                updateWatermarkLayout();
            }
        });
        if (richEditor) wmResizeObserver.observe(richEditor);
        if (plainEditor) wmResizeObserver.observe(plainEditor);
    }
    window.addEventListener('resize', () => {
        if (document.body.classList.contains('watermarked') && typeof updateWatermarkLayout === 'function') {
            updateWatermarkLayout();
        }
    });

    [richEditor, plainEditor].forEach(ed => {
        ed.addEventListener('input', onInputHandler);
        ed.addEventListener('click', (e) => {
            AppState.isSettingColor = false;
            updateStats();
            if (AppState.isRichTextMode) {
                saveEditorSelection();
                syncToolbar();
                const link = e.target.closest('a');
                if (link && link.href) {
                    e.preventDefault();
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                    showToast(`Opening link: ${link.href}`);
                }
            }
        });
        ed.addEventListener('keyup', () => {
            updateStats();
            if (AppState.isRichTextMode) {
                saveEditorSelection();
                syncToolbar();
            }
            if (!AppState.isWordWrap && typeof ensureCaretVisible === 'function') {
                ensureCaretVisible();
            }
        });
        ed.addEventListener('mouseup', () => {
            updateStats();
            if (AppState.isRichTextMode) {
                saveEditorSelection();
                syncToolbar();
                if (typeof applyFormatPainterIfActive === 'function') {
                    applyFormatPainterIfActive();
                }
            }
        });
        ed.addEventListener('select', () => {
            updateStats();
            if (AppState.isRichTextMode) saveEditorSelection();
        });
    });

    document.addEventListener('selectionchange', () => {
        if (AppState.isRichTextMode && !AppState.isSettingColor && !AppState.isSettingFont) {
            saveEditorSelection();
        }
        if (!AppState.isWordWrap && typeof ensureCaretVisible === 'function') {
            ensureCaretVisible();
        }
    });

    // Instant same-line typing formatting for text color, highlighter, and normal mode
    if (richEditor) {
        function normalizeColorStr(color) {
            if (!color || color === 'transparent' || color === 'inherit' || color === 'initial') return '';
            color = color.trim().toLowerCase();
            if (/^#[0-9a-f]{6}$/i.test(color)) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgb(${r}, ${g}, ${b})`;
            }
            if (/^#[0-9a-f]{3}$/i.test(color)) {
                const r = parseInt(color[1] + color[1], 16);
                const g = parseInt(color[2] + color[2], 16);
                const b = parseInt(color[3] + color[3], 16);
                return `rgb(${r}, ${g}, ${b})`;
            }
            const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (match) {
                return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
            }
            return color;
        }

        function areColorsEqual(c1, c2) {
            return normalizeColorStr(c1) === normalizeColorStr(c2);
        }

        function getStyledAncestor(node, root) {
            let curr = (node && node.nodeType === Node.TEXT_NODE) ? node.parentNode : node;
            while (curr && curr !== root) {
                if (curr.nodeType === Node.ELEMENT_NODE) {
                    const s = curr.style;
                    const hasColor = s && s.color && s.color !== '' && s.color !== 'inherit';
                    const hasBg = s && s.backgroundColor && s.backgroundColor !== '' && s.backgroundColor !== 'transparent' && s.backgroundColor !== 'inherit';
                    if (hasColor || hasBg || curr.tagName === 'MARK' || curr.tagName === 'FONT') {
                        return curr;
                    }
                }
                curr = curr.parentNode;
            }
            return null;
        }

        richEditor.addEventListener('beforeinput', (e) => {
            if (!AppState.isRichTextMode) return;
            if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') return;
            if (!e.data) return;

            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            if (!richEditor.contains(range.startContainer)) return;

            const targetColor = AppState.activeTextColor || null;
            const targetHilite = AppState.activeHiliteColor || null;
            const isNormal = !targetColor && !targetHilite;

            const container = range.startContainer;
            const offset = range.startOffset;
            const styledAncestor = getStyledAncestor(container, richEditor);

            if (isNormal) {
                if (!styledAncestor) {
                    // Caret is already in an unstyled node: default typing continues naturally.
                    return;
                }

                // Caret is inside/at boundary of a styled ancestor: step outside to prevent inheriting styles
                e.preventDefault();
                if (!range.collapsed) {
                    range.deleteContents();
                }

                const textNode = document.createTextNode(e.data);
                const isTextNode = container.nodeType === Node.TEXT_NODE;
                const textLen = isTextNode ? (container.nodeValue ? container.nodeValue.length : 0) : 0;

                if (isTextNode && offset < textLen && offset > 0) {
                    const secondHalf = container.splitText(offset);
                    const clone = styledAncestor.cloneNode(false);
                    clone.appendChild(secondHalf);
                    styledAncestor.parentNode.insertBefore(clone, styledAncestor.nextSibling);
                    styledAncestor.parentNode.insertBefore(textNode, clone);
                } else if (isTextNode && offset === 0 && !container.previousSibling) {
                    styledAncestor.parentNode.insertBefore(textNode, styledAncestor);
                } else {
                    if (styledAncestor.nextSibling) {
                        styledAncestor.parentNode.insertBefore(textNode, styledAncestor.nextSibling);
                    } else {
                        styledAncestor.parentNode.appendChild(textNode);
                    }
                }

                const newRange = document.createRange();
                newRange.setStart(textNode, textNode.length);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

                onInputHandler();
                return;
            }

            // Text color or Highlight is active
            if (styledAncestor) {
                const matchesColor = targetColor ? areColorsEqual(styledAncestor.style.color, targetColor) : (!styledAncestor.style.color || styledAncestor.style.color === 'inherit');
                const matchesHilite = targetHilite ? areColorsEqual(styledAncestor.style.backgroundColor, targetHilite) : (!styledAncestor.style.backgroundColor || styledAncestor.style.backgroundColor === 'transparent');

                if (matchesColor && matchesHilite) {
                    // Current container matches active styles: allow default browser typing directly inside
                    return;
                }
            }

            // Current container does NOT match active styles: create new styled span immediately!
            e.preventDefault();
            if (!range.collapsed) {
                range.deleteContents();
            }

            richEditor.querySelectorAll('.notepad-typing-span').forEach(sp => {
                sp.classList.remove('notepad-typing-span');
            });

            const newSpan = document.createElement('span');
            newSpan.className = 'notepad-typing-span';
            if (targetColor) {
                newSpan.style.color = targetColor;
                newSpan.setAttribute('data-text-color', targetColor);
            }
            if (targetHilite) {
                newSpan.style.backgroundColor = targetHilite;
                newSpan.setAttribute('data-hilite-color', targetHilite);
            }
            const textNode = document.createTextNode(e.data);
            newSpan.appendChild(textNode);

            if (styledAncestor) {
                const isTextNode = container.nodeType === Node.TEXT_NODE;
                const textLen = isTextNode ? (container.nodeValue ? container.nodeValue.length : 0) : 0;
                if (isTextNode && offset < textLen && offset > 0) {
                    const secondHalf = container.splitText(offset);
                    const clone = styledAncestor.cloneNode(false);
                    clone.appendChild(secondHalf);
                    styledAncestor.parentNode.insertBefore(clone, styledAncestor.nextSibling);
                    styledAncestor.parentNode.insertBefore(newSpan, clone);
                } else if (isTextNode && offset === 0 && !container.previousSibling) {
                    styledAncestor.parentNode.insertBefore(newSpan, styledAncestor);
                } else {
                    if (styledAncestor.nextSibling) {
                        styledAncestor.parentNode.insertBefore(newSpan, styledAncestor.nextSibling);
                    } else {
                        styledAncestor.parentNode.appendChild(newSpan);
                    }
                }
            } else {
                if (container.nodeType === Node.TEXT_NODE) {
                    const textLen = container.nodeValue ? container.nodeValue.length : 0;
                    if (offset < textLen && offset > 0) {
                        const secondHalf = container.splitText(offset);
                        container.parentNode.insertBefore(newSpan, secondHalf);
                    } else if (offset === 0) {
                        container.parentNode.insertBefore(newSpan, container);
                    } else {
                        if (container.nextSibling) {
                            container.parentNode.insertBefore(newSpan, container.nextSibling);
                        } else {
                            container.parentNode.appendChild(newSpan);
                        }
                    }
                } else {
                    range.insertNode(newSpan);
                }
            }

            const newRange = document.createRange();
            newRange.setStart(textNode, textNode.length);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            onInputHandler();
        });
    }

    // Fixed BUG-06: Tab key indentation in both editors
    [richEditor, plainEditor].forEach(ed => {
        ed.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                if (AppState.isRichTextMode) {
                    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                } else {
                    const start = plainEditor.selectionStart;
                    const end = plainEditor.selectionEnd;
                    plainEditor.value = plainEditor.value.substring(0, start) + '    ' + plainEditor.value.substring(end);
                    plainEditor.selectionStart = plainEditor.selectionEnd = start + 4;
                    pushHistory(plainEditor.value);
                }
                updateStats();
                saveCurrentStateToMemory(false);
            }
        });
    });

    // Code Block Navigation & Enter Key Font Consistency
    richEditor.addEventListener('keydown', (e) => {
        // Check if inside a code block
        const codeNode = typeof isCaretInCodeBlock === 'function' ? isCaretInCodeBlock() : null;
        if (codeNode) {
            // A. Shift+Enter exits the code block immediately
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                if (typeof exitCodeBlock === 'function') {
                    exitCodeBlock(codeNode);
                }
                return;
            }

            // B. Enter on empty line or double Enter exits the code block
            if (e.key === 'Enter' && !e.shiftKey) {
                const sel = window.getSelection();
                if (sel && sel.anchorNode) {
                    const nodeText = sel.anchorNode.textContent || "";
                    const offset = sel.anchorOffset;
                    const textBefore = nodeText.substring(0, offset);
                    if (nodeText.trim() === "" || textBefore.endsWith('\n') || (offset === nodeText.length && textBefore.trim() === "")) {
                        e.preventDefault();
                        if (sel.anchorNode.nodeType === Node.TEXT_NODE && sel.anchorNode.textContent.endsWith('\n')) {
                            sel.anchorNode.textContent = sel.anchorNode.textContent.replace(/\n+$/, '');
                        }
                        if (typeof exitCodeBlock === 'function') {
                            exitCodeBlock(codeNode);
                        }
                        return;
                    }
                }
            }

            // C. ArrowDown at the end of the code block moves to next paragraph
            if (e.key === 'ArrowDown') {
                const sel = window.getSelection();
                if (sel && sel.anchorNode) {
                    const nodeText = sel.anchorNode.textContent || "";
                    if (sel.anchorOffset >= nodeText.length - 1) {
                        setTimeout(() => {
                            const newSel = window.getSelection();
                            if (newSel && newSel.anchorOffset === sel.anchorOffset) {
                                if (typeof exitCodeBlock === 'function') {
                                    exitCodeBlock(codeNode);
                                }
                            }
                        }, 20);
                    }
                }
            }
        }

        if (e.key === 'Enter') {
            const targetFamily = AppState.activeFontFamily || richEditor.style.fontFamily;
            const targetSize = AppState.activeFontSize || richEditor.style.fontSize;

            setTimeout(() => {
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const node = sel.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode) : null;
                    if (node && node !== richEditor) {
                        if (targetFamily) node.style.fontFamily = targetFamily;
                        if (targetSize) node.style.fontSize = targetSize;
                    }
                }
                if (targetFamily && typeof updateFontToolbar === 'function') {
                    updateFontToolbar(targetFamily, parseInt(targetSize) || 16);
                }
                saveCurrentStateToMemory(false);
            }, 10);
        }
    });

    // Clicking outside/below any block element in rich editor focuses a new paragraph
    richEditor.addEventListener('click', (e) => {
        if (e.target === richEditor) {
            const lastChild = richEditor.lastElementChild;
            if (lastChild && (lastChild.nodeName === 'PRE' || lastChild.classList.contains('code-block-container') || lastChild.classList.contains('word-border-box'))) {
                let p = document.createElement('p');
                p.innerHTML = '<br>';
                richEditor.appendChild(p);
                const sel = window.getSelection();
                const range = document.createRange();
                range.setStart(p, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    });

    // Drag & Drop
    editorArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        editorArea.classList.add('drag-over');
    });
    editorArea.addEventListener('dragleave', () => {
        editorArea.classList.remove('drag-over');
    });
    editorArea.addEventListener('drop', (e) => {
        e.preventDefault();
        editorArea.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            handleFileOpen(e.dataTransfer.files[0]);
        }
    });
}

// Dynamic header height synchronization so editor-container padding-top matches header height exactly
function initAppHeaderObserver() {
    const appHeader = document.getElementById('app-header');
    if (!appHeader) return;

    const updateHeight = () => {
        const height = appHeader.offsetHeight;
        if (height > 0) {
            document.documentElement.style.setProperty('--app-header-height', `${height}px`);
        }
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
            updateHeight();
        });
        ro.observe(appHeader);
    }

    window.addEventListener('resize', updateHeight, { passive: true });
    window.updateAppHeaderHeight = updateHeight;
}

// --- Toolbar Events & Mobile Drawer (Fixed BUG-11: No Duplicate IDs) ---

function initToolbarEvents() {
    // Prevent formatting buttons & dropdown triggers from stealing focus / collapsing editor selection
    document.querySelectorAll('.tool-btn, .mobile-format-sheet button, .sel-tool-btn, [data-format], [data-action="format-painter"], [data-action="font-grow"], [data-action="font-shrink"], [data-action="insert-checklist"], [data-action="insert-hr"]').forEach(el => {
        ['mousedown', 'pointerdown'].forEach(ev => {
            el.addEventListener(ev, (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && !e.target.closest('.color-picker-trigger') && !e.target.classList.contains('color-picker-trigger')) {
                    e.preventDefault();
                }
            });
        });
    });

    // Save selection when clicking color picker trigger, normal reset button, or select dropdowns
    document.querySelectorAll('.color-dropdown-wrapper, .color-dropdown-wrapper *, #tool-reset-color, .color-wrapper, .tool-select, .tool-input-number').forEach(el => {
        ['mousedown', 'pointerdown', 'touchstart'].forEach(ev => {
            el.addEventListener(ev, () => {
                AppState.isSettingColor = true;
                if (typeof saveEditorSelection === 'function') {
                    saveEditorSelection();
                }
            }, { passive: true });
        });
    });

    const fontSizeInput = document.getElementById('font-size-input');
    const fontFamilySelect = document.getElementById('font-family-select');

    if (fontSizeInput) {
        ['mousedown', 'pointerdown', 'touchstart', 'focus'].forEach(ev => {
            fontSizeInput.addEventListener(ev, () => {
                AppState.isSettingFont = true;
                saveEditorSelection();
            });
        });
        fontSizeInput.addEventListener('input', () => {
            AppState.isSettingFont = true;
        });
        fontSizeInput.addEventListener('change', (e) => {
            let size = parseInt(e.target.value);
            if (isNaN(size) || size < 1) size = 16;
            e.target.value = size;
            applyFontSize(size);
        });
        fontSizeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                let size = parseInt(e.target.value);
                if (isNaN(size) || size < 1) size = 16;
                e.target.value = size;
                applyFontSize(size);
                fontSizeInput.blur();
                const ed = getCurrentEditor();
                if (ed) ed.focus();
            }
        });
        fontSizeInput.addEventListener('blur', () => {
            setTimeout(() => { AppState.isSettingFont = false; }, 300);
        });
    }

    if (fontFamilySelect) {
        ['mousedown', 'pointerdown', 'touchstart', 'focus'].forEach(ev => {
            fontFamilySelect.addEventListener(ev, () => {
                AppState.isSettingFont = true;
                saveEditorSelection();
            });
        });
        fontFamilySelect.addEventListener('change', (e) => {
            applyFontFamily(e.target.value);
            setTimeout(() => { AppState.isSettingFont = false; }, 300);
        });
        fontFamilySelect.addEventListener('blur', () => {
            setTimeout(() => { AppState.isSettingFont = false; }, 300);
        });
    }

    // Color Pickers - In-Built Native Browser Color Pickers
    function openNativeColorPicker(input) {
        if (!input) return;
        AppState.isSettingColor = true;
        if (typeof saveEditorSelection === 'function') {
            saveEditorSelection();
        }
        try {
            if (typeof input.showPicker === 'function') {
                input.showPicker();
            } else {
                input.click();
            }
        } catch (err) {
            try { input.click(); } catch (e2) {}
        }
    }

    const foreColorInput = document.getElementById('fore-color-input');
    if (foreColorInput) {
        ['input', 'change'].forEach(ev => {
            foreColorInput.addEventListener(ev, (e) => {
                const val = e.target.value;
                const bar = document.getElementById('fore-color-bar');
                if (bar) bar.style.backgroundColor = val;
                if (typeof applyTextColor === 'function') {
                    applyTextColor(val);
                } else if (typeof applyCaretColorOrHighlight === 'function') {
                    applyCaretColorOrHighlight('foreColor', val);
                }
                if (ev === 'change') {
                    setTimeout(() => { AppState.isSettingColor = false; }, 300);
                }
            });
        });
    }

    const btnFore = document.getElementById('btn-fore-color');
    if (btnFore) {
        btnFore.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.getElementById('fore-color-input');
            const val = input ? input.value : '#ef4444';
            const sel = window.getSelection();
            const richEditor = document.getElementById('rich-editor');
            const hasTextSelected = sel && sel.rangeCount > 0 && !sel.isCollapsed &&
                                    richEditor && richEditor.contains(sel.getRangeAt(0).startContainer) &&
                                    sel.toString().trim().length > 0;
            if (hasTextSelected) {
                if (typeof applyTextColor === 'function') {
                    applyTextColor(val);
                }
            } else {
                openNativeColorPicker(input);
            }
        });
    }

    const foreArrow = document.getElementById('btn-fore-color-arrow');
    if (foreArrow) {
        foreArrow.addEventListener('click', (e) => {
            const input = document.getElementById('fore-color-input');
            if (e.target !== input) {
                e.preventDefault();
                openNativeColorPicker(input);
            }
        });
    }

    const hiliteColorInput = document.getElementById('hilite-color-input');
    if (hiliteColorInput) {
        ['input', 'change'].forEach(ev => {
            hiliteColorInput.addEventListener(ev, (e) => {
                const val = e.target.value;
                const bar = document.getElementById('hilite-color-bar');
                if (bar) bar.style.backgroundColor = val;
                if (typeof applyHighlightColor === 'function') {
                    applyHighlightColor(val);
                } else if (typeof applyCaretColorOrHighlight === 'function') {
                    applyCaretColorOrHighlight('hiliteColor', val);
                }
                if (ev === 'change') {
                    setTimeout(() => { AppState.isSettingColor = false; }, 300);
                }
            });
        });
    }

    const btnHilite = document.getElementById('btn-hilite-color');
    if (btnHilite) {
        btnHilite.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.getElementById('hilite-color-input');
            const val = input ? input.value : '#facc15';
            const sel = window.getSelection();
            const richEditor = document.getElementById('rich-editor');
            const hasTextSelected = sel && sel.rangeCount > 0 && !sel.isCollapsed &&
                                    richEditor && richEditor.contains(sel.getRangeAt(0).startContainer) &&
                                    sel.toString().trim().length > 0;
            if (hasTextSelected) {
                if (typeof applyHighlightColor === 'function') {
                    applyHighlightColor(val);
                }
            } else {
                openNativeColorPicker(input);
            }
        });
    }

    const hiliteArrow = document.getElementById('btn-hilite-color-arrow');
    if (hiliteArrow) {
        hiliteArrow.addEventListener('click', (e) => {
            const input = document.getElementById('hilite-color-input');
            if (e.target !== input) {
                e.preventDefault();
                openNativeColorPicker(input);
            }
        });
    }

    const resetColorBtn = document.getElementById('tool-reset-color');
    if (resetColorBtn) {
        resetColorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof resetColorAndHighlight === 'function') {
                resetColorAndHighlight();
            }
        });
    }

    // Status bar zoom controls (MS Word 25% - 800%)
    const zoomSlider = document.getElementById('status-zoom-slider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            if (typeof changeEditorZoom === 'function') {
                changeEditorZoom(e.target.value);
            }
        });
    }

    const zoomVal = document.getElementById('status-zoom-val');
    if (zoomVal) {
        zoomVal.addEventListener('click', () => {
            if (typeof changeEditorZoom === 'function') {
                changeEditorZoom(100);
            }
        });
    }

    // Paper Size & Margin Selectors (MS Word Page Setup)
    const paperSizeSelect = document.getElementById('tool-paper-size');
    if (paperSizeSelect) {
        paperSizeSelect.addEventListener('change', (e) => {
            if (typeof changePaperSize === 'function') {
                changePaperSize(e.target.value);
            }
        });
    }

    const marginSelect = document.getElementById('tool-margin-select');
    if (marginSelect) {
        marginSelect.addEventListener('change', (e) => {
            if (typeof changeMargin === 'function') {
                changeMargin(e.target.value);
            }
        });
    }

    // Continuously update status and selection on selectionchange
    document.addEventListener('selectionchange', () => {
        const richEditor = document.getElementById('rich-editor');
        const plainEditor = document.getElementById('plain-editor');
        const sel = window.getSelection();
        const isInRich = richEditor && sel && sel.rangeCount > 0 && richEditor.contains(sel.anchorNode);
        const isInPlain = document.activeElement === plainEditor;
        
        if (isInRich || isInPlain || document.activeElement === richEditor) {
            updateStats();
            if (AppState.isRichTextMode && isInRich) {
                saveEditorSelection();
                syncToolbar();
            }
        }
    });

    // Mobile Format Button: Toggles mobile sheet cleanly without cloning
    const mobileFormatBtn = document.getElementById('btn-mobile-format');
    const mobileFormatSheet = document.getElementById('mobile-format-sheet');
    const sheetCloseBtn = document.getElementById('sheet-close-btn');

    if (mobileFormatBtn && mobileFormatSheet) {
        mobileFormatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileFormatSheet.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (mobileFormatSheet.classList.contains('show')) {
                if (!mobileFormatSheet.contains(e.target) && e.target !== mobileFormatBtn) {
                    mobileFormatSheet.classList.remove('show');
                }
            }
        });
    }

    if (sheetCloseBtn && mobileFormatSheet) {
        sheetCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileFormatSheet.classList.remove('show');
        });
    }
}

// --- Modal Event Listeners & Key Handlers (Fixed BUG-19 & BUG-20) ---

function initModalEvents() {
    // Submit on Enter key for single-line inputs
    document.querySelectorAll('.modal-box input[type="text"], .modal-box input[type="number"]').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const modal = input.closest('.modal-box');
                const primaryBtn = modal ? modal.querySelector('.btn-primary') : null;
                if (primaryBtn) primaryBtn.click();
            }
        });
    });

    // Close on overlay background click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });



    // Find and Replace Modal Actions
    const findWhat = document.getElementById('find-what');
    const repWhat = document.getElementById('replace-what');
    const repWith = document.getElementById('replace-with');

    document.getElementById('find-next')?.addEventListener('click', () => {
        if (findWhat) performUnifiedFind(findWhat.value);
    });

    document.getElementById('rep-find-next')?.addEventListener('click', () => {
        if (repWhat) performUnifiedFind(repWhat.value);
    });

    document.getElementById('rep-replace-one')?.addEventListener('click', () => {
        if (repWhat && repWith) performReplaceOne(repWhat.value, repWith.value);
    });

    document.getElementById('rep-replace-all')?.addEventListener('click', () => {
        if (repWhat && repWith) performReplaceAll(repWhat.value, repWith.value);
    });

    // Go To Line Modal Action
    document.getElementById('goto-go')?.addEventListener('click', () => {
        const line = parseInt(document.getElementById('goto-line').value);
        if (line > 0) {
            goToLine(line);
            closeModal('goto-modal');
        }
    });

    // Font Modal Action
    document.getElementById('font-ok')?.addEventListener('click', () => {
        const family = document.getElementById('font-family-modal').value;
        const size = parseInt(document.getElementById('font-size-modal').value) || 16;
        applyFontFamily(family);
        applyFontSize(size);
        closeModal('font-modal');
    });

    // Print Setup Modal Confirmation
    document.getElementById('btn-confirm-print')?.addEventListener('click', () => {
        const size = document.getElementById('print-paper-size')?.value || 'letter';
        const margin = document.getElementById('print-paper-margin')?.value || 'normal';
        const orient = document.getElementById('print-paper-orient')?.value || 'portrait';
        if (typeof executeDirectPrint === 'function') {
            executeDirectPrint(size, margin, orient);
        } else {
            window.print();
        }
    });

    // Global Print Preparation: Suppress file name / time, sync plain text mirror, hide UI chrome
    window.addEventListener('beforeprint', () => {
        // Sync plain editor text to plain-print-mirror for clean pagination
        const plainEd = document.getElementById('plain-editor');
        const mirror = document.getElementById('plain-print-mirror');
        if (plainEd && mirror) {
            mirror.textContent = plainEd.value;
        }

        if (typeof updateWatermarkLayout === 'function') updateWatermarkLayout();

        // Close dropdowns and floating toolbars
        if (typeof hideAllFloatingToolbars === 'function') hideAllFloatingToolbars();
        if (typeof closeAllModals === 'function') closeAllModals();
        if (typeof closeAllDropdowns === 'function') closeAllDropdowns();

        // Temporarily blank document.title so no file name or time is rendered in print header
        window.__savedPrintDocTitle = document.title;
        document.title = "";
        document.body.classList.add('is-printing');
    });

    window.addEventListener('afterprint', () => {
        if (typeof window.__savedPrintDocTitle !== 'undefined') {
            document.title = window.__savedPrintDocTitle;
        }
        document.body.classList.remove('is-printing');
    });

    // Wire Clear Storage & File Inputs
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileOpen(e.target.files[0]);
                e.target.value = '';
            }
        });
    }
}

// --- File Open & Save (Fixed BUG-09: Supports .html, .md, .txt with Save As) ---

function handleFileOpen(file) {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm') || lowerName.endsWith('.rtf');
    const isMd = lowerName.endsWith('.md');

    const reader = new FileReader();
    reader.onload = (e) => {
        const raw = e.target.result || "";
        let richHtml = "";

        if (isMd) {
            richHtml = parseMarkdown(raw);
        } else if (isHtml) {
            richHtml = raw;
        } else {
            richHtml = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
        }

        addFileToSystem(file.name, richHtml, isHtml || isMd, true);
    };
    reader.readAsText(file);
}

function parseMarkdown(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*?)\*/gim, '<i>$1</i>')
        .replace(/__(.*?)__/gim, '<b>$1</b>')
        .replace(/_(.*?)_/gim, '<i>$1</i>')
        .replace(/\n/g, '<br>');
}

function saveFile(forcePrompt = false) {
    saveCurrentStateToMemory();
    const file = AppState.files.find(f => f.id === AppState.currentFileId);
    if (!file) return;

    if (forcePrompt) {
        showCustomPrompt("Save As (Include extension: .txt, .html, .md)", file.name, (chosenName) => {
            if (chosenName && chosenName.trim()) {
                file.name = chosenName.trim();
                renderTabs();
                executeFileDownload(file);
            }
        });
    } else {
        executeFileDownload(file);
    }
}

function executeFileDownload(file) {
    const isHtmlFile = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
    const isMdFile = file.name.toLowerCase().endsWith('.md');

    let content = "";
    let mimeType = 'text/plain';

    if (isHtmlFile) {
        content = AppState.isRichTextMode 
            ? `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${file.name}</title>\n</head>\n<body>\n${document.getElementById('rich-editor').innerHTML}\n</body>\n</html>`
            : document.getElementById('plain-editor').value;
        mimeType = 'text/html';
    } else {
        content = AppState.isRichTextMode 
            ? document.getElementById('rich-editor').innerText 
            : document.getElementById('plain-editor').value;
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast(`Saved ${file.name}`);
}

// Auto Save Loop
function startAutoSaveInterval() {
    if (AppState.autoSaveTimer) clearInterval(AppState.autoSaveTimer);
    AppState.autoSaveTimer = setInterval(() => {
        if (AppState.autoSaveEnabled) {
            saveCurrentStateToMemory(true);
        }
    }, 1800);
}

// Ensure all toolbar buttons, tabs, and options have accessibility labels & titles
function initAccessibilityTooltips() {
    document.querySelectorAll('.tool-btn, .menu-tab-btn, .title-action-btn, .dot-option, .tool-select, .btn').forEach(btn => {
        const title = btn.getAttribute('title') || btn.innerText.trim();
        if (title && !btn.getAttribute('aria-label')) {
            btn.setAttribute('aria-label', title);
        }
        if (!btn.getAttribute('title') && btn.getAttribute('aria-label')) {
            btn.setAttribute('title', btn.getAttribute('aria-label'));
        }
    });
}

// --- Global Keyboard Shortcuts (Fixed BUG-05: Plain Text <textarea> Works!) ---

document.addEventListener('keydown', (e) => {
    // Modal dialog handling (Fixed BUG-19: Enter key submission & BUG-20: Escape key cancellation)
    const isInsideModal = e.target.closest('.modal-box');
    if (isInsideModal) {
        if (e.key === 'Escape') {
            closeAllModals();
            return;
        }
        if (e.key === 'Enter') {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
                e.preventDefault();
                const promptModal = isInsideModal.closest('#prompt-modal');
                if (promptModal) {
                    closePromptModal(true);
                    return;
                }
                const confirmModal = isInsideModal.closest('#confirm-modal');
                if (confirmModal) {
                    closeConfirmModal(true);
                    return;
                }
                const primaryBtn = isInsideModal.querySelector('.btn-primary, #prompt-ok-btn, #confirm-ok-btn, #btn-find-next, #goto-btn, #link-insert-btn, #table-insert-btn, #image-insert-btn, #excel-insert-btn, #settings-save-btn');
                if (primaryBtn) {
                    primaryBtn.click();
                    return;
                }
            }
        }
        return;
    }

    if (e.key === 'Escape') {
        closeAllModals();
        closeAllDropdowns();
        document.getElementById('mobile-format-sheet')?.classList.remove('show');
    }

    if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            reopenClosedFile();
            return;
        }
        if (e.key === ']') {
            e.preventDefault();
            growFontSize();
            return;
        }
        if (e.key === '[') {
            e.preventDefault();
            shrinkFontSize();
            return;
        }

        switch (e.key.toLowerCase()) {
            case 's':
                e.preventDefault();
                saveFile(false);
                break;
            case 'n':
                e.preventDefault();
                createNewFile();
                break;
            case 'o':
                e.preventDefault();
                document.getElementById('file-input')?.click();
                break;
            case 'p':
                e.preventDefault();
                if (typeof printDocument === 'function') printDocument();
                else window.print();
                break;
            case 'f':
                e.preventDefault();
                openModal('find-modal');
                break;
            case 'h':
                e.preventDefault();
                openModal('replace-modal');
                break;
            case 'g':
                e.preventDefault();
                openModal('goto-modal');
                break;
            case 'b':
                if (AppState.isRichTextMode) { e.preventDefault(); formatDoc('bold'); }
                break;
            case 'i':
                if (AppState.isRichTextMode) { e.preventDefault(); formatDoc('italic'); }
                break;
            case 'u':
                if (AppState.isRichTextMode) { e.preventDefault(); formatDoc('underline'); }
                break;
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    if (AppState.isRichTextMode) executeRichRedo();
                    else plainEditorRedo();
                } else {
                    if (AppState.isRichTextMode) executeRichUndo();
                    else plainEditorUndo();
                }
                break;
            case 'y':
                e.preventDefault();
                if (AppState.isRichTextMode) executeRichRedo();
                else plainEditorRedo();
                break;
        }
    }

    if (e.key === 'F5') {
        e.preventDefault();
        insertDate();
    }
    if (e.key === 'F12') {
        e.preventDefault();
        saveFile(true); // Save As...
    }
});

// --- Voice Recognition ---

function initVoiceRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBtn = document.getElementById('tool-voice');

    if (!SpeechRec) {
        if (voiceBtn) voiceBtn.style.display = 'none';
        return;
    }

    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        if (voiceBtn) voiceBtn.classList.add('recording');
        showToast("Voice typing: Listening...");
    };

    recognition.onend = () => {
        isRecording = false;
        if (voiceBtn) voiceBtn.classList.remove('recording');
    };

    recognition.onerror = (e) => {
        isRecording = false;
        if (voiceBtn) voiceBtn.classList.remove('recording');
        showToast(`Voice error: ${e.error}`);
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript + ' ';
            }
        }

        if (transcript) {
            if (AppState.isRichTextMode) {
                document.getElementById('rich-editor').focus();
                document.execCommand('insertText', false, transcript);
            } else {
                const ed = document.getElementById('plain-editor');
                ed.focus();
                const start = ed.selectionStart;
                ed.value = ed.value.substring(0, start) + transcript + ed.value.substring(start);
                ed.selectionStart = ed.selectionEnd = start + transcript.length;
                pushHistory(ed.value);
            }
            updateStats();
            saveCurrentStateToMemory(false);
        }
    };
}

function toggleVoiceRecognition() {
    if (!recognition) {
        showToast("Speech recognition not supported in this browser");
        return;
    }
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}
