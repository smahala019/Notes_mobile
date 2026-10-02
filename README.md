# 📝 Ultimate Web Notepad & MS Word Suite

A modern, high-performance, fully responsive web-based Word Processor and Code Notepad. Engineered with Vanilla JavaScript, HTML5, and CSS3, running 100% client-side in the browser with zero external framework dependencies, zero build steps, and complete offline capability.

Developed with ❤️ by **Sachin**. All Rights Reserved © 2026.

---

## 🌟 Key Highlights & Capabilities

### 1. ⚡ Real-Time Background Auto-Save & Visual Indicator
- **Live Status Feedback**:
  - **Yellow "Waiting.."**: Immediately activates with an animated breathing indicator dot whenever user interacts with the editor (typing, pasting, deleting, formatting).
  - **Green "Saved"**: Automatically displays with a steady glow dot as soon as user becomes idle and the background auto-save successfully writes to offline storage.
  - **Interactive Button**: Clicking the status indicator triggers an instant save or turns Auto-Save ON/OFF with live toast confirmation.
- **Zero-Conflict Multi-Tab Architecture**:
  - **Atomic Tab Switching**: Active document state is instantly committed to memory and persisted to IndexedDB before any new tab is loaded, guaranteeing zero content loss or tab bleeding.
  - **Safe Reopening**: Recently closed tabs can be reopened with unique identifier and state isolation.

### 2. 🕒 Unified 3-in-1 Recent & Closed Files Manager
- **Non-Clipping Floating Hover Preview**:
  - Previews dynamically escape scrollable container overflow boundaries using viewport-clamped fixed positioning.
  - Displays document name, status badge, word/character metrics, format type, and preview snippet.
- **Mobile & Touch Optimization**:
  - Embedded inline text snippets for touchscreens without hover capability.
  - Responsive toolbar container with flexible search and action buttons (`Reopen All Closed`, `Clear History`).
  - Touch-friendly action buttons with comfortable tap targets.

### 3. 🎬 Animated GIF Studio & Media Containers
- **Dual Engine GIF Search**:
  - Curated zero-latency offline GIF collections across 8 categories (Trending, Reactions, Celebrate, Funny, Dancing, Thumbs Up, Love, Animals).
  - Live internet GIF search via GIPHY API with dedicated `🔄 Refresh` button.
- **Responsive Container Grid**:
  - Fluid grid adapting from desktop multi-columns down to touch-friendly mobile layouts.
  - Full Dark Mode compatibility eliminating harsh white flashes.
- **Document Media Integration**:
  - Dedicated `.editor-gif` styling with responsive max-width clamping, rounded corners, soft shadows, and floating image toolbar selection.

### 4. 🛡️ Destructive Action Safety Guards
- **Clear All Document Warning**:
  - Prompts users with a custom confirmation dialog before wiping document contents.
  - Preserves undo history stack so users can press `Ctrl + Z` to restore cleared content.
- **Clear Styles Confirmation**:
  - Distinguishes between selected text formatting and document-wide style clearing.
  - Safely removes font attributes, colors, and inline styling without deleting images, tables, math blocks, or canvases.

### 5. 📊 Fully Responsive Mobile Status Bar
- **Mobile Status Bar Toggle**:
  - Corrected mobile CSS priority so users can toggle status bar visibility on mobile devices via Settings ribbon, Settings dialog, or top Three-Dots menu.
  - Auto-save indicator remains clearly visible on mobile screens.
- **Interactive Metrics**:
  - Clickable zoom scale reset (`100%`).
  - Tap `Words` / `Chars` to open the full Document Statistics modal.

### 6. 📄 Authentic MS Word Page Setup & Paper Sizes
- **Physical Paper Sizes**:
  - **A4 (Default)**: `210mm × 297mm`
  - **Letter**: `8.5" × 11"`
  - **Legal**: `8.5" × 14"`
  - **A3**: `297mm × 420mm`
  - **A5**: `148mm × 210mm`
  - **Executive**: `7.25" × 10.5"`
  - **Full Width**: Responsive viewport fluid mode
