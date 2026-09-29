/* ==========================================================================
   Ultimate Web Notepad - Modals, Dialogs & Word Cloud Manager
   ========================================================================== */

let promptCallback = null;
let confirmCallback = null;

// --- Modal Helper Functions ---

function openModal(id) {
    saveEditorSelection();
    if (id === 'settings-modal' && typeof initSettingsModal === 'function') {
        try { initSettingsModal(); } catch (e) { console.error(e); }
    }
    if (id === 'wordcount-modal' && typeof updateWordCountModal === 'function') {
        try { updateWordCountModal(); } catch (e) { console.error(e); }
    }
    if (id === 'symbol-modal' && typeof renderSymbolGrid === 'function') {
        try { renderSymbolGrid('common'); } catch (e) { console.error(e); }
    }
    if (id === 'emoji-modal' && typeof renderEmojiGrid === 'function') {
        try { renderEmojiGrid('smileys'); } catch (e) { console.error(e); }
    }
    if (id === 'font-modal' && typeof initFontModal === 'function') {
        try { initFontModal(); } catch (e) { console.error(e); }
    }
    if ((id === 'recent-closed-modal' || id === 'closed-files-modal') && typeof renderRecentClosedModal === 'function') {
        try { renderRecentClosedModal(); } catch (e) { console.error(e); }
    }
    if (id === 'gif-modal' && typeof loadGifs === 'function') {
        try { loadGifs('trending', ''); } catch (e) { console.error(e); }
    }
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        // Auto focus first visible input
        const input = modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (input) {
            setTimeout(() => input.focus(), 50);
        }
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeAllModals() {
    if (promptCallback) {
        promptCallback(null);
        promptCallback = null;
    }
    if (confirmCallback) {
        confirmCallback(false);
        confirmCallback = null;
    }
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

// --- Prompt & Confirm Modals (Fixed BUG-19 & BUG-20) ---

function showCustomPrompt(title, defaultVal, callback) {
    document.getElementById('prompt-title').textContent = title;
    const input = document.getElementById('prompt-input');
    input.value = defaultVal || "";
    promptCallback = callback;
    openModal('prompt-modal');
}

function closePromptModal(accepted) {
    const val = document.getElementById('prompt-input').value;
    closeModal('prompt-modal');
    if (promptCallback) {
        promptCallback(accepted ? val : null);
        promptCallback = null;
    }
}

function showCustomConfirm(message, callback) {
    document.getElementById('confirm-msg').textContent = message;
    confirmCallback = callback;
    openModal('confirm-modal');
}

function closeConfirmModal(accepted) {
    closeModal('confirm-modal');
    if (confirmCallback) {
        confirmCallback(accepted);
        confirmCallback = null;
    }
}

// --- Table Insertion (Restores Caret) ---

function insertTable() {
    restoreEditorSelection();
    const rows = parseInt(document.getElementById('table-rows').value) || 2;
    const cols = parseInt(document.getElementById('table-cols').value) || 2;

    let html = '<table><thead><tr>';
    for (let j = 0; j < cols; j++) {
        html += `<th><br></th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < rows; i++) {
        html += '<tr>';
        for (let j = 0; j < cols; j++) {
            html += `<td><br></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';

    document.execCommand('insertHTML', false, html);
    closeModal('table-modal');
    saveCurrentStateToMemory();
    showToast("Table inserted");
}

// --- Image Insertion (Restores Caret) ---

function insertImage() {
    restoreEditorSelection();
    const url = document.getElementById('img-url').value.trim();
    const file = document.getElementById('img-file').files[0];

    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            showToast("Warning: Large image may take longer to save");
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof pushRichSnapshot === 'function') pushRichSnapshot();
            const img = `<img src="${e.target.result}" alt="Inserted image"><p><br></p>`;
            document.execCommand('insertHTML', false, img);
            closeModal('image-modal');
            if (typeof initImageInteractions === 'function') initImageInteractions();
            if (typeof pushRichSnapshot === 'function') pushRichSnapshot();
            saveCurrentStateToMemory();
            showToast("Image inserted");
        };
        reader.readAsDataURL(file);
    } else if (url) {
        if (typeof pushRichSnapshot === 'function') pushRichSnapshot();
        const img = `<img src="${url}" alt="Inserted image"><p><br></p>`;
        document.execCommand('insertHTML', false, img);
        closeModal('image-modal');
        if (typeof initImageInteractions === 'function') initImageInteractions();
        if (typeof pushRichSnapshot === 'function') pushRichSnapshot();
        saveCurrentStateToMemory();
        showToast("Image inserted");
    } else {
        showToast("Please provide an image URL or choose a file");
    }
}

