<template>
  <div class="container">
    <h1>Todo & Don't List</h1>
    
    <div class="progress-section">
      <div class="progress-label">
        <span @click="showSettings = !showSettings" class="settings-toggle" title="Settings">⚙️</span>
        Day Progress: {{ Math.round(dayProgress) }}%
      </div>
      
      <div v-if="showSettings" class="settings-panel">
        <div class="setting-group">
          <label>Start:</label>
          <input type="number" v-model="startHour" @change="saveSettings" min="0" max="23" class="time-input"> :
          <input type="number" v-model="startMinute" @change="saveSettings" min="0" max="59" class="time-input">
        </div>
        <div class="setting-group">
          <label>End:</label>
          <input type="number" v-model="endHour" @change="saveSettings" min="1" max="30" class="time-input"> :
          <input type="number" v-model="endMinute" @change="saveSettings" min="0" max="59" class="time-input">
        </div>
      </div>

      <div 
        class="progress-bar-container"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
        <div class="progress-bar" :style="{ width: `${dayProgress}%` }"></div>
        <div v-if="showTooltip" class="tooltip" :style="{ left: `${dayProgress}%` }">
          Remaining: {{ remainingTimeString }}
        </div>
      </div>
    </div>

    <div class="input-group">
      <div class="input-row">
        <input 
          v-model="newTodoTitle" 
          @keydown.enter="handleEnter" 
          placeholder="Add a new task..." 
          type="text"
          class="task-input"
        />
        <select v-model="newTodoType">
          <option value="do">Do</option>
          <option value="dont">Don't</option>
        </select>
        <input 
          v-if="newTodoType === 'dont'"
          v-model="newTodoDuration"
          type="text"
          placeholder="e.g. 30m, 1h"
          class="duration-input"
          @keydown.enter="handleEnter"
        />
        <button @click="addTodo">Add</button>
      </div>
    </div>

    <ul class="todo-list">
      <li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done, 'dont-task': todo.type === 'dont', suppressed: isSuppressed(todo) }">
        <!-- Checkbox for 'Do' tasks -->
        <input 
          v-if="todo.type !== 'dont'"
          type="checkbox" 
          :checked="todo.done" 
          @change="toggleTodo(todo)"
        />
        
        <!-- Action button for 'Dont' tasks -->
        <button 
          v-else
          class="dont-btn"
          :disabled="isSuppressed(todo)"
          @click="toggleTodo(todo)"
        >
          {{ isSuppressed(todo) ? formatTime(getRemainingTime(todo)) : '🚫 Do Not' }}
        </button>

        <span class="title">
          {{ todo.title }}
          <span v-if="todo.type === 'dont'" class="meta">
            ({{ todo.duration }}m suppression)
          </span>
        </span>
        <button class="delete-btn" @click="deleteTodo(todo.id!)">Delete</button>
      </li>
    </ul>
    
    <div v-if="todos.length === 0" class="empty-state">
      No tasks yet. Add one above!
    </div>

    <footer>
      <a href="https://github.com/blue1st/todo-dont-list" target="_blank" rel="noopener noreferrer">
        View on GitHub
      </a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useHead } from '#app';
import { db, type Todo } from './utils/db';

useHead({
  title: "Todo & Don't List"
})

import { liveQuery } from 'dexie';
import { computed } from 'vue';

const newTodoTitle = ref('');
const newTodoType = ref<'do' | 'dont'>('do');
const newTodoDuration = ref<string>('30m'); // Default 30 mins
const todos = ref<Todo[]>([]);
const now = ref(Date.now());
// Settings
const startHour = ref(0);
const startMinute = ref(0);
const endHour = ref(24);
const endMinute = ref(0);
const showSettings = ref(false);
const showTooltip = ref(false);

const dayProgress = computed(() => {
  const date = new Date(now.value);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const dayEndTotalMinutes = endHour.value * 60 + endMinute.value;
  // Handle overnight wrapping logic
  // If end is > 24 hours (1440 mins)
  if (dayEndTotalMinutes > 1440) {
      // If current time is "early morning" but less than the overflow part
      const overflowMinutes = dayEndTotalMinutes - 1440;
      const currentMinutesSimple = hours * 60 + minutes;
      if (currentMinutesSimple < overflowMinutes) {
          hours += 24;
      }
  }

  const currentTotalSeconds = hours * 3600 + minutes * 60 + seconds;
  const startSeconds = (startHour.value * 3600) + (startMinute.value * 60);
  const endSeconds = (endHour.value * 3600) + (endMinute.value * 60);
  const rangeSeconds = endSeconds - startSeconds;

  if (rangeSeconds <= 0) return 0;

  const progressSeconds = currentTotalSeconds - startSeconds;
  const percentage = (progressSeconds / rangeSeconds) * 100;

  return Math.min(Math.max(percentage, 0), 100);
});

const remainingTimeString = computed(() => {
  const date = new Date(now.value);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  
  const dayEndTotalMinutes = endHour.value * 60 + endMinute.value;
  
  if (dayEndTotalMinutes > 1440) {
      const overflowMinutes = dayEndTotalMinutes - 1440;
      const currentMinutesSimple = hours * 60 + minutes;
      if (currentMinutesSimple < overflowMinutes) {
          hours += 24;
      }
  }

  const currentTotalMinutes = hours * 60 + minutes;
  let remainingMinutes = dayEndTotalMinutes - currentTotalMinutes;

  if (remainingMinutes < 0) remainingMinutes = 0;

  const h = Math.floor(remainingMinutes / 60);
  const m = remainingMinutes % 60;
  return `${h}h ${m}m`;
});

function saveSettings() {
  localStorage.setItem('todo-dont-settings', JSON.stringify({
    start: { h: startHour.value, m: startMinute.value },
    end: { h: endHour.value, m: endMinute.value }
  }));
}