- **Physical Margin Presets**: Normal (`1"`), Narrow (`0.5"`), Moderate (`1" × 0.75"`), Wide (`1" × 1.5"`), and Custom / Zero margins.
- **Orientation Switching**: One-click toggle between Portrait and Landscape modes with automatic dimension transposition.
- **Document Watermark Studio**: Diagonal and horizontal watermarks (Draft, Confidential, Top Secret, Urgent, Custom text) with live opacity and font scaling.
- **Pixel-Perfect Print Engine**: Professional print output eliminating accidental blank pages, clipped borders, or layout distortion.

### 7. 📑 Authentic Ribbon Navigation (MS Word Style)
- **Categorized Ribbon Tabs**:
  - **File**: New, Open, Save, Save As, Import, Export, Print, and Document Stats.
  - **Home**: Clipboard, Font styling, Color studio, Alignment, Lists, Clear All, and Indentation.
  - **Insert**: Tables, Excel Tables, Shapes, Drawing Canvas, Images, GIFs, Links, Symbols, and Dividers.
  - **Layout**: Paper sizes, Margins, Orientations, Columns, Page Breaks, and Clear Styles.
  - **Tools**: Math Solver $f(x)$, Word Cloud, Sort Lines, Code Block, Calculator, and Voice Typing.
  - **Settings**: Visual themes, Status Bar toggle, Auto-save intervals, Default fonts, Paper preferences, and Storage management.

### 8. • MS Word Bullet & Numbering Libraries
- **8 Standard Bullet Styles**:
  - Solid Round Disc (`•`)
  - Hollow Circle (`○`)
  - Solid Square (`■`)
  - Diamond (`◆`)
  - Arrowhead (`➢`)
  - Checkmark (`✔`)
  - Star (`★`)
  - Em Dash (`—`)
- **7 Numbering Formats**: Standard (`1. 2. 3.`), Parentheses (`1) 2) 3)`), Capital Letters (`A. B. C.`), Small Letters (`a. b. c.`), Small Parentheses (`a) b) c)`), Roman Upper (`I. II. III.`), and Roman Lower (`i. ii. iii.`).
- **Smart Viewport-Clamped Dropdowns**: Dropdowns dynamically calculate viewport boundaries with `position: fixed` and high z-index. They never open beyond the editor and never get cut off on mobile screens.

### 9. 🎨 In-Built Browser Color Studio
- **Native Browser Color Pickers**: Directly triggers the operating system and browser native color dialog (`<input type="color">`) across iOS Safari, Android Chrome, and Desktop browsers.
- **Independent Color Channels**: Text Color (`foreColor`) and Highlight Color (`hiliteColor`) operate independently without style collision.
- **One-Click Normal Reset**: The `⊘ Normal` button cleanly strips font tags and inline highlight spans so users can immediately resume typing standard body text.

### 10. 📦 Shape Studio & Direct Document Shape Creator
- **20+ Geometric Shapes**: Rectangle, Rounded Rectangle, Circle, Callout Note, Diamond, Right Arrow, Left Arrow, Triangle, Star Banner, Hexagon, Pentagon, Heart, Cloud, Ribbon Badge, Pill / Stadium, Cylinder / Database, Octagon, Parallelogram, Trapezoid, Cross, and Custom paths.
- **Direct Custom Shape Creator**: Allows users to specify custom width, height, corner radius, and border thickness to generate shapes directly onto the document canvas.
- **Floating Shape Toolbar**: 8 directional resize handles, corner drag-to-move handle (`✥`), color fill swatches, border toggling, and one-click duplication (`📋 Duplicate`).

