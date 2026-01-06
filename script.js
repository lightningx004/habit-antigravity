// --- DOM Elements ---
const monthYearText = document.getElementById('monthYear');
const calendarGrid = document.getElementById('calendarGrid');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');

// Progress Elements
const progressCircle = document.getElementById('progressCircle');
const progressText = document.getElementById('progressText');
const fractionText = document.getElementById('fractionText');

const monthCircle = document.getElementById('monthCircle');
const monthText = document.getElementById('monthText');

// Modal Elements
const openModalBtn = document.getElementById('openModalBtn');
const addHabitModal = document.getElementById('addHabitModal');
const modalHabitInput = document.getElementById('modalHabitInput');
const modalTaskInput = document.getElementById('modalTaskInput');
const confirmAddBtn = document.getElementById('confirmAddBtn');
const cancelBtn = document.getElementById('cancelBtn');

const habitList = document.getElementById('habitList');
const yearBarFill = document.getElementById('yearBarFill');
const yearPercentText = document.getElementById('yearPercent');

// --- State ---
let currentDate = new Date();
let selectedDate = new Date();

// --- MIGRATION & INIT ---
let rawHabits = JSON.parse(localStorage.getItem('habits')) || [];
let completions = JSON.parse(localStorage.getItem('completions')) || {};
let localTasks = JSON.parse(localStorage.getItem('localTasks')) || {};

let habits = [];

// Helper to generate IDs
function generateId() {
    return 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 1. Migrate Habits: String -> Object {id, text}
if (rawHabits.length > 0) {
    if (typeof rawHabits[0] === 'string') {
        // Migration needed
        console.log("Migrating habits to objects...");
        habits = rawHabits.map(h => ({ id: generateId(), text: h }));

        // 2. Migrate Completions: Index -> ID
        console.log("Migrating completions to IDs...");
        for (const dateKey in completions) {
            const completedIndices = completions[dateKey];
            const completedIds = [];
            completedIndices.forEach(index => {
                if (habits[index]) {
                    completedIds.push(habits[index].id);
                }
            });
            completions[dateKey] = completedIds;
        }

        saveData(); // Save immediately
    } else {
        habits = rawHabits;
    }
}

// --- HELPER: CHECK IF DATE IS IN PAST ---
function isDatePast(dateToCheck) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const check = new Date(dateToCheck);
    check.setHours(0, 0, 0, 0);

    return check < today;
}


// --- DYNAMIC STREAK CALCULATOR ---
function calculateHabitStreak(habitId) {
    let streak = 0;
    let d = new Date();
    d.setHours(0, 0, 0, 0);

    let dateKey = d.toDateString();
    let todayChecked = completions[dateKey] && completions[dateKey].includes(habitId);

    if (todayChecked) {
        streak++;
    }

    while (true) {
        d.setDate(d.getDate() - 1);
        dateKey = d.toDateString();

        if (completions[dateKey] && completions[dateKey].includes(habitId)) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}


// --- 1. Year & Month Progress ---
function updateTimeProgress() {
    const now = new Date();

    // YEAR
    const startYear = new Date(now.getFullYear(), 0, 0);
    const diffYear = now - startYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diffYear / oneDay);
    const isLeap = (now.getFullYear() % 400 === 0) || (now.getFullYear() % 100 !== 0 && now.getFullYear() % 4 === 0);
    const totalDaysYear = isLeap ? 366 : 365;
    const yearPercent = ((dayOfYear / totalDaysYear) * 100).toFixed(0);

    yearPercentText.innerText = `${yearPercent}%`;
    yearBarFill.style.width = `${yearPercent}%`;

    // MONTH
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthPercent = Math.round((dayOfMonth / daysInMonth) * 100);

    monthText.innerText = `${monthPercent}%`;
    monthCircle.style.setProperty('--month-deg', `${monthPercent * 3.6}deg`);
}