// Update 'now' every second to drive the timer
let timerInterval: number;
onMounted(() => {
  // Load settings
  const saved = localStorage.getItem('todo-dont-settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Handle legacy format (simple numbers) vs new object format
      if (typeof parsed.start === 'number') {
         startHour.value = parsed.start;
         startMinute.value = 0;
      } else if (parsed.start) {
         startHour.value = Number(parsed.start.h) || 0;
         startMinute.value = Number(parsed.start.m) || 0;
      }

      if (typeof parsed.end === 'number') {
         endHour.value = parsed.end;
         endMinute.value = 0;
      } else if (parsed.end) {
         endHour.value = Number(parsed.end.h) || 24;
         endMinute.value = Number(parsed.end.m) || 0;
      }
    } catch (e) { console.error('Failed to load settings', e); }
  }

  timerInterval = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/todo-dont-list/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  }
});

onUnmounted(() => {
  clearInterval(timerInterval);
});

// Subscribe to liveQuery for real-time updates
const todosObservable = liveQuery(() => db.todos.toArray());
const subscription = todosObservable.subscribe({
  next: (result) => {
    todos.value = result;
  },
  error: (error) => {
    console.error(error);
  }
});

function isSuppressed(todo: Todo): boolean {
  if (todo.type !== 'dont' || !todo.lastDone || !todo.duration) return false;
  const endTime = todo.lastDone + (todo.duration * 60 * 1000);
  return now.value < endTime;
}

function getRemainingTime(todo: Todo): number {
  if (todo.type !== 'dont' || !todo.lastDone || !todo.duration) return 0;
  const endTime = todo.lastDone + (todo.duration * 60 * 1000);
  return Math.max(0, endTime - now.value);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return;
  await addTodo();
}

function parseDuration(input: string): number {
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([mhd])?$/);
  
  if (!match) return 30; // Default fallback
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'm'; // Default to minutes if no unit
  
  switch (unit) {
    case 'h': return Math.round(value * 60);
    case 'd': return Math.round(value * 24 * 60);
    case 'm': 
    default: return Math.round(value);
  }
}

async function addTodo() {
  if (!newTodoTitle.value.trim()) return;
  
  try {
    const duration = newTodoType.value === 'dont' ? parseDuration(newTodoDuration.value) : undefined;

    await db.todos.add({
      title: newTodoTitle.value,
      done: false,
      type: newTodoType.value,
      duration: duration
    });
    newTodoTitle.value = '';
    // Reset defaults
    newTodoType.value = 'do';
    newTodoDuration.value = '30m';
  } catch (error) {
    console.error('Failed to add todo:', error);
  }
}

async function toggleTodo(todo: Todo) {
  try {
    if (todo.type === 'dont') {
      // For 'dont' tasks, 'toggling' means marking it as done just now, which starts the suppression
      await db.todos.update(todo.id!, { lastDone: Date.now() });
    } else {
      // For 'do' tasks, normal toggle
      await db.todos.update(todo.id!, { done: !todo.done });
    }
  } catch (error) {
    console.error('Failed to toggle todo:', error);
  }
}

async function deleteTodo(id: number) {
  try {
    await db.todos.delete(id);
  } catch (error) {
    console.error('Failed to delete todo:', error);
  }
}
</script>

<style>
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f2f5;
  color: #333;
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.progress-section {
  margin-bottom: 2rem;
  padding: 0 10px;
}

.progress-label {
  text-align: right;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
}

.progress-bar-container {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: visible; /* To allow tooltip overflow */
  position: relative;
  cursor: pointer;
}

.progress-bar {
  height: 100%;
  background-color: #42b883;
  width: 0%; /* Default */
  /* Remove transition for smoother updates or keep it? Keep for now. */
  transition: width 0.5s linear;
}

.settings-toggle {
  cursor: pointer;
  margin-right: 5px;
  user-select: none;
}

.settings-panel {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  background: #f8f8f8;
  padding: 8px;
  border-radius: 4px;
  align-items: center;
}

.setting-group {
  display: flex;
  align-items: center;
}

.time-input {
  width: 40px;
  padding: 4px;
  margin: 0 4px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.tooltip {
  position: absolute;
  top: 120%; /* Below bar */
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  z-index: 10;
}

.tooltip::after {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent #333 transparent;
}

.input-group {
  margin-bottom: 2rem;
}

.input-row {
  display: flex;
  gap: 10px;
}

input[type="text"] {
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input[type="text"]:focus {
  border-color: #42b883;
  outline: none;
}

select, .duration-input {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
}

.duration-input {
  width: 80px;
}

button {
  padding: 10px 20px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #3aa876;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-list li {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
  gap: 12px;
}

.todo-list li:last-child {
  border-bottom: none;
}

.todo-list li.done .title {
  text-decoration: line-through;
  color: #999;
}

.title {
  flex: 1;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta {
  font-size: 0.8rem;
  color: #888;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.delete-btn {
  background-color: #ff7675;
  padding: 6px 12px;
  font-size: 0.9rem;
}

.delete-btn:hover {
  background-color: #d63031;
}

.dont-btn {
  background-color: #74b9ff;
  min-width: 80px;
  font-family: monospace;
}

.dont-btn:hover {
  background-color: #0984e3;
}

.dont-btn:disabled {
  background-color: #b2bec3;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  color: #999;
  font-style: italic;
  margin-top: 2rem;
}

@media (max-width: 600px) {
  .input-row {
    flex-wrap: wrap;
  }
  
  .task-input {
    flex: 1 1 100%;
  }

  .meta {
    display: none;
  }
}

footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

footer a {
  color: #42b883;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}
</style>
