# Smart Meeting Room Scheduler (DAA Assignment)

A complete web application demonstrating the **Greedy Algorithm** combined with a **Min Heap (Priority Queue) built from scratch** to solve the Interval Partitioning / Room Scheduling problem using the minimum number of rooms possible.

---

## ❓ Why are there so many folders in `node_modules`?

When you run `npm install express cors`, npm downloads `express` and `cors` along with **all their transitive dependencies** (sub-packages that Express relies on, such as `body-parser`, `serve-static`, `qs`, `encodeurl`, `depd`, `debug`, `statuses`, etc.). Each helper dependency gets its own directory inside `node_modules`.

**Key points:**
- The project itself has only **2 top-level dependencies** declared in `package.json`: `express` and `cors`.
- The small core project files are:
  - `server.js` (Backend API & Min Heap from scratch)
  - `public/index.html` (UI layout)
  - `public/style.css` (Plain CSS design)
  - `public/script.js` (Frontend controller & DOM visualizer)

---

## 🚀 How to Run the Project Locally

1. **Ensure Node.js is installed** on your computer.
2. **Open Terminal / Command Prompt** in this project directory:
   ```bash
   cd "DAA Innovative"
   ```
3. **Install Dependencies** (if not already installed):
   ```bash
   npm install
   ```
4. **Start the Express Backend Server**:
   ```bash
   node server.js
   ```
5. **Open Web Browser** and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🎤 10-Line Algorithm Explanation (For Viva / Presentation)

1. The problem asks for the minimum number of rooms needed to schedule $N$ meetings without time conflicts.
2. We first sort all meetings by start time in ascending order, establishing a **Greedy Ordering**.
3. We maintain an array-based **Min Heap** (Priority Queue) storing occupied rooms keyed by their current end times.
4. The root of the Min Heap (index 0) always represents the room that frees up earliest.
5. For each meeting, we compare its start time against the root room's end time (`peek()`).
6. If `root.endTime <= meeting.startTime`, the room is free, so we reuse it (`extractMin()`, update end time, and `insert()`).
7. If `root.endTime > meeting.startTime`, every currently active room is busy, so we MUST allocate a new room (`insert()`).
8. Updating the Min Heap takes $O(\log N)$ time per meeting using `heapifyUp` and `heapifyDown`.
9. The overall time complexity is $O(N \log N)$ (dominated by sorting and heap operations) with $O(N)$ space complexity.
10. This greedy strategy is globally optimal because reusing the earliest-freed room maximizes room availability for remaining meetings.

---

## 🧪 3 Test Cases with Expected Outputs

### Test Case 1: Non-Overlapping Sequential Meetings
- **Input:**
  - Meeting 1: `09:00` to `10:00`
  - Meeting 2: `10:00` to `11:00`
  - Meeting 3: `11:00` to `12:00`
- **Expected Result:**
  - Minimum Rooms Required: **1**
  - Room 1: Meeting 1, Meeting 2, Meeting 3
  - *Reasoning:* Meeting 2 starts exactly when Meeting 1 ends (`10:00 <= 10:00`), so Room 1 is reused for all meetings.

### Test Case 2: Fully Overlapping Meetings (Peak Concurrency)
- **Input:**
  - Meeting 1: `09:00` to `10:30`
  - Meeting 2: `09:15` to `10:15`
  - Meeting 3: `09:30` to `11:00`
- **Expected Result:**
  - Minimum Rooms Required: **3**
  - Room 1: Meeting 1
  - Room 2: Meeting 2
  - Room 3: Meeting 3
  - *Reasoning:* When Meeting 3 starts at `09:30`, Room 1 ends at `10:30` and Room 2 ends at `10:15`. Neither room is free, forcing allocation of Room 3.

### Test Case 3: Mixed Overlap (Sample Demonstration Set)
- **Input:**
  - M1: `09:00` - `10:30`
  - M2: `09:30` - `11:30`
  - M3: `10:00` - `11:00`
  - M4: `10:30` - `12:00`
- **Expected Result:**
  - Minimum Rooms Required: **3**
  - Room 1: M1 (`09:00`-`10:30`), M4 (`10:30`-`12:00`)
  - Room 2: M2 (`09:30`-`11:30`)
  - Room 3: M3 (`10:00`-`11:00`)
  - *Reasoning:* M4 starts at `10:30`. The Min Heap root is Room 1 (frees at `10:30`). Since `10:30 <= 10:30`, M4 reuses Room 1.

---

## 📂 Minimal File Architecture

```
DAA Innovative/
├── package.json        # Node manifest (express & cors)
├── server.js            # Node Express server + Custom MinHeap & Greedy Scheduler
├── README.md            # Setup guide, Viva pitch, and Test Cases
└── public/
    ├── index.html       # UI Layout & Complexity Panel
    ├── style.css        # Clean CSS Stylesheet
    └── script.js        # Controller & Heap Visualizer
```