// --- 2. Calendar Logic ---
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    monthYearText.innerText = `${monthNames[month]} ${year}`.toUpperCase();
    calendarGrid.innerHTML = "";

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day', 'empty');
        calendarGrid.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;

        const thisDate = new Date(year, month, i);
        const dateKey = thisDate.toDateString();

        // Calculate Stats
        const validHabits = habits.filter(h => {
             if (!h.createdAt) return true;
             return thisDate >= new Date(h.createdAt);
        });
        const totalHabits = validHabits.length;
        const completedHabits = completions[dateKey] ? completions[dateKey].length : 0;
        const daysTasks = localTasks[dateKey] || [];
        const totalTasks = daysTasks.length;
        const completedTasks = daysTasks.filter(t => t.completed).length;

        const grandTotal = totalHabits + totalTasks;
        const grandCompleted = completedHabits + completedTasks;

        let percentage = 0;
        if (grandTotal > 0) {
            percentage = (grandCompleted / grandTotal) * 100;
        }

        // Standard Coloring Logic
        if (grandTotal > 0 && thisDate <= today) {
            if (percentage === 100) {
                dayDiv.classList.add('perfect');
            } else if (percentage >= 60) {
                dayDiv.classList.add('success');
            } else if (percentage === 0) {
                dayDiv.classList.add('fail', 'neon');
            } else {
                dayDiv.classList.add('fail');
            }
        }

        // Manual Override: Neon Green for Jan 1-4, 2026
        if (year === 2026 && month === 0 && (i >= 1 && i <= 4)) {
            // Remove potential conflict classes
            dayDiv.classList.remove('fail', 'neon', 'success', 'perfect');
            dayDiv.classList.add('neon-highlight');
        }

        if (i === selectedDate.getDate() &&
            month === selectedDate.getMonth() &&
            year === selectedDate.getFullYear()) {
            dayDiv.classList.add('selected');
        }

        dayDiv.addEventListener('click', () => {
            selectedDate = new Date(year, month, i);
            renderCalendar();
            renderList();
            updateDailyProgress();
        });

        calendarGrid.appendChild(dayDiv);
    }
}

// --- 3. Render Combined List ---
function renderList() {
    habitList.innerHTML = "";
    const dateKey = selectedDate.toDateString();
    const isPast = isDatePast(selectedDate);

    if (isPast) {
        openModalBtn.style.display = 'none';
    } else {
        openModalBtn.style.display = 'flex';
    }

    const daysTasks = localTasks[dateKey] || [];

    if (habits.length === 0 && daysTasks.length === 0) {
        habitList.innerHTML = `<li style="text-align:center; color:#444; padding:20px; list-style:none;">No items for this day</li>`;
        return;
    }

    // 1. Render Global Habits
    habits.forEach((habit) => {
        // Filter by start date
        if (habit.createdAt) {
            const habitStartDate = new Date(habit.createdAt);
            // reset time to midnight for accurate comparison
            const currentDay = new Date(selectedDate);
            currentDay.setHours(0,0,0,0);
            habitStartDate.setHours(0,0,0,0);
            
            if (currentDay < habitStartDate) return;
        }

        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.dataset.id = habit.id; // For Drag & Drop identifying

        const isCompleted = completions[dateKey] && completions[dateKey].includes(habit.id);
        if (isCompleted) li.classList.add('completed');

        const streakCount = calculateHabitStreak(habit.id);

        li.innerHTML = `
            <div class="habit-left-group">
                <input type="checkbox" 
                    ${isCompleted ? 'checked' : ''} 
                    ${isPast ? 'disabled' : ''} 
                    onchange="toggleGlobalHabit('${habit.id}')"
                    style="${isPast ? 'cursor: not-allowed; opacity: 0.5;' : ''}"
                >
                <span class="habit-text">${habit.text}</span>
            </div>
            
            <div class="habit-streak" style="opacity: ${streakCount > 0 ? 1 : 0.5};">
                <span class="streak-fire-icon">🔥</span>
                <span>${streakCount}</span>
            </div>

            ${!isPast ? `<button class="delete-btn" onclick="deleteGlobalHabit('${habit.id}')">×</button>` : ''}
        `;

        // Add Drag Listeners to the LI
        addDragListeners(li, habit.id);

        habitList.appendChild(li);
    });

    // 2. Render Local Tasks
    daysTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.classList.add('local-task-item'); // Distinguish tasks

        if (task.completed) li.classList.add('completed');

        li.innerHTML = `
            <div class="habit-left-group">
                <input type="checkbox" 
                    ${task.completed ? 'checked' : ''} 
                    ${isPast ? 'disabled' : ''}
                    onchange="toggleLocalTask(${index})"
                    style="${isPast ? 'cursor: not-allowed; opacity: 0.5;' : ''}"
                >
                <span class="habit-text">${task.text}</span>
            </div>
            <span class="task-badge">Task</span>
            
            ${!isPast ? `<button class="delete-btn" onclick="deleteLocalTask(${index})">×</button>` : ''}
        `;
        habitList.appendChild(li);
    });
}