### 11. 🧮 Equation & Math Solver $f(x)$
- **Interactive Math Solver Bar**: Evaluates algebraic equations, linear formulas, powers (`^`), square roots (`√`), logarithms (`log`, `ln`), exponential functions (`exp`), trigonometric functions (`sin`, `cos`, `tan`), factorials (`!`), and constants ($\pi$, $e$).
- **Direct Document Insertion**: Formats equations and solutions into highlighted mathematical blocks ready for insertion with one click.

### 12. 🖌️ Canvas Paint Suite & Multi-Column Typography
- **Integrated Drawing Canvas**: Freehand sketching, drawing, and diagramming overlaid directly on the document sheet.
- **Multi-Column Typography**: Splits document sheets into 1, 2, 3, or 4 independent editorial columns formatted like authentic newspapers or magazine articles.

### 13. 📱 Mobile & Touch Responsive Excellence
- **Hidden Scrollbar Lines**: Removed visible scrollbar tracks below toolbar and menu buttons while retaining smooth native touch swipe (`touch-action: pan-x`).
- **Pointer Drag-to-Scroll**: Click-and-drag or swipe smoothly across all toolbar tabs and ribbon panels on touchscreens and desktop emulators.
- **Single-Row Mobile Status Bar**: Displays user attribution **"Made with ❤️ Sachin"**, cursor position (`Ln`, `Col`), word count, auto-save status ("Waiting.." / "Saved"), encoding, and zoom controls without awkward line breaks.
- **Mobile Format Drawer**: Dedicated **Format ▾** button opens a touch-friendly bottom sheet for rapid mobile formatting.

### 14. 🌓 Modern Fluent Light & High-Contrast OLED Dark Themes
- **Seamless Theme Switching**: Instant toggle between Windows 11 clean light mode and deep OLED dark mode.
- **WCAG AAA Contrast**: Explicit styling guarantees all text, labels, status items, dropdowns, and buttons remain crisp and legible in both modes.

---

## 🚀 Getting Started

No compilation, Node server, or build tooling required.

1. **Clone or Download** the repository:
   ```bash
   git clone https://github.com/your-username/notepad.git
   ```
2. **Open in any modern browser**:
   - Double-click `notepad.html` or open it directly in Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari.
   - For mobile testing over a local network:
     ```bash
     npx serve .
     ```

---

## ⌨️ Useful Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + N` | New Document Tab |
| `Ctrl + S` | Save File (Download / Storage) |
| `Ctrl + O` | Open File from Disk |
| `Ctrl + P` | Print Document Setup |
| `Ctrl + Shift + T` | Open Recent & Closed Documents |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + B` | Bold |
| `Ctrl + I` | Italic |
| `Ctrl + U` | Underline |
| `Ctrl + F` | Find & Replace |
| `Ctrl + Shift + S` | Toggle Shape Studio |
| `Ctrl + =` | Toggle Equation & Math Solver |

---

## 📁 Project Architecture

```
notepad/
├── notepad.html          # Main HTML5 application shell, ribbon UI & dialog modals
├── README.md             # Comprehensive documentation & feature guide
├── css/
│   ├── style.css         # Global design system, window layout & themes
│   ├── toolbar.css       # Ribbon toolbars, bullet/number menus, shapes & colors
│   ├── editor.css        # Document sheet, paper sizes, rulers, canvas, GIF & recent styles
│   ├── statusbar.css     # Responsive status bar, auto-save indicators & mobile breakpoints
│   ├── modals.css        # Dialog modals, GIF studio, settings & word count
│   └── print.css         # Physical print formatting rules
└── js/
    ├── state.js          # AppState, IndexedDB persistence, file model & history
    ├── editor.js         # Formatting, bullet libraries, shapes, math & tables
    ├── ui.js             # Ribbon navigation, tabs, safe floating preview & status sync
    ├── modals.js         # Dialog modal controllers (search, replace, about, settings)
    └── app.js            # Main controller, editor events & debounced auto-save
```

---

## 📄 License & Attribution

Designed, engineered, and maintained with dedication by **Sachin**.  
All Rights Reserved © 2026.
