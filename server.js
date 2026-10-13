const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Convert "HH:MM" time string to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes from midnight back to "HH:MM" string format
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * =========================================================================
 * MIN HEAP (PRIORITY QUEUE) IMPLEMENTATION FROM SCRATCH
 * =========================================================================
 * An array-based binary min heap that stores occupied Room objects.
 * Each room object has: { roomId, endTime, endTimeMinutes, meetings }
 * Heap invariant: The root (index 0) always contains the room with the 
 * EARLIEST end time.
 * =========================================================================
 */
class MinHeap {
  constructor() {
    this.heap = [];
    // Counters for empirical complexity tracking
    this.operationCounts = {
      pushes: 0,
      pops: 0,
      comparisons: 0
    };
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  getRightChildIndex(i) {
    return 2 * i + 2;
  }

  // Returns true if item at index A frees up earlier than item at index B
  isLess(a, b) {
    this.operationCounts.comparisons++;
    return a.endTimeMinutes < b.endTimeMinutes;
  }

  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Inserts a room into the Min Heap and bubbles it up to restore heap property.
   * Time Complexity: O(log N)
   */
  insert(room) {
    this.operationCounts.pushes++;
    this.heap.push(room);
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the room with the earliest end time (root).
   * Time Complexity: O(log N)
   */
  extractMin() {
    if (this.heap.length === 0) return null;
    this.operationCounts.pops++;

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const minRoom = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return minRoom;
  }

  /**
   * Restores min heap property by comparing element with parent and swapping upwards.
   */
  heapifyUp(index) {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = this.getParentIndex(currentIndex);
      if (this.isLess(this.heap[currentIndex], this.heap[parentIndex])) {
        this.swap(currentIndex, parentIndex);
        currentIndex = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Restores min heap property by comparing element with left/right children and swapping downwards.
   */
  heapifyDown(index) {
    let currentIndex = index;
    const length = this.heap.length;

    while (true) {
      let smallest = currentIndex;
      const leftChild = this.getLeftChildIndex(currentIndex);
      const rightChild = this.getRightChildIndex(currentIndex);

      if (leftChild < length && this.isLess(this.heap[leftChild], this.heap[smallest])) {
        smallest = leftChild;
      }

      if (rightChild < length && this.isLess(this.heap[rightChild], this.heap[smallest])) {
        smallest = rightChild;
      }

      if (smallest !== currentIndex) {
        this.swap(currentIndex, smallest);
        currentIndex = smallest;
      } else {
        break;
      }
    }
  }

  /**
   * Returns a clean, deep snapshot of the heap array state for UI visualization.
   */
  getSnapshot() {
    return this.heap.map((room, idx) => ({
      heapIndex: idx,
      roomId: room.roomId,
      endTime: room.endTime,
      endTimeMinutes: room.endTimeMinutes,
      meetingCount: room.meetings.length,
      isRoot: idx === 0
    }));
  }
}

/**
 * =========================================================================
 * GREEDY + MIN HEAP ROOM SCHEDULING ALGORITHM
 * =========================================================================
 * Algorithm Steps:
 * 1. Convert start/end times to integer minutes.
 * 2. Sort meetings by start time ascending (Greedy Choice).
 * 3. Initialize Min Heap storing rooms keyed by their current end time.
 * 4. Iterate through sorted meetings:
 *    a. Peek heap root (earliest freeing room).
 *    b. If root.endTime <= meeting.startTime: Reuse room (extractMin, update end time, re-insert).
 *    c. Else: Allocate new room (increment totalRooms, create new room, insert into heap).
 *    d. Record step execution log, heap state snapshot, and decision explanation.
 * =========================================================================
 */
function scheduleMeetings(rawMeetings) {
  if (!rawMeetings || rawMeetings.length === 0) {
    return {
      success: true,
      totalMeetings: 0,
      totalRoomsRequired: 0,
      sortedMeetings: [],
      roomAssignments: [],
      stepLogs: [],
      metrics: { comparisons: 0, pushes: 0, pops: 0, sortingComparisons: 0 }
    };
  }

  // 1. Preprocess meetings with minute values
  const meetings = rawMeetings.map((m, id) => ({
    id: id + 1,
    title: m.title.trim() || `Meeting ${id + 1}`,
    startTime: m.startTime,
    endTime: m.endTime,
    startMinutes: timeToMinutes(m.startTime),
    endMinutes: timeToMinutes(m.endTime)
  }));

  // 2. Sort meetings by start time (Greedy Ordering)
  let sortingComparisons = 0;
  const sortedMeetings = [...meetings].sort((a, b) => {
    sortingComparisons++;
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    // Secondary tie-breaker: earlier end time first
    return a.endMinutes - b.endMinutes;
  });

  const heap = new MinHeap();
  let totalRooms = 0;
  const allRoomsMap = new Map(); // Store full room meeting list: roomId -> Room object
  const stepLogs = [];

  // 3. Process meetings one by one using Min Heap
  sortedMeetings.forEach((meeting, stepIndex) => {
    const heapBefore = heap.getSnapshot();
    const rootBefore = heap.peek();

    let decisionType = '';
    let assignedRoomId = null;
    let explanation = '';

    // Check if the room that frees up earliest is available
    if (rootBefore && rootBefore.endTimeMinutes <= meeting.startMinutes) {
      // REUSE ROOM: Extract earliest freeing room
      const freedRoom = heap.extractMin();
      assignedRoomId = freedRoom.roomId;
      decisionType = 'REUSE';

      const prevEndTime = freedRoom.endTime;

      // Update room end time and add meeting
      freedRoom.endTime = meeting.endTime;
      freedRoom.endTimeMinutes = meeting.endMinutes;
      freedRoom.meetings.push(meeting);

      // Push updated room back into heap
      heap.insert(freedRoom);

      explanation = `Room ${assignedRoomId} was chosen because it frees up at ${prevEndTime}, which is the earliest among all occupied rooms and is ≤ meeting start time (${meeting.startTime}).`;
    } else {
      // ALLOCATE NEW ROOM
      totalRooms++;
      assignedRoomId = totalRooms;
      decisionType = 'ALLOCATE_NEW';

      const newRoom = {
        roomId: assignedRoomId,
        endTime: meeting.endTime,
        endTimeMinutes: meeting.endMinutes,
        meetings: [meeting]
      };

      allRoomsMap.set(assignedRoomId, newRoom);
      heap.insert(newRoom);

      if (!rootBefore) {
        explanation = `Allocated Room 1 as the first room for initial meeting "${meeting.title}".`;
      } else {
        explanation = `Allocated new Room ${assignedRoomId} because the earliest available room (Room ${rootBefore.roomId}) frees up at ${rootBefore.endTime}, which is after meeting start time (${meeting.startTime}).`;
      }
    }

    const heapAfter = heap.getSnapshot();

    // Log the algorithm step
    stepLogs.push({
      stepNumber: stepIndex + 1,
      meeting: { ...meeting },
      heapBefore,
      rootBefore: rootBefore ? { roomId: rootBefore.roomId, endTime: rootBefore.endTime } : null,
      decisionType,
      assignedRoomId,
      explanation,
      heapAfter
    });
  });

  // Reconstruct final room schedule list sorted by room ID
  const roomAssignments = [];
  // Extract room details from allRoomsMap
  for (let rId = 1; rId <= totalRooms; rId++) {
    const r = allRoomsMap.get(rId);
    if (r) {
      roomAssignments.push({
        roomId: r.roomId,
        meetings: r.meetings
      });
    }
  }

  return {
    success: true,
    totalMeetings: sortedMeetings.length,
    totalRoomsRequired: totalRooms,
    sortedMeetings,
    roomAssignments,
    stepLogs,
    metrics: {
      pushes: heap.operationCounts.pushes,
      pops: heap.operationCounts.pops,
      heapComparisons: heap.operationCounts.comparisons,
      sortingComparisons,
      totalHeapOps: heap.operationCounts.pushes + heap.operationCounts.pops
    }
  };
}

/**
 * =========================================================================
 * REST API ENDPOINTS
 * =========================================================================
 */

// POST /api/schedule - Main endpoint for running the Greedy + Min Heap Scheduler
app.post('/api/schedule', (req, res) => {
  try {
    const { meetings } = req.body;

    if (!Array.isArray(meetings)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format. "meetings" array is required.'
      });
    }

    // Validate meeting times
    for (let i = 0; i < meetings.length; i++) {
      const m = meetings[i];
      if (!m.startTime || !m.endTime) {
        return res.status(400).json({
          success: false,
          error: `Meeting ${i + 1} (${m.title || 'Untitled'}) has missing start or end time.`
        });
      }
      if (timeToMinutes(m.endTime) <= timeToMinutes(m.startTime)) {
        return res.status(400).json({
          success: false,
          error: `Meeting "${m.title || 'Meeting ' + (i + 1)}" has end time (${m.endTime}) earlier than or equal to start time (${m.startTime}).`
        });
      }
    }

    const result = scheduleMeetings(meetings);
    return res.json(result);
  } catch (err) {
    console.error('Scheduling error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the schedule.'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Smart Meeting Room Scheduler server running on port ${PORT}`);
  console.log(`Access Web UI at: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
