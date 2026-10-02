/* ==========================================================================
   Ultimate Web Notepad - Application State & IndexedDB Storage Management
   ========================================================================== */

const STORAGE_KEY = 'webnotepad_fixed_files';
const RECENT_KEY = 'webnotepad_fixed_recent';
const CLOSED_KEY = 'webnotepad_fixed_closed';
const THEME_KEY = 'webnotepad_theme';
const SETTINGS_KEY = 'webnotepad_settings';

// --- IndexedDB Persistent Storage Layer ---
const DB_NAME = 'WebNotepadDB';
const DB_VERSION = 1;

const AppDB = {
    db: null,
    isReady: false,
    readyPromise: null,

    init() {
        if (this.db) return Promise.resolve(this.db);
        if (this.readyPromise) return this.readyPromise;

        this.readyPromise = new Promise((resolve) => {
            if (typeof window === 'undefined' || !window.indexedDB) {
                console.warn("IndexedDB not supported in this environment, using memory fallback.");
                this.isReady = false;
                return resolve(null);
            }

            try {
                const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('files')) {
                        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                        fileStore.createIndex('name', 'name', { unique: false });
                        fileStore.createIndex('order', 'order', { unique: false });
                        fileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                    if (!db.objectStoreNames.contains('recentFiles')) {
                        db.createObjectStore('recentFiles', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('closedFiles')) {
                        db.createObjectStore('closedFiles', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings', { keyPath: 'key' });
                    }
                };

                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    this.isReady = true;
                    resolve(this.db);
                };

                request.onerror = (e) => {
                    console.error("IndexedDB open error:", e.target.error);
                    this.isReady = false;
                    resolve(null);
                };
            } catch (err) {
                console.error("IndexedDB initialization error:", err);
                this.isReady = false;
                resolve(null);
            }
        });

        return this.readyPromise;
    },

    async getAll(storeName) {
        const db = await this.init();
        if (!db) return [];
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch (e) {
                console.error(`Error reading ${storeName}:`, e);
                resolve([]);
            }
        });
    },

    async get(storeName, key) {
        const db = await this.init();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch (e) {
                console.error(`Error getting ${key} from ${storeName}:`, e);
                resolve(null);
            }
        });
    },

    async put(storeName, item) {
        const db = await this.init();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(item);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (e) {
                console.error(`Error saving to ${storeName}:`, e);
                resolve(null);
            }
        });
    },

    async delete(storeName, key) {
        const db = await this.init();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (e) {
                console.error(`Error deleting ${key} from ${storeName}:`, e);
                resolve(false);
            }
        });
    },

    async clear(storeName) {
        const db = await this.init();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.clear();
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (e) {
                console.error(`Error clearing ${storeName}:`, e);
                resolve(false);
            }
        });
    },

    async saveAllFiles(files) {
        const db = await this.init();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                store.clear();
                if (Array.isArray(files)) {
                    files.forEach((file, index) => {
                        store.put({
                            ...file,
                            order: index,
                            updatedAt: file.updatedAt || Date.now()
                        });
                    });
                }
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                console.error("Error saving all files:", e);
                resolve(false);
            }
        });
    },

    async saveRecentList(recentFiles) {
        const db = await this.init();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction('recentFiles', 'readwrite');
                const store = tx.objectStore('recentFiles');
                store.clear();
                if (Array.isArray(recentFiles)) {
                    recentFiles.slice(0, 50).forEach(f => store.put(f));
                }
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                console.error("Error saving recent files:", e);
                resolve(false);
            }
        });
    },

    async saveClosedList(closedFiles) {
        const db = await this.init();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction('closedFiles', 'readwrite');
                const store = tx.objectStore('closedFiles');
                store.clear();
                if (Array.isArray(closedFiles)) {
                    closedFiles.slice(0, 50).forEach(f => store.put(f));
                }
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                console.error("Error saving closed files:", e);
                resolve(false);
            }
        });
    },

    async setSetting(key, value) {
        return this.put('settings', { key, value });
    },

    async getSetting(key, defaultValue = null) {
        const res = await this.get('settings', key);
        return res ? res.value : defaultValue;
    },

    async clearAll() {
        const db = await this.init();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(['files', 'recentFiles', 'closedFiles', 'settings'], 'readwrite');
                tx.objectStore('files').clear();
                tx.objectStore('recentFiles').clear();
                tx.objectStore('closedFiles').clear();
                tx.objectStore('settings').clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                console.error("Error clearing all stores:", e);
                resolve(false);
            }
        });
    }
};