// --- Link Insertion (Restores Caret) ---

function insertLink() {
    restoreEditorSelection();
    let url = document.getElementById('link-url').value.trim();
    const text = document.getElementById('link-text').value.trim() || url;

    if (!url) {
        showToast("Please provide a URL");
        return;
    }

    if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('mailto:')) {
        url = 'https://' + url;
    }

    if (AppState.isRichTextMode) {
        const link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        document.execCommand('insertHTML', false, link);
    } else {
        const plainEditor = document.getElementById('plain-editor');
        if (plainEditor) {
            const start = plainEditor.selectionStart || 0;
            const end = plainEditor.selectionEnd || 0;
            const val = plainEditor.value;
            const linkText = `[${text}](${url})`;
            plainEditor.value = val.substring(0, start) + linkText + val.substring(end);
            plainEditor.selectionStart = plainEditor.selectionEnd = start + linkText.length;
            plainEditor.focus();
        }
    }
    closeModal('link-modal');
    saveCurrentStateToMemory();
    showToast("Link inserted");
}

// --- Word Cloud Modal (Fixed BUG-15: Responsive Boundary Coordinates) ---

function openWordCloudModal() {
    const container = document.getElementById('cloud-container');
    container.innerHTML = '';

    const text = AppState.isRichTextMode 
        ? document.getElementById('rich-editor').innerText 
        : document.getElementById('plain-editor').value;

    if (!text || !text.trim()) {
        showToast("Document is empty");
        return;
    }

    openModal('wordcloud-modal');

    // Wait for modal to render to read real container dimensions
    setTimeout(() => {
        const containerWidth = container.clientWidth || 450;
        const containerHeight = container.clientHeight || 300;

        const words = text.toLowerCase()
            .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>[\]]/g, "")
            .replace(/\s+/g, " ")
            .split(' ');

        const counts = {};
        words.forEach(w => {
            if (w.length > 2) counts[w] = (counts[w] || 0) + 1;
        });

        const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 30);

        if (sorted.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding-top:130px; color:var(--text-muted);">No words to display</div>';
            return;
        }

        const maxCount = counts[sorted[0]];

        sorted.forEach(word => {
            const count = counts[word];
            const size = Math.round(12 + ((count / maxCount) * 26));

            const el = document.createElement('div');
            el.className = 'cloud-word';
            el.textContent = word;
            el.style.fontSize = size + 'px';
            el.style.fontWeight = count > maxCount / 2 ? '700' : '500';
            el.style.color = `hsl(${Math.floor(Math.random() * 360)}, 65%, 45%)`;

            // Dynamic boundary check to prevent words spilling off-screen
            const maxLeft = Math.max(10, containerWidth - (word.length * size * 0.65) - 20);
            const maxTop = Math.max(10, containerHeight - size - 20);

            const left = Math.floor(Math.random() * maxLeft);
            const top = Math.floor(Math.random() * maxTop);

            el.style.left = left + 'px';
            el.style.top = top + 'px';

            el.onclick = () => {
                closeModal('wordcloud-modal');
                if (AppState.isRichTextMode) {
                    formatDoc('insertText', word + ' ');
                } else {
                    const ed = document.getElementById('plain-editor');
                    const start = ed.selectionStart;
                    ed.value = ed.value.substring(0, start) + word + ' ' + ed.value.substring(start);
                    ed.selectionStart = ed.selectionEnd = start + word.length + 1;
                    pushHistory(ed.value);
                    updateStats();
                    saveCurrentStateToMemory();
                }
            };

            container.appendChild(el);
        });
    }, 80);
}

// Clear Storage Confirmation (Wipes IndexedDB & Memory)
async function confirmClearStorage() {
    closeModal('clear-modal');
    try {
        if (typeof AppDB !== 'undefined' && AppDB.clearAll) {
            await AppDB.clearAll();
        }
    } catch (e) {
        console.warn("Error clearing IndexedDB:", e);
    }
    try {
        if (typeof localStorage !== 'undefined') localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    } catch (e) {}
    showToast("Storage cleared. Reloading...");
    setTimeout(() => location.reload(), 400);
}

// --- Settings Modal Controller ---

