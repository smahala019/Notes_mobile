# 📝 Ultimate Web Notepad & MS Word Suite

A modern, high-performance, fully responsive web-based Word Processor and Code Notepad. Engineered with Vanilla JavaScript, HTML5, and CSS3, running 100% client-side in the browser with zero external framework dependencies, zero build steps, and complete offline capability.

Developed with ❤️ by **Sachin**. All Rights Reserved © 2026.

---

## 🌟 Key Highlights & Capabilities

### 1. 📄 Authentic MS Word Page Setup & Paper Sizes
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

### 2. 📑 Authentic Ribbon Navigation (MS Word Style)
- **Categorized Ribbon Tabs**:
  - **File**: New, Open, Save, Save As, Import, Export, Print, and Document Stats.
  - **Home**: Clipboard, Font styling, Color studio, Alignment, Lists, and Indentation.
  - **Insert**: Tables, Excel Tables, Shapes, Drawing Canvas, Images, GIFs, Links, Symbols, and Dividers.
  - **Layout**: Paper sizes, Margins, Orientations, Columns, Page Breaks, and Watermarks.
  - **Tools**: Math Solver $f(x)$, Word Cloud, Sort Lines, Code Block, Calculator, and Voice Typing.
  - **Settings**: Visual themes, Auto-save intervals, Default fonts, Paper preferences, and Storage management.

### 3. • MS Word Bullet & Numbering Libraries
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
- **Smart Viewport-Clamped Dropdowns**: Dropdowns dynamically calculate viewport boundaries (`getBoundingClientRect()`) with `position: fixed` and high z-index. They never open beyond the editor, never get cut off on mobile screens, and flip vertically when near the screen edge.

### 4. 🎨 In-Built Browser Color Studio
- **Native Browser Color Pickers**: Directly triggers the operating system and browser native color dialog (`<input type="color">`) across iOS Safari, Android Chrome, and Desktop browsers.
- **Independent Color Channels**: Text Color (`foreColor`) and Highlight Color (`hiliteColor`) operate independently without style collision.
- **One-Click Normal Reset**: The `⊘ Normal` button cleanly strips font tags and inline highlight spans so users can immediately resume typing standard body text.

### 5. 📦 Shape Studio & Direct Document Shape Creator
- **20+ Geometric Shapes**: Rectangle, Rounded Rectangle, Circle, Callout Note, Diamond, Right Arrow, Left Arrow, Triangle, Star Banner, Hexagon, Pentagon, Heart, Cloud, Ribbon Badge, Pill / Stadium, Cylinder / Database, Octagon, Parallelogram, Trapezoid, Cross, and Custom paths.
- **Direct Custom Shape Creator**: Allows users to specify custom width, height, corner radius, and border thickness to generate shapes directly onto the document canvas.
- **Floating Shape Toolbar**: 8 directional resize handles, corner drag-to-move handle (`✥`), color fill swatches, border toggling, and one-click duplication (`📋 Duplicate`).

### 6. 🧮 Equation & Math Solver $f(x)$
- **Interactive Math Solver Bar**: Evaluates algebraic equations, linear formulas, powers (`^`), square roots (`√`), logarithms (`log`, `ln`), exponential functions (`exp`), trigonometric functions (`sin`, `cos`, `tan`), factorials (`!`), and constants ($\pi$, $e$).
- **Direct Document Insertion**: Formats equations and solutions into highlighted mathematical blocks ready for insertion with one click.

### 7. 🖌️ Canvas Paint Suite & Multi-Column Typography
- **Integrated Drawing Canvas**: Freehand sketching, drawing, and diagramming overlaid directly on the document sheet.
- **Multi-Column Typography**: Splits document sheets into 1, 2, 3, or 4 independent editorial columns formatted like authentic newspapers or magazine articles.

### 8. 📱 Mobile & Touch Responsive Excellence
- **Hidden Scrollbar Lines**: Removed visible scrollbar tracks below toolbar and menu buttons while retaining smooth native touch swipe (`touch-action: pan-x`).
- **Pointer Drag-to-Scroll**: Click-and-drag or swipe smoothly across all toolbar tabs and ribbon panels on touchscreens and desktop emulators.
- **Single-Row Mobile Status Bar**: Displays user attribution **"Made with ❤️ Sachin"**, cursor position (`Ln`, `Col`), word count, view mode toggle, encoding, and zoom controls without awkward line breaks.
- **Mobile Format Drawer**: Dedicated **Format ▾** button opens a touch-friendly bottom sheet for rapid mobile formatting.

### 9. 🌓 Modern Fluent Light & High-Contrast OLED Dark Themes
- **Seamless Theme Switching**: Instant toggle between Windows 11 clean light mode and deep OLED dark mode.
- **WCAG AAA Contrast**: Explicit styling guarantees all text, labels, status items, dropdowns, and buttons remain crisp and legible in both modes.

### 10. 💾 Multi-Tab Workspace & Offline Persistence
- **IndexedDB & LocalStorage**: Automatic background persistence with debounce saving.
- **Multi-Tab File Manager**: Create, rename, switch, duplicate, and close multiple documents concurrently.
- **Import & Export**: Open and save files in `.txt`, `.html`, `.doc`, `.md`, and `.pdf` formats.
- **Voice Typing**: Built-in speech-to-text dictation using the Web Speech API.

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
│   ├── editor.css        # Document sheet, paper sizes, rulers, canvas & tables
│   ├── statusbar.css     # Responsive status bar, mobile breakpoints & dark mode
│   ├── modals.css        # Dialog modals, settings, symbols & word count
│   └── print.css         # Physical print formatting rules
└── js/
    ├── app.js            # Main controller, drag-scrolling & auto-save
    ├── editor.js         # Formatting, bullet libraries, shapes, math & tables
    ├── ui.js             # Ribbon navigation, tabs, safe dropdowns & status sync
    ├── modals.js         # Dialog modal controllers (search, replace, about)
    ├── fileOps.js        # File open, save, export, import & format conversions
    └── storage.js        # IndexedDB & LocalStorage persistence manager
```

---

## 📄 License & Attribution

Designed, engineered, and maintained with dedication by **Sachin**.  
All Rights Reserved © 2026.