// Automatic one-time migration from localStorage into IndexedDB (zero data loss)
async function migrateLocalStorageToIndexedDB() {
    try {
        if (typeof localStorage === 'undefined') return;
        const rawFiles = localStorage.getItem(STORAGE_KEY);
        const rawRecent = localStorage.getItem(RECENT_KEY);
        const rawClosed = localStorage.getItem(CLOSED_KEY);
        const rawTheme = localStorage.getItem(THEME_KEY);

        if (rawFiles) {
            const files = JSON.parse(rawFiles);
            if (Array.isArray(files) && files.length > 0) {
                const existing = await AppDB.getAll('files');
                if (existing.length === 0) {
                    await AppDB.saveAllFiles(files);
                }
            }
            localStorage.removeItem(STORAGE_KEY);
        }

        if (rawRecent) {
            const recent = JSON.parse(rawRecent);
            if (Array.isArray(recent) && recent.length > 0) {
                const existingRecent = await AppDB.getAll('recentFiles');
                if (existingRecent.length === 0) {
                    await AppDB.saveRecentList(recent);
                }
            }
            localStorage.removeItem(RECENT_KEY);
        }

        if (rawClosed) {
            const closed = JSON.parse(rawClosed);
            if (Array.isArray(closed) && closed.length > 0) {
                const existingClosed = await AppDB.getAll('closedFiles');
                if (existingClosed.length === 0) {
                    await AppDB.saveClosedList(closed);
                }
            }
            localStorage.removeItem(CLOSED_KEY);
        }

        if (rawTheme) {
            await AppDB.setSetting('theme', rawTheme);
        }
    } catch (e) {
        console.warn("Migration from localStorage encountered warning:", e);
    }
}

// --- Global Application State ---
const AppState = {
    files: [],
    currentFileId: null,
    recentFiles: [],
    closedFiles: [],
    isSwitchingFiles: false,
    isRichTextMode: true,
    isWordWrap: true,
    autoSaveEnabled: true,
    autoSaveTimer: null,
    currentTheme: 'light',
    
    // Plain text undo/redo history
    undoStack: [],
    undoIndex: -1,
    maxHistory: 50,
    
    // Rich text undo/redo history (snapshots HTML, canvas strokes, shapes, page breaks)
    richUndoStack: [],
    richUndoIndex: -1,
    
    // Active typing font settings (persisted across typing, new lines, and file loads)
    activeFontFamily: "'Segoe UI', sans-serif",
    activeFontSize: "16px",
    
    // Active text color & highlight formatting for future typing
    activeTextColor: null,
    activeHiliteColor: null,

    // Saved selection for modal insertion
    savedSelection: null
};

// --- Storage Functions (Powered by IndexedDB) ---

async function loadFilesFromStorage() {
    await migrateLocalStorageToIndexedDB();

    try {
        const storedFiles = await AppDB.getAll('files');
        if (Array.isArray(storedFiles) && storedFiles.length > 0) {
            storedFiles.sort((a, b) => (a.order || 0) - (b.order || 0));
            AppState.files = storedFiles;
        } else {
            AppState.files = [];
        }
    } catch (e) {
        console.error("Failed to parse saved files from IndexedDB", e);
        AppState.files = [];
    }

    if (!Array.isArray(AppState.files) || AppState.files.length === 0) {
        createNewFile(true); // Initial startup file
    } else {
        // Ensure data consistency
        AppState.files.forEach((f, idx) => {
            if (f.content === undefined) f.content = f.textContent || "";
            if (f.textContent === undefined) f.textContent = stripHtml(f.content);
            if (f.isRichText === undefined) f.isRichText = true;
            if (!f.font) f.font = { family: "'Segoe UI', sans-serif", size: "16px" };
            f.order = idx;
        });

        // Restore active file or default to first
        let targetId = AppState.files[0].id;
        try {
            const savedCurrentId = await AppDB.getSetting('currentFileId');
            if (savedCurrentId && AppState.files.some(f => f.id === savedCurrentId)) {
                targetId = savedCurrentId;
            }
        } catch (e) {}

        loadFileContent(targetId);
    }
}

