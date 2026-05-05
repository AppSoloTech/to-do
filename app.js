const STORAGE_KEY = "todo.tasks";
const THEME_KEY = "todo.theme";

const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const filterButtons = document.querySelectorAll("[data-filter]");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");

let tasks = loadTasks();
let currentFilter = "all";

// Storage helpers keep persistence separate from rendering and events.
function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    return Array.isArray(parsedTasks) ? parsedTasks : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

// Rendering builds the visible list from state every time something changes.
function renderTasks() {
  const visibleTasks = getFilteredTasks();

  todoList.innerHTML = "";
  visibleTasks.forEach((task) => {
    todoList.appendChild(createTaskElement(task));
  });

  updateCounter();
  updateEmptyState(visibleTasks.length);
  updateClearButton();
}

function getFilteredTasks() {
  if (currentFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `todo-item${task.completed ? " completed" : ""}`;
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    `Mark ${task.text} as ${task.completed ? "active" : "completed"}`
  );

  const text = document.createElement("span");
  text.className = "task-text";
  text.tabIndex = 0;
  text.textContent = task.text;
  text.title = "Click to edit";

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
  deleteButton.textContent = "x";

  checkbox.addEventListener("change", () => toggleTask(task.id));
  text.addEventListener("click", () => startEditing(item, task));
  text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      startEditing(item, task);
    }
  });
  deleteButton.addEventListener("click", () => removeTask(task.id, item));

  item.append(checkbox, text, deleteButton);
  return item;
}

function updateCounter() {
  const activeCount = tasks.filter((task) => !task.completed).length;
  const label = activeCount === 1 ? "task" : "tasks";
  taskCount.textContent = `${activeCount} ${label} left`;
}

function updateEmptyState(visibleCount) {
  const messageByFilter = {
    all: "No tasks yet.",
    active: "No active tasks.",
    completed: "No completed tasks.",
  };

  emptyState.textContent = messageByFilter[currentFilter];
  emptyState.classList.toggle("visible", visibleCount === 0);
}

function updateClearButton() {
  clearCompletedButton.disabled = !tasks.some((task) => task.completed);
}

// Task mutations update state, persist it, then render the current view.
function addTask(text) {
  tasks = [
    {
      id: createTaskId(),
      text,
      completed: false,
    },
    ...tasks,
  ];

  saveTasks();
  renderTasks();
}

function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );

  saveTasks();
  renderTasks();
}

function updateTask(id, text) {
  tasks = tasks.map((task) => (task.id === id ? { ...task, text } : task));
  saveTasks();
  renderTasks();
}

function removeTask(id, item) {
  item.classList.add("removing");

  window.setTimeout(() => {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();
  }, 170);
}

function clearCompletedTasks() {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
}

function startEditing(item, task) {
  const input = document.createElement("input");
  input.className = "edit-input";
  input.type = "text";
  input.value = task.text;
  input.maxLength = 120;
  input.setAttribute("aria-label", "Edit task");

  const taskText = item.querySelector(".task-text");
  taskText.replaceWith(input);
  input.focus();
  input.select();

  function finishEditing() {
    const nextText = input.value.trim();

    if (nextText && nextText !== task.text) {
      updateTask(task.id, nextText);
      return;
    }

    renderTasks();
  }

  input.addEventListener("blur", finishEditing);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur();
    }

    if (event.key === "Escape") {
      renderTasks();
    }
  });
}

function setFilter(filter) {
  currentFilter = filter;

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderTasks();
}

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark", isDark);
  themeIcon.textContent = isDark ? "Light" : "Dark";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
}

// Event listeners wire user interactions into the app state.
todoForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = todoInput.value.trim();
  if (!text) {
    return;
  }

  addTask(text);
  todoInput.value = "";
  todoInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

clearCompletedButton.addEventListener("click", clearCompletedTasks);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  saveTheme(nextTheme);
  applyTheme(nextTheme);
});

applyTheme(loadTheme());
setFilter(currentFilter);