// --- DRAG AND DROP (Long Press) ---
let dragTimer = null;
let draggedItem = null;
let ghostItem = null;
let startY = 0;
let isDragging = false;
let placeholder = null;

function addDragListeners(li, id) {
    // Touch Events
    li.addEventListener('touchstart', (e) => handleTouchStart(e, li), { passive: false });
    li.addEventListener('touchmove', (e) => handleTouchMove(e), { passive: false });
    li.addEventListener('touchend', (e) => handleTouchEnd(e));

    // Mouse Events (for testing/desktop)
    li.addEventListener('mousedown', (e) => handleMouseDown(e, li));
}

function handleTouchStart(e, item) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

    startY = e.touches[0].clientY;
    draggedItem = item;

    // Long press to start drag
    dragTimer = setTimeout(() => {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, 500);
}

function handleTouchMove(e) {
    // If dragging, prevent scroll and move ghost
    if (isDragging) {
        e.preventDefault();
        moveGhost(e.touches[0].clientX, e.touches[0].clientY);
        checkDropTarget(e.touches[0].clientX, e.touches[0].clientY);
    } else {
        // If moved significantly while waiting for long press, cancel it
        if (Math.abs(e.touches[0].clientY - startY) > 10) {
            clearTimeout(dragTimer);
        }
    }
}

function handleTouchEnd(e) {
    clearTimeout(dragTimer);
    if (isDragging) {
        endDrag();
    }
}

// Mouse Handlers (Simplified for desktop testing)
function handleMouseDown(e, item) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    draggedItem = item;
    dragTimer = setTimeout(() => {
        startDrag(e.clientX, e.clientY);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, 500);
}

function handleMouseMove(e) {
    if (isDragging) {
        e.preventDefault();
        moveGhost(e.clientX, e.clientY);
        checkDropTarget(e.clientX, e.clientY);
    }
}

function handleMouseUp() {
    clearTimeout(dragTimer);
    if (isDragging) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        endDrag();
    }
}

function startDrag(x, y) {
    isDragging = true;

    // Vibration feedback
    if (navigator.vibrate) navigator.vibrate(50);

    // Create Ghost
    ghostItem = draggedItem.cloneNode(true);
    ghostItem.classList.add('habit-ghost');
    ghostItem.style.width = `${draggedItem.offsetWidth}px`;
    document.body.appendChild(ghostItem);

    // Initial Ghost Position
    moveGhost(x, y);

    // Create Placeholder
    placeholder = document.createElement('li');
    placeholder.classList.add('habit-placeholder');
    placeholder.style.height = `${draggedItem.offsetHeight}px`;
    draggedItem.parentNode.insertBefore(placeholder, draggedItem);

    // Hide original but keep in DOM
    draggedItem.style.display = 'none';
}

function moveGhost(x, y) {
    if (!ghostItem) return;
    ghostItem.style.left = `${x}px`;
    ghostItem.style.top = `${y}px`;
}

function checkDropTarget(x, y) {
    const box = habitList.getBoundingClientRect();
    // Only sort if within list
    if (x > box.left && x < box.right && y > box.top && y < box.bottom) {

        const siblings = [...habitList.querySelectorAll('.habit-item:not(.habit-ghost):not(.habit-placeholder)')];

        const nextSibling = siblings.find(sibling => {
            const rect = sibling.getBoundingClientRect();
            // Use center point of item for threshold
            return y < rect.top + rect.height / 2;
        });

        // Determine if position actually changed
        const currentNext = placeholder.nextElementSibling;
        const targetNext = nextSibling || null;

        // Note: nextElementSibling might include non-habit items if we're not careful, 
        // but here we only have LIs.
        // We need to check if we are already in the right spot.
        // If targetNext is same as currentNext, no move needed.
        if (currentNext !== targetNext) {
            // --- FLIP ANIMATION START ---
            const itemsToAnimate = siblings.concat(placeholder);
            const positions = new Map();

            // 1. Record Old Positions
            itemsToAnimate.forEach(item => {
                positions.set(item, item.getBoundingClientRect().top);
            });

            // 2. Perform DOM Move
            if (nextSibling) {
                habitList.insertBefore(placeholder, nextSibling);
            } else {
                habitList.appendChild(placeholder);
            }

            // 3. Invert & Play
            itemsToAnimate.forEach(item => {
                const oldTop = positions.get(item);
                const newTop = item.getBoundingClientRect().top;
                const delta = oldTop - newTop;

                if (delta !== 0) {
                    // Invert: fake being at old position
                    item.style.transform = `translateY(${delta}px)`;
                    item.style.transition = 'none';

                    // Force Reflow
                    item.offsetHeight;

                    // Play: animate to new (0) position
                    requestAnimationFrame(() => {
                        item.style.transform = '';
                        item.style.transition = 'transform 0.25s cubic-bezier(0.2, 1, 0.3, 1)';
                    });
                }
            });
            // --- FLIP END ---
        }
    }
}