function saveCurrentStateToMemory(showVisual = false) {
    // CRITICAL FIX: If currently transitioning between files, NEVER overwrite file contents!
    if (AppState.isSwitchingFiles) return;
    if (!AppState.currentFileId) return;

    const fileIndex = AppState.files.findIndex(f => f.id === AppState.currentFileId);
    if (fileIndex === -1) return;

    const richEditor = document.getElementById('rich-editor');
    const plainEditor = document.getElementById('plain-editor');
    if (!richEditor || !plainEditor) return;

    AppState.files[fileIndex].isRichText = AppState.isRichTextMode;
    
    if (AppState.isRichTextMode) {
        AppState.files[fileIndex].content = richEditor.innerHTML;
        AppState.files[fileIndex].textContent = richEditor.innerText;
    } else {
        AppState.files[fileIndex].textContent = plainEditor.value;
        AppState.files[fileIndex].content = plainEditor.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
    }

    AppState.files[fileIndex].font = {
        family: richEditor.style.fontFamily || "'Segoe UI', sans-serif",
        size: richEditor.style.fontSize || "16px"
    };
    const isWm = document.body.classList.contains('watermarked') || richEditor.classList.contains('watermarked');
    AppState.files[fileIndex].watermark = isWm ? (richEditor.getAttribute('data-watermark') || "CONFIDENTIAL") : null;
    AppState.files[fileIndex].order = fileIndex;
    AppState.files[fileIndex].updatedAt = Date.now();

    // Persist into IndexedDB asynchronously without blocking UI
    AppDB.put('files', AppState.files[fileIndex]).catch(e => console.warn("IDB put error:", e));
    AppDB.setSetting('currentFileId', AppState.currentFileId).catch(() => {});

    if (showVisual) {
        if (typeof triggerAutoSaveVisual === 'function') {
            triggerAutoSaveVisual();
        }
    } else if (typeof setAutoSaveStatus === 'function') {
        setAutoSaveStatus('saved');
    }
}

// --- App Settings Persistence (Powered by IndexedDB) ---

async function saveAppSettings() {
    try {
        const s = document.getElementById('status-bar');
        const statusBarVisible = s ? (s.style.display !== 'none' && !s.classList.contains('hidden') && !s.classList.contains('status-bar-hidden')) : true;
        const p = document.getElementById('plain-editor');
        const spellcheck = p ? p.spellcheck !== false : true;

        await AppDB.setSetting('appSettings', {
            wordWrap: !!AppState.isWordWrap,
            autoSave: !!AppState.autoSaveEnabled,
            statusBar: statusBarVisible,
            spellcheck: spellcheck
        });
    } catch (e) {}
}