function initSettingsModal() {
    const themeSelect = document.getElementById('settings-theme-select');
    const fontSelect = document.getElementById('settings-font-family');
    const fontSizeInput = document.getElementById('settings-font-size');
    const wordWrapCheck = document.getElementById('settings-word-wrap');
    const spellcheckCheck = document.getElementById('settings-spellcheck');
    const statusBarCheck = document.getElementById('settings-status-bar');
    const autoSaveCheck = document.getElementById('settings-auto-save');

    if (themeSelect) {
        themeSelect.value = AppState.currentTheme || 'light';
    }

    const currEditor = getCurrentEditor();
    if (fontSelect && currEditor) {
        const computedFont = currEditor.style.fontFamily || "'Segoe UI', sans-serif";
        for (let i = 0; i < fontSelect.options.length; i++) {
            const optVal = fontSelect.options[i].value;
            if (computedFont.includes(optVal.replace(/['",]/g, '')) || optVal === computedFont) {
                fontSelect.selectedIndex = i;
                break;
            }
        }
    }

    if (fontSizeInput && currEditor) {
        fontSizeInput.value = parseInt(currEditor.style.fontSize) || 16;
    }

    if (wordWrapCheck) {
        wordWrapCheck.checked = !!AppState.isWordWrap;
    }

    if (spellcheckCheck) {
        spellcheckCheck.checked = document.getElementById('plain-editor')?.spellcheck ?? true;
    }

    if (statusBarCheck) {
        const statusBar = document.getElementById('status-bar');
        statusBarCheck.checked = statusBar ? statusBar.style.display !== 'none' : true;
    }

    if (autoSaveCheck) {
        autoSaveCheck.checked = !!AppState.autoSaveEnabled;
    }
}

function saveSettingsModal() {
    const themeSelect = document.getElementById('settings-theme-select');
    const fontSelect = document.getElementById('settings-font-family');
    const fontSizeInput = document.getElementById('settings-font-size');
    const wordWrapCheck = document.getElementById('settings-word-wrap');
    const spellcheckCheck = document.getElementById('settings-spellcheck');
    const statusBarCheck = document.getElementById('settings-status-bar');
    const autoSaveCheck = document.getElementById('settings-auto-save');

    if (themeSelect && themeSelect.value !== AppState.currentTheme) {
        setTheme(themeSelect.value);
    }

    if (fontSelect && fontSizeInput) {
        const font = fontSelect.value;
        const size = parseInt(fontSizeInput.value) || 16;
        
        document.getElementById('rich-editor').style.fontFamily = font;
        document.getElementById('rich-editor').style.fontSize = size + 'px';
        document.getElementById('plain-editor').style.fontFamily = font;
        document.getElementById('plain-editor').style.fontSize = size + 'px';

        const toolbarFont = document.getElementById('font-family-select');
        const toolbarSize = document.getElementById('font-size-input');
        if (toolbarFont) toolbarFont.value = font;
        if (toolbarSize) toolbarSize.value = size;

        const currFile = AppState.files.find(f => f.id === AppState.currentFileId);
        if (currFile) {
            currFile.font = { family: font, size: size + 'px' };
        }
    }

    if (wordWrapCheck) {
        AppState.isWordWrap = wordWrapCheck.checked;
        document.getElementById('plain-editor').classList.toggle('wrap', AppState.isWordWrap);
    }

    if (spellcheckCheck) {
        const sp = spellcheckCheck.checked;
        document.getElementById('rich-editor').spellcheck = sp;
        document.getElementById('plain-editor').spellcheck = sp;
    }

    if (statusBarCheck) {
        const statusBar = document.getElementById('status-bar');
        if (statusBar) {
            statusBar.style.display = statusBarCheck.checked ? 'flex' : 'none';
        }
    }

    if (autoSaveCheck) {
        AppState.autoSaveEnabled = autoSaveCheck.checked;
    }

    updateMenuUI();
    saveCurrentStateToMemory();
    if (typeof saveAppSettings === 'function') saveAppSettings();
    closeModal('settings-modal');
    showToast("Settings applied successfully");
}

// --- Document Statistics Modal (MS Word style) ---

function updateWordCountModal() {
    const text = AppState.isRichTextMode 
        ? (document.getElementById('rich-editor')?.innerText || "")
        : (document.getElementById('plain-editor')?.value || "");

    const words = (text.trim().match(/\S+/g) || []).length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const charsWithSpaces = text.length;
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0).length || (text.trim() ? 1 : 0);
    const lines = text.split('\n').length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl('stat-modal-words', words.toLocaleString());
    setEl('stat-modal-chars-nospace', charsNoSpaces.toLocaleString());
    setEl('stat-modal-chars-space', charsWithSpaces.toLocaleString());
    setEl('stat-modal-paragraphs', paragraphs.toLocaleString());
    setEl('stat-modal-lines', lines.toLocaleString());
    setEl('stat-modal-reading-time', `~${readingTime} min`);
}

// --- Export Functions ---

function exportDocument(format) {
    const file = AppState.files.find(f => f.id === AppState.currentFileId);
    const baseTitle = file ? file.name.replace(/\.[^/.]+$/, "") : "Document";
    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');

    switch (format) {
        case 'txt': {
            const text = AppState.isRichTextMode ? richEditor.innerText : plainEditor.value;
            downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseTitle}.txt`);
            showToast(`Exported as ${baseTitle}.txt`);
            break;
        }
        case 'html': {
            const bodyContent = AppState.isRichTextMode ? richEditor.innerHTML : plainEditor.value.replace(/\n/g, '<br>');
            const doc = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${baseTitle}</title>\n<style>\nbody { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #222; }\ntable { border-collapse: collapse; width: 100%; margin: 16px 0; }\nth, td { border: 1px solid #ccc; padding: 8px 12px; }\nth { background: #f4f4f4; }\nimg { max-width: 100%; height: auto; }\n</style>\n</head>\n<body>\n${bodyContent}\n</body>\n</html>`;
            downloadBlob(new Blob([doc], { type: 'text/html;charset=utf-8' }), `${baseTitle}.html`);
            showToast(`Exported as ${baseTitle}.html`);
            break;
        }
        case 'doc': {
            // Microsoft Word Compatible Document format
            const bodyContent = AppState.isRichTextMode ? richEditor.innerHTML : plainEditor.value.replace(/\n/g, '<br>');
            const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>\n<head><meta charset='utf-8'><title>${baseTitle}</title>\n<style>\nbody { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.5; }\ntable { border-collapse: collapse; width: 100%; }\nth, td { border: 1px solid #999; padding: 6px 10px; }\nth { background: #eee; }\n</style>\n</head>\n<body>${bodyContent}</body>\n</html>`;
            downloadBlob(new Blob(['\ufeff', wordDoc], { type: 'application/msword' }), `${baseTitle}.doc`);
            showToast(`Exported as ${baseTitle}.doc (Word Document)`);
            break;
        }
        case 'md': {
            const text = AppState.isRichTextMode ? htmlToMarkdown(richEditor.innerHTML) : plainEditor.value;
            downloadBlob(new Blob([text], { type: 'text/markdown;charset=utf-8' }), `${baseTitle}.md`);
            showToast(`Exported as ${baseTitle}.md`);
            break;
        }
        case 'rtf': {
            const text = AppState.isRichTextMode ? richEditor.innerText : plainEditor.value;
            const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Segoe UI;}}\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs22 ${text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\par\n')}\\par\n}`;
            downloadBlob(new Blob([rtf], { type: 'application/rtf' }), `${baseTitle}.rtf`);
            showToast(`Exported as ${baseTitle}.rtf`);
            break;
        }
        case 'pdf': {
            window.print();
            break;
        }
    }
    closeModal('export-modal');
}

function htmlToMarkdown(html) {
    if (!html) return "";
    let md = html;
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
    md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    md = md.replace(/<hr[^>]*>/gi, '\n---\n\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<br\s*[\/]?>/gi, '\n');
    md = md.replace(/<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<[^>]+>/g, '');
    return md.trim();
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
    }, 150);
}

