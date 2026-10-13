/**
 * ==========================================================================
 * SMART MEETING ROOM SCHEDULER - FRONTEND CONTROLLER
 * ==========================================================================
 */

// Application State
let meetings = [];
let schedulerResult = null;
let currentStepIndex = 0;
let isShowAll = false;

// Sample Dataset (8 overlapping meetings)
const SAMPLE_MEETINGS = [
  { title: "Team Standup", startTime: "09:00", endTime: "10:30" },
  { title: "Client Demo", startTime: "09:30", endTime: "11:30" },
  { title: "Architecture Review", startTime: "10:00", endTime: "11:00" },
  { title: "Sprint Planning", startTime: "10:30", endTime: "12:00" },
  { title: "Product Sync", startTime: "11:00", endTime: "13:00" },
  { title: "Design Workshop", startTime: "12:00", endTime: "14:00" },
  { title: "Viva Discussion", startTime: "13:30", endTime: "15:00" },
  { title: "Project Retrospective", startTime: "14:00", endTime: "16:00" }
];

// DOM Elements
const titleInput = document.getElementById('meeting-title');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const addMeetingBtn = document.getElementById('add-meeting-btn');
const loadSampleBtn = document.getElementById('load-sample-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const scheduleBtn = document.getElementById('schedule-btn');
const errorMessage = document.getElementById('error-message');
const meetingsTableBody = document.getElementById('meetings-table-body');

// Visualization Elements
const visualizationSection = document.getElementById('visualization-section');
const singleStepView = document.getElementById('single-step-view');
const allStepsView = document.getElementById('all-steps-view');
const prevStepBtn = document.getElementById('prev-step-btn');
const nextStepBtn = document.getElementById('next-step-btn');
const stepCounter = document.getElementById('step-counter');
const showAllBtn = document.getElementById('show-all-btn');

// Result Elements
const resultSection = document.getElementById('result-section');
const minRoomsVal = document.getElementById('min-rooms-val');
const roomScheduleGrid = document.getElementById('room-schedule-grid');

// Metrics Elements
const metricsCard = document.getElementById('metrics-card');
const metricN = document.getElementById('metric-n');
const metricPushes = document.getElementById('metric-pushes');
const metricPops = document.getElementById('metric-pops');
const metricHeapComp = document.getElementById('metric-heap-comp');
const metricSortComp = document.getElementById('metric-sort-comp');

// Helper: Convert "HH:MM" to minutes for duration calculation
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Calculate meeting duration string
function calculateDuration(start, end) {
  const diffMinutes = timeToMinutes(end) - timeToMinutes(start);
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

// Show Error Message
function showError(msg) {
  errorMessage.textContent = `⚠️ ${msg}`;
  errorMessage.classList.remove('hidden');
}

// Hide Error Message
function hideError() {
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
}

// Render Meetings Table
function renderMeetingsTable() {
  meetingsTableBody.innerHTML = '';

  if (meetings.length === 0) {
    meetingsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No meetings added yet. Click "Load Sample Data" or add meetings above.</td>
      </tr>
    `;
    return;
  }

  meetings.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(m.title)}</strong></td>
      <td><code>${m.startTime}</code></td>
      <td><code>${m.endTime}</code></td>
      <td>${calculateDuration(m.startTime, m.endTime)}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="removeMeeting(${idx})">🗑️ Remove</button>
      </td>
    `;
    meetingsTableBody.appendChild(tr);
  });
}

// Add Meeting Action
function addMeeting() {
  hideError();
  const title = titleInput.value.trim() || `Meeting ${meetings.length + 1}`;
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;

  if (!startTime || !endTime) {
    showError('Please enter valid Start Time and End Time.');
    return;
  }

  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  if (endMins <= startMins) {
    showError(`End time (${endTime}) must be strictly later than start time (${startTime}).`);
    return;
  }

  meetings.push({ title, startTime, endTime });
  renderMeetingsTable();

  // Reset title input
  titleInput.value = '';
}

// Remove Single Meeting
function removeMeeting(index) {
  meetings.splice(index, 1);
  renderMeetingsTable();
}

// Load Sample Dataset
function loadSampleData() {
  hideError();
  meetings = JSON.parse(JSON.stringify(SAMPLE_MEETINGS));
  renderMeetingsTable();
}

// Clear All Meetings
function clearAll() {
  hideError();
  meetings = [];
  schedulerResult = null;
  renderMeetingsTable();
  visualizationSection.classList.add('hidden');
  resultSection.classList.add('hidden');
  metricsCard.classList.add('hidden');
}

// Escape HTML for security
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

/**
 * Send Meetings to Node.js Backend API
 */
async function runScheduler() {
  hideError();

  if (meetings.length === 0) {
    showError('Please add at least one meeting before running the scheduler.');
    return;
  }

  try {
    scheduleBtn.disabled = true;
    scheduleBtn.textContent = '⏳ Processing Algorithm...';

    const response = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetings })
    });

    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'Failed to schedule meetings.');
      return;
    }

    schedulerResult = data;
    currentStepIndex = 0;
    isShowAll = false;

    // Display Sections
    visualizationSection.classList.remove('hidden');
    resultSection.classList.remove('hidden');
    metricsCard.classList.remove('hidden');

    renderStepView();
    renderResultView();
    renderMetricsView();

    // Scroll to visualization
    visualizationSection.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('API Error:', err);
    showError('Could not connect to the backend server. Make sure node server.js is running.');
  } finally {
    scheduleBtn.disabled = false;
    scheduleBtn.innerHTML = '▶️ Run Greedy + Min Heap Scheduler';
  }
}