async function loadAppSettings() {
    try {
        const settings = await AppDB.getSetting('appSettings');
        if (settings) {
            if (typeof settings.wordWrap === 'boolean') {
                AppState.isWordWrap = settings.wordWrap;
                if (typeof applyWordWrapState === 'function') {
                    applyWordWrapState();
                } else {
                    const plainEditor = document.getElementById('plain-editor');
                    if (plainEditor) plainEditor.classList.toggle('wrap', AppState.isWordWrap);
                }
            }
            if (typeof settings.autoSave === 'boolean') {
                AppState.autoSaveEnabled = settings.autoSave;
            }
            if (typeof settings.statusBar === 'boolean') {
                const s = document.getElementById('status-bar');
                if (s) {
                    if (settings.statusBar) {
                        s.classList.remove('hidden', 'status-bar-hidden');
                        s.style.display = 'flex';
                        document.body.classList.remove('hide-statusbar');
                    } else {
                        s.classList.add('hidden', 'status-bar-hidden');
                        s.style.display = 'none';
                        document.body.classList.add('hide-statusbar');
                    }
                }
            }
            if (typeof settings.spellcheck === 'boolean') {
                const r = document.getElementById('rich-editor');
                const p = document.getElementById('plain-editor');
                if (r) r.spellcheck = settings.spellcheck;
                if (p) p.spellcheck = settings.spellcheck;
            }
            if (typeof updateMenuUI === 'function') updateMenuUI();
        }
    } catch (e) {}
}

// --- Recent & Closed Files Management (Shows ALL Closed Files with Capacity of 50) ---

async function loadRecentFiles() {
    try {
        AppState.recentFiles = await AppDB.getAll('recentFiles') || [];
        AppState.recentFiles.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    } catch (e) {
        AppState.recentFiles = [];
    }

    try {
        AppState.closedFiles = await AppDB.getAll('closedFiles') || [];
        AppState.closedFiles.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
    } catch (e) {
        AppState.closedFiles = [];
    }

    renderRecentMenu();
    renderClosedFilesModal();
}

function addRecentFile(fileObj) {
    if (!fileObj || !fileObj.id) return;
    // Store complete file snapshot so closed files can be reopened with all content!
    const snapshot = {
        id: fileObj.id,
        name: fileObj.name,
        content: fileObj.content || "",
        textContent: fileObj.textContent || "",
        isRichText: fileObj.isRichText !== false,
        font: fileObj.font ? { ...fileObj.font } : { family: "'Segoe UI', sans-serif", size: "16px" },
        savedAt: Date.now()
    };

    AppState.recentFiles = AppState.recentFiles.filter(f => f.id !== fileObj.id && f.name !== fileObj.name);
    AppState.recentFiles.unshift(snapshot);
    if (AppState.recentFiles.length > 50) AppState.recentFiles.pop();

    AppDB.saveRecentList(AppState.recentFiles);
    renderRecentMenu();
}

function addClosedFile(fileObj) {
    if (!fileObj) return;
    const snapshot = {
        id: fileObj.id,
        name: fileObj.name,
        content: fileObj.content || "",
        textContent: fileObj.textContent || stripHtml(fileObj.content || ""),
        isRichText: fileObj.isRichText !== false,
        font: fileObj.font ? { ...fileObj.font } : { family: "'Segoe UI', sans-serif", size: "16px" },
        closedAt: Date.now()
    };

    if (!Array.isArray(AppState.closedFiles)) AppState.closedFiles = [];
    // Remove if previously in closed list to avoid duplicates
    AppState.closedFiles = AppState.closedFiles.filter(f => f.name !== fileObj.name);
    AppState.closedFiles.unshift(snapshot);
    if (AppState.closedFiles.length > 50) AppState.closedFiles.pop();

    AppDB.saveClosedList(AppState.closedFiles);
    addRecentFile(fileObj);
    renderRecentMenu();
    renderClosedFilesModal();
}

function reopenClosedFile() {
    if (!Array.isArray(AppState.closedFiles) || AppState.closedFiles.length === 0) {
        // Try to find the most recent file that is not currently open
        const notOpen = AppState.recentFiles.find(r => !AppState.files.some(f => f.name === r.name));
        if (notOpen) {
            reopenSpecificRecentFile(notOpen.id, notOpen);
            return;
        }
        showToast("No recently closed files to reopen");
        return;
    }

    const fileToReopen = AppState.closedFiles.shift();
    AppDB.saveClosedList(AppState.closedFiles);

    reopenSpecificRecentFile(fileToReopen.id, fileToReopen);
}

