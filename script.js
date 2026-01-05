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

// 1. Global Habits 
let rawHabits = JSON.parse(localStorage.getItem('habits')) || [];
let habits = [];
if (rawHabits.length > 0 && typeof rawHabits[0] === 'string') {
    habits = rawHabits.map(h => ({ text: h }));
} else {
    habits = rawHabits;
}

// 2. Global Habit Completions
let completions = JSON.parse(localStorage.getItem('completions')) || {};
// 3. Local Tasks
let localTasks = JSON.parse(localStorage.getItem('localTasks')) || {};


// --- HELPER: CHECK IF DATE IS IN PAST ---
function isDatePast(dateToCheck) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const check = new Date(dateToCheck);
    check.setHours(0, 0, 0, 0);

    return check < today;
}


// --- DYNAMIC STREAK CALCULATOR ---
function calculateHabitStreak(habitIndex) {
    let streak = 0;
    let d = new Date(); 
    d.setHours(0,0,0,0);
    
    let dateKey = d.toDateString();
    let todayChecked = completions[dateKey] && completions[dateKey].includes(habitIndex);

    if (todayChecked) {
        streak++;
    }

    while (true) {
        d.setDate(d.getDate() - 1); 
        dateKey = d.toDateString();
        
        if (completions[dateKey] && completions[dateKey].includes(habitIndex)) {
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
    today.setHours(0,0,0,0);

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
        const totalHabits = habits.length;
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

        // Manual Override: ONLY for January 2026, Day 1 & 2
        if (year === 2026 && month === 0 && (i === 1 || i === 2)) {
            dayDiv.classList.remove('fail', 'neon', 'success');
            dayDiv.classList.add('perfect');
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
    habits.forEach((habit, index) => {
        const li = document.createElement('li');
        li.classList.add('habit-item');
        
        const isCompleted = completions[dateKey] && completions[dateKey].includes(index);
        if (isCompleted) li.classList.add('completed');

        const streakCount = calculateHabitStreak(index);

        li.innerHTML = `
            <div class="habit-left-group">
                <input type="checkbox" 
                    ${isCompleted ? 'checked' : ''} 
                    ${isPast ? 'disabled' : ''} 
                    onchange="toggleGlobalHabit(${index})"
                    style="${isPast ? 'cursor: not-allowed; opacity: 0.5;' : ''}"
                >
                <span class="habit-text">${habit.text}</span>
            </div>
            
            <div class="habit-streak" style="opacity: ${streakCount > 0 ? 1 : 0.5};">
                <span class="streak-fire-icon">🔥</span>
                <span>${streakCount}</span>
            </div>

            ${!isPast ? `<button class="delete-btn" onclick="deleteGlobalHabit(${index})">×</button>` : ''}
        `;
        habitList.appendChild(li);
    });

    // 2. Render Local Tasks
    daysTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.classList.add('habit-item');
        
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
        habits.push({ text: habitText });
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

window.toggleGlobalHabit = function(index) {
    if (isDatePast(selectedDate)) return; 

    const dateKey = selectedDate.toDateString();
    if (!completions[dateKey]) completions[dateKey] = [];
    
    const i = completions[dateKey].indexOf(index);
    if (i > -1) completions[dateKey].splice(i, 1);
    else completions[dateKey].push(index);

    saveData();
    renderList(); 
    updateDailyProgress();
    renderCalendar();
}

window.deleteGlobalHabit = function(index) {
    if (isDatePast(selectedDate)) return;

    if(confirm("Delete this Global Habit? (Removes from all days)")) {
        habits.splice(index, 1);
        for (const date in completions) {
            completions[date] = completions[date].filter(i => i !== index).map(i => i > index ? i - 1 : i);
        }
        saveData();
        renderList();
        updateDailyProgress();
        renderCalendar();
    }
}

window.toggleLocalTask = function(index) {
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

window.deleteLocalTask = function(index) {
    if (isDatePast(selectedDate)) return;

    if(confirm("Delete this Task?")) {
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
    
    const totalHabits = habits.length;
    const completedHabits = completions[dateKey] ? completions[dateKey].length : 0;
    
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
function saveData() {
    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('completions', JSON.stringify(completions));
    localStorage.setItem('localTasks', JSON.stringify(localTasks));
}

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
renderCalendar();
renderList();

// 2. Set initial progress to 0 to prepare for animation.
yearBarFill.style.width = '0%';
monthCircle.style.setProperty('--month-deg', '0deg');
progressCircle.style.setProperty('--progress-deg', '0deg');

// 3. Trigger the animation after a brief delay (100ms) to allow the DOM to paint the 0 state.
setTimeout(() => {
    updateDailyProgress();
    updateTimeProgress();
}, 100);