function endDrag() {
    isDragging = false;

    // Remove Ghost
    if (ghostItem) ghostItem.remove();
    ghostItem = null;

    // Clean up transitions on all items
    const lis = habitList.querySelectorAll('.habit-item');
    lis.forEach(li => {
        li.style.transform = '';
        li.style.transition = '';
    });

    // Place Item
    if (draggedItem && placeholder) {
        draggedItem.style.display = 'flex';
        habitList.insertBefore(draggedItem, placeholder);
        placeholder.remove();
        placeholder = null;

        // Update Data Model
        updateOrder();
    }
}

function updateOrder() {
    const newIdOrder = [];
    const lis = habitList.querySelectorAll('.habit-item');

    lis.forEach(li => {
        // filter out local tasks which don't have dataset.id
        if (li.dataset.id) {
            newIdOrder.push(li.dataset.id);
        }
    });

    // Reorder 'habits' based on newIdOrder
    const newHabits = [];
    newIdOrder.forEach(id => {
        const habit = habits.find(h => h.id === id);
        if (habit) newHabits.push(habit);
    });

    habits = newHabits;
    saveData();
    // No need to re-render list, DOM is already correct
}


// --- Modal Functions ---
function openModal() {
    if (isDatePast(selectedDate)) {
        alert("You cannot add items to past dates.");
        return;
    }
    addHabitModal.classList.add('active');
    modalHabitInput.focus();
}

function closeModal() {
    addHabitModal.classList.remove('active');
    modalHabitInput.value = "";
    modalTaskInput.value = "";
}

function addItem() {
    if (isDatePast(selectedDate)) return;

    const habitText = modalHabitInput.value.trim();
    const taskText = modalTaskInput.value.trim();
    const dateKey = selectedDate.toDateString();

    let changeMade = false;

    // Add Global Habit
    if (habitText) {
        const d = new Date(selectedDate);
        d.setHours(0, 0, 0, 0);
        
        habits.push({ 
            id: generateId(), 
            text: habitText,
            createdAt: d.toISOString() 
        });
        changeMade = true;
    }

    // Add Local Task
    if (taskText) {
        if (!localTasks[dateKey]) localTasks[dateKey] = [];
        localTasks[dateKey].push({ text: taskText, completed: false });
        changeMade = true;
    }

    if (changeMade) {
        saveData();
        closeModal();
        renderList();
        updateDailyProgress();
        renderCalendar();
    }
}

// Event Listeners
openModalBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
confirmAddBtn.addEventListener('click', addItem);
modalHabitInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
modalTaskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });

// --- Toggle & Delete Functions ---

window.toggleGlobalHabit = function (id) {
    if (isDatePast(selectedDate)) return;

    const dateKey = selectedDate.toDateString();
    if (!completions[dateKey]) completions[dateKey] = [];

    const i = completions[dateKey].indexOf(id);
    if (i > -1) completions[dateKey].splice(i, 1);
    else completions[dateKey].push(id);

    saveData();
    renderList();
    updateDailyProgress();
    renderCalendar();
}

window.deleteGlobalHabit = function (id) {
    if (isDatePast(selectedDate)) return;

    if (confirm("Delete this Global Habit? (Removes from all days)")) {
        habits = habits.filter(h => h.id !== id);
        for (const date in completions) {
            completions[date] = completions[date].filter(i => i !== id);
        }
        saveData();
        renderList();
        updateDailyProgress();
        renderCalendar();
    }
}

window.toggleLocalTask = function (index) {
    if (isDatePast(selectedDate)) return;

    const dateKey = selectedDate.toDateString();
    if (localTasks[dateKey] && localTasks[dateKey][index]) {
        localTasks[dateKey][index].completed = !localTasks[dateKey][index].completed;
        saveData();
        renderList();
        updateDailyProgress();
        renderCalendar();
    }
}