function reopenSpecificRecentFile(fileId, directSnapshot = null) {
    // 1. If file is already open, simply switch to it cleanly
    const existing = AppState.files.find(f => f.id === fileId || (directSnapshot && f.name === directSnapshot.name));
    if (existing) {
        saveCurrentStateToMemory();
        loadFileContent(existing.id);
        showToast(`Switched to "${existing.name}"`);
        return;
    }

    // 2. Locate snapshot in memory or storage
    const snapshot = directSnapshot || 
        AppState.closedFiles.find(f => f.id === fileId) ||
        AppState.recentFiles.find(f => f.id === fileId);

    if (!snapshot) {
        showToast("File data could not be recovered");
        return;
    }

    // Save current active document before opening new document
    saveCurrentStateToMemory();

    // Ensure unique name so it doesn't conflict with any active tab
    const uniqueName = getUniqueFileName(snapshot.name);

    const restoredFile = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: uniqueName,
        content: snapshot.content || "",
        textContent: snapshot.textContent || stripHtml(snapshot.content || ""),
        isRichText: snapshot.isRichText !== false,
        font: snapshot.font ? { ...snapshot.font } : { family: "'Segoe UI', sans-serif", size: "16px" }
    };

    // Remove from closed files since it is now being reopened
    AppState.closedFiles = AppState.closedFiles.filter(f => f.id !== fileId && f.name !== snapshot.name);
    AppDB.delete('closedFiles', snapshot.id);
    AppDB.saveClosedList(AppState.closedFiles);

    AppState.files.push(restoredFile);
    AppDB.put('files', restoredFile);
    loadFileContent(restoredFile.id);
    saveCurrentStateToMemory();
    renderRecentMenu();
    renderClosedFilesModal();
    showToast(`Reopened "${restoredFile.name}"`);
}

function reopenAllClosedFiles() {
    if (!Array.isArray(AppState.closedFiles) || AppState.closedFiles.length === 0) {
        showToast("No closed files in history to reopen");
        return;
    }

    saveCurrentStateToMemory();
    const toReopen = [...AppState.closedFiles];
    let count = 0;
    let lastRestoredId = null;

    toReopen.forEach(snapshot => {
        // If not already open
        if (!AppState.files.some(f => f.name === snapshot.name)) {
            const uniqueName = getUniqueFileName(snapshot.name);
            const restoredFile = {
                id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: uniqueName,
                content: snapshot.content || "",
                textContent: snapshot.textContent || stripHtml(snapshot.content || ""),
                isRichText: snapshot.isRichText !== false,
                font: snapshot.font ? { ...snapshot.font } : { family: "'Segoe UI', sans-serif", size: "16px" }
            };
            AppState.files.push(restoredFile);
            lastRestoredId = restoredFile.id;
            count++;
        }
    });

    AppState.closedFiles = [];
    AppDB.clear('closedFiles');
    AppDB.saveAllFiles(AppState.files);

    if (lastRestoredId) {
        loadFileContent(lastRestoredId);
    } else {
        renderTabs();
    }

    saveCurrentStateToMemory();
    renderRecentMenu();
    renderClosedFilesModal();
    closeModal('closed-files-modal');
    showToast(count > 0 ? `Reopened ${count} document${count > 1 ? 's' : ''}` : "All documents were already open");
}

function deleteClosedFile(fileId) {
    AppState.closedFiles = AppState.closedFiles.filter(f => f.id !== fileId);
    AppDB.delete('closedFiles', fileId);
    AppDB.saveClosedList(AppState.closedFiles);
    if (typeof renderRecentClosedModal === 'function') renderRecentClosedModal();
    else { renderRecentMenu(); renderClosedFilesModal(); }
    showToast("Document removed from history");
}

function clearRecentAndClosedHistory() {
    AppState.closedFiles = [];
    AppState.recentFiles = [];
    AppDB.clear('closedFiles');
    AppDB.clear('recentFiles');
    if (typeof renderRecentClosedModal === 'function') renderRecentClosedModal();
    else { renderRecentMenu(); renderClosedFilesModal(); }
    showToast("File history cleared");
}

