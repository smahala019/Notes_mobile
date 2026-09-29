# 📝 Ultimate Web Notepad & Word Suite

A modern, high-performance, responsive web-based Word Processor and Code Notepad. Engineered with Vanilla JavaScript, HTML5, and CSS3, running completely client-side in the browser with zero external dependencies and full offline capability.

Developed with ❤️ by **Sachin**. All Rights Reserved © 2026.

---

## 🌟 Key Highlights & Capabilities

### 1. 📄 Authentic MS Word Page Setup
- **Accurate Physical Paper Sizes**:
  - **A4 (Default)**: `210mm × 297mm`
  - **Letter**: `8.5" × 11"`
  - **Legal**: `8.5" × 14"`
  - **A3**: `297mm × 420mm`
  - **A5**: `148mm × 210mm`
  - **Executive**: `7.25" × 10.5"`
  - **Full Width**: Responsive viewport fluid mode
- **Physical Margin Presets**: Normal (`1"`), Narrow (`0.5"`), Moderate (`1" × 0.75"`), Wide (`1" × 1.5"`), and Zero margin.
- **Orientation Switching**: Seamless toggle between Portrait and Landscape modes with automatic dimension transposition.

### 2. 🎨 In-Built Browser Color Studio
- **Native Browser Color Pickers**: Directly activates the operating system and browser's built-in color dialog (`<input type="color">`) across iOS Safari, Android Chrome, and Desktop/Laptop browsers.
- **Independent Color Channels**: Text Color (`foreColor`) and Highlight Color (`hiliteColor`) operate independently without style collision.
- **One-Click Normal Reset**: The `⊘ Normal` button cleanly strips font tags and inline highlight spans so users can immediately resume typing standard text.

### 3. 📦 Shape Studio & Direct Document Shape Creator
- **16 Standard Geometric Shapes**: Rectangle, Rounded Rectangle, Circle, Callout Note, Diamond, Right Arrow, Left Arrow, Triangle, Star Banner, Hexagon, Pentagon, Heart, Cloud, Ribbon Badge, Pill / Stadium, Cylinder / Database, Octagon, Parallelogram, Trapezoid, and Cross.
- **Direct Custom Shape Creator**: Allows users to specify custom width, height, corner radius, and border thickness to generate custom shapes directly onto the document.
- **Interactive Manipulation**: 8 directional resize handles, corner drag-to-move handle (`✥`), color fill swatches, border toggling, and one-click duplication (`📋 Duplicate`).

### 4. 🧮 Equation & Math Solver $f(x)$
- **Interactive Math Solver Bar**: Evaluates algebraic equations, linear formulas, powers (`^`), square roots (`√`), logarithms (`log`, `ln`), exponential functions (`exp`), trigonometric functions (`sin`, `cos`, `tan`), factorials (`!`), and constants ($\pi$).
- **Direct Document Insertion**: Formats equations and solutions into highlighted mathematical blocks ready for insertion.

### 5. 🖌️ Canvas Paint Suite & Multi-Column Layouts
- **Integrated Drawing Canvas**: Freehand sketching, drawing, and diagramming overlaid directly on the document sheet.
- **Multi-Column Typography**: Splits document sheets into 2, 3, or 4 independent editorial columns formatted like authentic newspapers or magazine articles.

### 6. 📱 Universal Mobile & Tablet Text Selector
- **Mobile Touch Handles**: Dual teardrop pins (`start-handle` and `end-handle`) anchored directly to the user's cursor or selected text.
- **Scroll Synchronization**: Coordinates calculate offset relative to the document container, maintaining exact alignment during scrolling.
- **Floating Mobile Toolbar**: Quick touch actions for Word, Line, Select All, Copy, Cut, Bold, and Italic.

### 7. 💾 Multi-Tab Workspace & Offline Persistence
- **IndexedDB & LocalStorage**: Automatic background persistence with debounce saving.
- **Multi-Tab Interface**: Create, rename, switch, and close multiple documents concurrently.
- **Dynamic Status Bar**: Live Word and Character count, auto-save status badge, zoom slider (25% to 800%), and automatic copyright year.
- **Voice Typing**: Built-in speech-to-text dictation using the Web Speech API.

---

## 🚀 Getting Started

No compilation, bundler, or web server is required.

1. **Clone or Download** the repository:
   ```bash
   git clone https://github.com/your-username/notepad.git
   ```
2. **Open in any modern browser**:
   - Double-click `notepad.html` or open it directly in Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari.
   - For mobile testing, serve via any lightweight static server:
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
├── notepad.html          # Main HTML5 application shell & dialog modals
├── README.md             # Comprehensive documentation & feature guide
├── css/
│   ├── style.css         # Global themes, window frame & layout
│   ├── toolbar.css       # Ribbon toolbars, color controls, dropdowns
│   ├── editor.css        # Document sheet, paper sizes, shapes & canvas
│   ├── statusbar.css     # Responsive status bar, heart beat animation & zoom
│   ├── modals.css        # Modal dialogues, settings & grids
│   └── print.css         # Physical print formatting rules
└── js/
    ├── app.js            # Main application controller & event wiring
    ├── editor.js         # Rich text formatting, shapes, math & selector handles
    ├── ui.js             # Tabs, ribbons, status bar & UI view sync
    ├── modals.js         # Dialog modal handlers (find, sort, symbols, about)
    ├── storage.js        # IndexedDB & LocalStorage persistence manager
    └── theme.js          # Dark mode and visual theme controller
```

---

## 📄 License & Attribution

Designed and developed with dedication by **Sachin**.  
All Rights Reserved © 2026.

# Notes_mobile


<!-- all are correct but the last point of the editor  page goes beyound the toolbar so make it coorect so it not goes beyound and it stop at status bar when user scroll top but not for content typing or pasting -->