/**
 * Renders Min Heap visual graph and array representation
 */
function generateHeapHTML(heapSnapshot, title) {
  if (!heapSnapshot || heapSnapshot.length === 0) {
    return `
      <div class="heap-column">
        <h4>${title}</h4>
        <div class="empty-heap-msg">Heap is currently empty (0 active rooms)</div>
      </div>
    `;
  }

  // Generate Node Cards
  const nodesHTML = heapSnapshot.map(node => `
    <div class="heap-node ${node.isRoot ? 'root-node' : ''}">
      ${node.isRoot ? '<span class="root-tag">ROOT / EARLIEST</span>' : ''}
      <span class="node-room">Room ${node.roomId}</span>
      <span class="node-time">Frees @ ${node.endTime}</span>
      <span class="node-index">Heap [${node.heapIndex}]</span>
    </div>
  `).join('');

  // Generate Array Representation
  const arrayHTML = heapSnapshot.map(node => `
    <div class="array-cell ${node.isRoot ? 'root-cell' : ''}">
      [${node.heapIndex}]: Room ${node.roomId} (${node.endTime})
    </div>
  `).join('');

  return `
    <div class="heap-column">
      <h4>${title} (${heapSnapshot.length} room${heapSnapshot.length > 1 ? 's' : ''})</h4>
      <div class="heap-tree-view">
        <div class="heap-node-container">
          ${nodesHTML}
        </div>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px; font-weight:600;">ARRAY STORAGE VIEW:</div>
      <div class="heap-array-view">
        ${arrayHTML}
      </div>
    </div>
  `;
}

/**
 * Render single step in visualization
 */
function renderSingleStepHTML(step) {
  const isReuse = step.decisionType === 'REUSE';
  const badgeClass = isReuse ? 'reuse' : 'allocate_new';
  const badgeText = isReuse ? `Reused Room ${step.assignedRoomId}` : `Allocated New Room ${step.assignedRoomId}`;

  return `
    <div class="step-header-box">
      <div class="meeting-focus">
        <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">PROCESSING MEETING:</span>
        <div class="meeting-chip">
          "${escapeHtml(step.meeting.title)}" (${step.meeting.startTime} - ${step.meeting.endTime})
        </div>
      </div>
      <div class="decision-badge ${badgeClass}">
        ${badgeText}
      </div>
    </div>

    <!-- Plain English Decision Rationale -->
    <div class="explanation-box">
      <div class="explanation-title">💡 Why This Room?</div>
      <div class="explanation-text">${escapeHtml(step.explanation)}</div>
    </div>

    <!-- Dual Heap State Display -->
    <div class="heap-dual-grid">
      ${generateHeapHTML(step.heapBefore, 'Min Heap BEFORE Decision')}
      ${generateHeapHTML(step.heapAfter, 'Min Heap AFTER Decision')}
    </div>
  `;
}