// --- Unique File Naming (Prevents Duplicate Names) ---

function getUniqueFileName(desiredName, currentFileId = null) {
    let name = (desiredName && desiredName.trim()) ? desiredName.trim() : "Untitled.txt";
    const existingNames = AppState.files
        .filter(f => f.id !== currentFileId)
        .map(f => f.name.toLowerCase());

    if (!existingNames.includes(name.toLowerCase())) {
        return name;
    }

    const dotIdx = name.lastIndexOf('.');
    const base = dotIdx > 0 ? name.substring(0, dotIdx) : name;
    const ext = dotIdx > 0 ? name.substring(dotIdx) : '';

    let counter = 1;
    let candidate = `${base} (${counter})${ext}`;
    while (existingNames.includes(candidate.toLowerCase())) {
        counter++;
        candidate = `${base} (${counter})${ext}`;
    }
    return candidate;
}

// --- Multi-File Operations (Fixed BUG-02 & BUG-23) ---

function createNewFile(isInit = false) {
    if (!isInit && AppState.currentFileId) {
        saveCurrentStateToMemory();
    }

    if (!isInit) {
        const defaultName = getUniqueFileName("Untitled.txt");
        showCustomPrompt("New File", defaultName, (name) => {
            // CRITICAL FIX: If user clicks Cancel or presses Escape, do NOT create file!
            if (name === null) return;
            const uniqueName = getUniqueFileName(name.trim() || "Untitled.txt");
            addFileToSystem(uniqueName, "", true, false, isInit);
        });
    } else {
        addFileToSystem("Untitled.txt", "", true, false, true);
    }
}

function addFileToSystem(name, content = "", isRich = true, isOpenedFile = false, isInit = false) {
    const newId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const uniqueName = isInit ? name : getUniqueFileName(name);

    const newFile = {
        id: newId,
        name: uniqueName,
        content: isRich ? content : (content ? content.replace(/\n/g, '<br>') : ""),
        textContent: isRich ? stripHtml(content) : content,
        isRichText: isRich,
        font: { family: "'Segoe UI', sans-serif", size: "16px" }
    };

    AppState.files.push(newFile);
    AppDB.put('files', newFile);
    loadFileContent(newId);

    if (!isInit) {
        addRecentFile(newFile);
        showToast(`Created ${uniqueName}`);
        saveCurrentStateToMemory();
    }
}

function deleteCurrentFile() {
    deleteSpecificFile(AppState.currentFileId);
}

function deleteSpecificFile(fileId) {
    if (!fileId) return;
    const targetFile = AppState.files.find(f => f.id === fileId);
    if (!targetFile) return;

    if (AppState.files.length <= 1) {
        showCustomConfirm("Clear this file contents and reset to Untitled?", (yes) => {
            if (yes) {
                targetFile.name = "Untitled.txt";
                targetFile.content = "";
                targetFile.textContent = "";
                loadFileContent(targetFile.id);
                saveCurrentStateToMemory();
                showToast("File reset");
            }
        });
        return;
    }

    showCustomConfirm(`Are you sure you want to delete "${targetFile.name}"?`, (yes) => {
        if (yes) {
            addClosedFile(targetFile);
            AppState.files = AppState.files.filter(f => f.id !== fileId);
            AppDB.delete('files', fileId);
            if (AppState.currentFileId === fileId) {
                const nextFileId = AppState.files[AppState.files.length - 1].id;
                loadFileContent(nextFileId);
            } else {
                renderTabs();
            }
            saveCurrentStateToMemory();
            showToast(`Deleted "${targetFile.name}"`);
        }
    });
}

function renameCurrentFile() {
    renameSpecificFile(AppState.currentFileId);
}