function initFontModal() {
    const cur = AppState.files.find(f => f.id === AppState.currentFileId);
    const fontFamModal = document.getElementById('font-family-modal');
    const fontSizeModal = document.getElementById('font-size-modal');
    
    let currentFamily = 'Segoe UI';
    let currentSize = 16;
    
    if (AppState.isRichTextMode) {
        const richEditor = document.getElementById('rich-editor');
        if (richEditor) {
            const comp = window.getComputedStyle(richEditor);
            if (comp.fontFamily) currentFamily = comp.fontFamily;
            if (comp.fontSize) currentSize = parseInt(comp.fontSize) || 16;
        }
    } else {
        const plainEditor = document.getElementById('plain-editor');
        if (plainEditor) {
            const comp = window.getComputedStyle(plainEditor);
            if (comp.fontFamily) currentFamily = comp.fontFamily;
            if (comp.fontSize) currentSize = parseInt(comp.fontSize) || 16;
        }
    }
    
    if (cur && cur.font) {
        if (cur.font.family) currentFamily = cur.font.family;
        if (cur.font.size) currentSize = parseInt(cur.font.size) || currentSize;
    }
    
    if (fontFamModal) {
        const cleanTarget = currentFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
        for (let i = 0; i < fontFamModal.options.length; i++) {
            const optVal = fontFamModal.options[i].value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
            const optText = fontFamModal.options[i].text.trim().toLowerCase();
            if (optVal === cleanTarget || optText === cleanTarget || optVal.includes(cleanTarget) || cleanTarget.includes(optVal)) {
                fontFamModal.selectedIndex = i;
                break;
            }
        }
    }
    
    if (fontSizeModal) {
        fontSizeModal.value = currentSize;
    }
}