/**
 * Render Step Visualizer Controls and State
 */
function renderStepView() {
  if (!schedulerResult || !schedulerResult.stepLogs) return;

  const logs = schedulerResult.stepLogs;
  const totalSteps = logs.length;

  stepCounter.textContent = `Step ${currentStepIndex + 1} of ${totalSteps}`;
  prevStepBtn.disabled = currentStepIndex === 0;
  nextStepBtn.disabled = currentStepIndex === totalSteps - 1;

  if (isShowAll) {
    singleStepView.classList.add('hidden');
    allStepsView.classList.remove('hidden');
    showAllBtn.textContent = '👁️ Single Step View';

    allStepsView.innerHTML = logs.map((step, idx) => `
      <div class="step-card" style="margin-bottom:20px;">
        <div style="font-size:0.9rem; font-weight:700; color:var(--primary-color); margin-bottom:10px;">
          STEP ${idx + 1} OF ${totalSteps}
        </div>
        ${renderSingleStepHTML(step)}
      </div>
    `).join('');
  } else {
    singleStepView.classList.remove('hidden');
    allStepsView.classList.add('hidden');
    showAllBtn.textContent = '📜 Show All Steps';

    const currentStep = logs[currentStepIndex];
    singleStepView.innerHTML = renderSingleStepHTML(currentStep);
  }
}

/**
 * Render Final Room Allocation Schedule
 */
function renderResultView() {
  if (!schedulerResult) return;

  minRoomsVal.textContent = schedulerResult.totalRoomsRequired;
  roomScheduleGrid.innerHTML = '';

  schedulerResult.roomAssignments.forEach(room => {
    const roomCard = document.createElement('div');
    roomCard.className = 'room-card';

    const blocksHTML = room.meetings.map(m => `
      <div class="timeline-block">
        <div class="block-title">${escapeHtml(m.title)}</div>
        <div class="block-time">⏰ ${m.startTime} - ${m.endTime}</div>
      </div>
    `).join('');

    roomCard.innerHTML = `
      <div class="room-card-header">
        <div class="room-title">
          🏢 Room ${room.roomId}
          <span class="room-count-badge">${room.meetings.length} meeting${room.meetings.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="timeline-row">
        ${blocksHTML}
      </div>
    `;

    roomScheduleGrid.appendChild(roomCard);
  });
}

/**
 * Render Empirical Metrics Card
 */
function renderMetricsView() {
  if (!schedulerResult || !schedulerResult.metrics) return;

  const m = schedulerResult.metrics;
  metricN.textContent = schedulerResult.totalMeetings;
  metricPushes.textContent = m.pushes;
  metricPops.textContent = m.pops;
  metricHeapComp.textContent = m.heapComparisons;
  metricSortComp.textContent = m.sortingComparisons;
}

// Event Listeners
addMeetingBtn.addEventListener('click', addMeeting);
loadSampleBtn.addEventListener('click', loadSampleData);
clearAllBtn.addEventListener('click', clearAll);
scheduleBtn.addEventListener('click', runScheduler);

prevStepBtn.addEventListener('click', () => {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderStepView();
  }
});

nextStepBtn.addEventListener('click', () => {
  if (schedulerResult && currentStepIndex < schedulerResult.stepLogs.length - 1) {
    currentStepIndex++;
    renderStepView();
  }
});

showAllBtn.addEventListener('click', () => {
  isShowAll = !isShowAll;
  renderStepView();
});

// Initialize table on load
renderMeetingsTable();
