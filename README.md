# Loop Habit Tracker Clone

A modern, feature-rich habit tracking application inspired by [Loop Habit Tracker](https://github.com/iSoron/uhabits), built with React, TypeScript, and Vite.

![Loop Habit Tracker Clone](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Vite](https://img.shields.io/badge/Vite-6.0-purple)

## ✨ Features

### 📊 Comprehensive Statistics
- **Score Chart** - Track habit performance over time with customizable ranges (Day/Week/Month/Year)
- **History Chart** - Visual overview of completion patterns across different time periods
- **Calendar View** - Interactive calendar with instant editing and batch updates
- **Best Streaks** - Visual streak bars showing your longest consistent periods
- **Frequency Analysis** - Dot matrix visualization of habit frequency by day of week

### 🎨 Habit Management
- **Create & Edit Habits** - Full CRUD operations with custom colors and questions
- **Color Customization** - 11 vibrant color options for habit personalization
- **Yes/No & Measurable Types** - Support for different habit tracking styles

### 📦 Import/Export
- **Multiple Format Support** - Import from Loop Habit Tracker (.db, .zip, .csv)
- **Native Export** - Export to SQLite .db format compatible with Loop app
- **JSON Backup** - Additional JSON export for easy backup and restore

### ⚡ Performance
- **Optimized Calendar Editing** - Batch updates with visual preview for instant feedback
- **Efficient Rendering** - Smart memoization for expensive calculations
- **Smooth Animations** - Polished UI with 60fps transitions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Habits
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:5173`

## 🏗️ Tech Stack

- **Frontend Framework**: React 19
- **Language**: TypeScript 5.6
- **Build Tool**: Vite 6.0
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Database**: SQLite (via sql.js for browser-based SQLite)

## 📁 Project Structure

```
Habits/
├── components/          # React components
│   ├── HabitCard.tsx   # Habit list item with progress ring
│   ├── StatsView.tsx   # Detailed statistics view
│   ├── AddHabitModal.tsx
│   ├── EditHabitModal.tsx
│   └── SettingsModal.tsx
├── services/           # Business logic
│   └── importService.ts    # Import/export handlers
├── lib/               # Utilities
│   └── utils.ts       # Helper functions
├── types.ts           # TypeScript definitions
└── App.tsx            # Main application
```

## 🎯 Usage

### Creating a Habit
1. Click the **+** button on the main screen
2. Enter habit name and optional question
3. Choose between Yes/No or Measurable type
4. Click **Create**

### Editing a Habit
1. Open any habit to view statistics
2. Click the **Edit** icon (pencil) in the header
3. Update name, question, or color
4. Click **Save Changes**

### Importing Data
1. Open **Settings** from the main screen
2. Click **Import Data**
3. Select a file (.db, .zip, .csv, or .json)
4. Data will be merged with existing habits

### Exporting Data
1. Open **Settings**
2. Click **Export to Loop**
3. A `.db` file will be downloaded (compatible with Loop Habit Tracker)

## 🔧 Configuration

### Customizing Colors
Edit `lib/utils.ts` to add or modify habit colors:
```typescript
export const HABIT_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  // Add more colors...
];
```

### Adjusting Score Algorithm
The score calculation follows Loop's algorithm. Modify in `components/StatsView.tsx`:
```typescript
const allScores = useMemo(() => {
  // Loop's scoring logic
  // Customize frequency values or weights here
}, [completions]);
```

## 🐛 Known Issues

- Calendar editing performance may vary on older devices (optimized for modern browsers)
- Large datasets (>1000 completions) may experience slight delays in chart rendering

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

This means you can freely use, modify, and distribute this software, but any derivative works must also be open source under the same license.

## 🙏 Acknowledgments

- Inspired by [Loop Habit Tracker](https://github.com/iSoron/uhabits) by Álinson Santos Xavier
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Built with ❤️ using React and TypeScript