window.deleteLocalTask = function (index) {
    if (isDatePast(selectedDate)) return;

    if (confirm("Delete this Task?")) {
        const dateKey = selectedDate.toDateString();
        localTasks[dateKey].splice(index, 1);
        if (localTasks[dateKey].length === 0) delete localTasks[dateKey];

        saveData();
        renderList();
        updateDailyProgress();
        renderCalendar();
    }
}

// --- 4. Daily Progress Logic ---
function updateDailyProgress() {
    const dateKey = selectedDate.toDateString();

    // FIX: Only count completions for habits that actually exist
    // AND are valid for this date
    const currentDay = new Date(selectedDate);
    currentDay.setHours(0,0,0,0);

    const validHabits = habits.filter(h => {
        if (!h.createdAt) return true;
        const hDate = new Date(h.createdAt);
        hDate.setHours(0,0,0,0); // Ensure midnight comparison
        return currentDay >= hDate;
    });

    const validHabitIds = new Set(validHabits.map(h => h.id));
    const completedHabits = (completions[dateKey] || []).filter(id => validHabitIds.has(id)).length;
    
    // Update total based on valid habits for this day, not all global habits
    const totalHabits = validHabits.length;

    const daysTasks = localTasks[dateKey] || [];
    const totalTasks = daysTasks.length;
    const completedTasks = daysTasks.filter(t => t.completed).length;

    const grandTotal = totalHabits + totalTasks;
    const grandCompleted = completedHabits + completedTasks;

    if (grandTotal === 0) {
        progressText.innerText = "0%";
        fractionText.innerText = "No Items";
        progressCircle.style.setProperty('--progress-deg', '0deg');
        return;
    }

    const percentage = Math.round((grandCompleted / grandTotal) * 100);
    const degrees = percentage * 3.6;

    progressCircle.style.setProperty('--progress-deg', `${degrees}deg`);
    progressText.innerText = `${percentage}%`;
    fractionText.innerText = `${grandCompleted}/${grandTotal}`;
}

// --- 5. Save & Init ---
// --- 5. Save & Init ---
function saveData() {
    try {
        localStorage.setItem('habits', JSON.stringify(habits));
        localStorage.setItem('completions', JSON.stringify(completions));
        localStorage.setItem('localTasks', JSON.stringify(localTasks));
    } catch (e) {
        console.error("Save failed:", e);
        // Optional: Alert user if quota exceeded or disabled
    }
}

// --- 6. DATA PERSISTENCE (SETTINGS) ---
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const exportBtn = document.getElementById('exportBtn');
const triggerImportBtn = document.getElementById('triggerImportBtn');
const importFile = document.getElementById('importFile');

// Open/Close Settings
openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

// EXPORT
exportBtn.addEventListener('click', () => {
    const data = {
        habits: habits,
        completions: completions,
        localTasks: localTasks,
        exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "habit_tracker_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

// IMPORT HANDLERS
triggerImportBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);

            // Basic Validation
            if (!importedData.habits || !importedData.completions) {
                alert("Invalid backup file!");
                return;
            }

            if (confirm("This will overwrite your current data. Are you sure?")) {
                habits = importedData.habits || [];
                completions = importedData.completions || {};
                localTasks = importedData.localTasks || {};

                // Migrate IDs if importing old data (safety check)
                if (habits.length > 0 && typeof habits[0] === 'string') {
                    habits = habits.map(h => ({ id: generateId(), text: h }));
                }

                saveData();
                renderList();
                updateDailyProgress();
                renderCalendar();
                alert("Data restored successfully!");
                settingsModal.classList.remove('active');
            }
        } catch (err) {
            console.error(err);
            alert("Error parsing file. Please check the file format.");
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    importFile.value = '';
});


prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// --- INITIALIZATION (ANIMATION ON LOAD) ---
// 1. First, render the grid & list immediately so the user sees the structure.
// Try to load data again just in case (redundant but safe)
try {
    renderCalendar();
    renderList();
} catch (e) {
    console.error("Init render failed", e);
}

// 2. Set initial progress to 0 to prepare for animation.
yearBarFill.style.width = '0%';
monthCircle.style.setProperty('--month-deg', '0deg');
progressCircle.style.setProperty('--progress-deg', '0deg');

// 3. Trigger the animation after a brief delay (100ms) to allow the DOM to paint the 0 state.
setTimeout(() => {
    updateDailyProgress();
    updateTimeProgress();
}, 100);