function renameSpecificFile(fileId) {
    saveCurrentStateToMemory();
    const file = AppState.files.find(f => f.id === fileId);
    if (!file) return;

    showCustomPrompt("Rename File", file.name, (newName) => {
        // CRITICAL FIX: If user clicks Cancel or presses Escape, do NOT rename!
        if (newName === null) return;
        const candidate = newName.trim();
        if (!candidate) return;

        // Prevent duplicate file names across open tabs
        const isDuplicate = AppState.files.some(f => f.id !== fileId && f.name.toLowerCase() === candidate.toLowerCase());
        if (isDuplicate) {
            showToast(`A file named "${candidate}" is already open!`);
            return;
        }

        file.name = candidate;
        renderTabs();
        saveCurrentStateToMemory();
        AppDB.put('files', file);
        addRecentFile(file);
        showToast(`Renamed to ${file.name}`);
    });
}

function duplicateFile(fileId) {
    saveCurrentStateToMemory();
    const source = AppState.files.find(f => f.id === fileId);
    if (!source) return;

    let baseName = source.name;
    const dotIdx = baseName.lastIndexOf('.');
    let candidate = "";
    if (dotIdx > 0) {
        candidate = baseName.substring(0, dotIdx) + " (Copy)" + baseName.substring(dotIdx);
    } else {
        candidate = baseName + " (Copy)";
    }

    const uniqueName = getUniqueFileName(candidate);
    addFileToSystem(uniqueName, source.content, source.isRichText, false, false);
    showToast(`Duplicated as ${uniqueName}`);
}

function saveSpecificFile(fileId) {
    saveCurrentStateToMemory();
    const file = AppState.files.find(f => f.id === fileId);
    if (!file) return;
    executeFileDownload(file);
}

function closeTab(id, e) {
    if (e) e.stopPropagation();

    const fileToClose = AppState.files.find(f => f.id === id);
    if (!fileToClose) return;

    // Save active state before closing
    saveCurrentStateToMemory();

    if (AppState.files.length <= 1) {
        // Last open file: reset to blank Untitled instead of closing
        showCustomConfirm("Clear and reset this file to a new blank document?", (yes) => {
            if (yes) {
                addClosedFile({ ...fileToClose });
                fileToClose.name = "Untitled.txt";
                fileToClose.content = "";
                fileToClose.textContent = "";
                fileToClose.isRichText = true;
                loadFileContent(fileToClose.id);
                saveCurrentStateToMemory();
                showToast("Workspace reset to blank document");
            }
        });
        return;
    }

    showCustomConfirm(`Close "${fileToClose.name}"? You can reopen it anytime from Recent Files.`, (yes) => {
        if (yes) {
            // Save to closed files archive
            addClosedFile(fileToClose);

            AppState.files = AppState.files.filter(f => f.id !== id);
            AppDB.delete('files', id);
            if (id === AppState.currentFileId) {
                const nextId = AppState.files[AppState.files.length - 1].id;
                loadFileContent(nextId);
            } else {
                renderTabs();
            }
            saveCurrentStateToMemory();
            showToast(`Closed "${fileToClose.name}". (Ctrl+Shift+T to reopen)`);
        }
    });
}

// Plain editor history
function pushHistory(val) {
    if (AppState.undoIndex < AppState.undoStack.length - 1) {
        AppState.undoStack = AppState.undoStack.slice(0, AppState.undoIndex + 1);
    }
    AppState.undoStack.push(val);
    if (AppState.undoStack.length > AppState.maxHistory) {
        AppState.undoStack.shift();
    } else {
        AppState.undoIndex++;
    }
}

function plainEditorUndo() {
    if (AppState.undoIndex > 0) {
        AppState.undoIndex--;
        document.getElementById('plain-editor').value = AppState.undoStack[AppState.undoIndex];
        updateStats();
        saveCurrentStateToMemory();
    }
}

function plainEditorRedo() {
    if (AppState.undoIndex < AppState.undoStack.length - 1) {
        AppState.undoIndex++;
        document.getElementById('plain-editor').value = AppState.undoStack[AppState.undoIndex];
        updateStats();
        saveCurrentStateToMemory();
    }
}

function stripHtml(html) {
    if (!html) return "";
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.innerText || tmp.textContent || "";
}
