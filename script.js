const input = document.querySelector('#agentInput');
const addBtn = document.querySelector('#addBtn');
const list = document.querySelector('#todoList');
const response = document.querySelector('#agentResponse');
const statusChip = document.querySelector('#statusChip');
const clearCompletedBtn = document.querySelector('#clearCompletedBtn');
const focusHighBtn = document.querySelector('#focusHighBtn');
const showAllBtn = document.querySelector('#showAllBtn');
const template = document.querySelector('#todoTemplate');

const totalCount = document.querySelector('#totalCount');
const doneCount = document.querySelector('#doneCount');
const highCount = document.querySelector('#highCount');

let filter = 'all';
const storeKey = 'nexus9-todos';
let todos = JSON.parse(localStorage.getItem(storeKey) || '[]');

function speak(text, mood = 'ok') {
  response.textContent = text;
  statusChip.textContent = mood === 'alert' ? 'ACTION REQUIRED' : 'SYSTEM ONLINE';
  statusChip.style.borderColor = mood === 'alert' ? 'var(--danger)' : 'var(--ok)';
  statusChip.style.color = mood === 'alert' ? 'var(--danger)' : 'var(--ok)';
}

function persist() {
  localStorage.setItem(storeKey, JSON.stringify(todos));
}

function parseCommand(raw) {
  const text = raw.trim();
  const lower = text.toLowerCase();

  if (!text) return { type: 'empty' };
  if (lower === 'clear completed') return { type: 'clearCompleted' };
  if (lower === 'focus high') return { type: 'focusHigh' };
  if (lower === 'show all') return { type: 'showAll' };

  if (lower.startsWith('done ')) {
    const query = text.slice(5).trim().toLowerCase();
    return { type: 'done', query };
  }

  const cleaned = lower.startsWith('add ') ? text.slice(4).trim() : text;
  const tagMatch = cleaned.match(/#(\w+)/);
  const dueMatch = cleaned.match(/\b(today|tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i);
  const priority = /!high|urgent|asap/i.test(cleaned) ? 'high' : 'normal';

  const title = cleaned
    .replace(/#\w+/g, '')
    .replace(/!high|urgent|asap/gi, '')
    .replace(/\b(today|tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    type: 'add',
    payload: {
      id: crypto.randomUUID(),
      title,
      done: false,
      priority,
      tag: tagMatch ? `#${tagMatch[1]}` : '#general',
      due: dueMatch ? dueMatch[0] : 'no deadline',
      createdAt: Date.now(),
    },
  };
}

function render() {
  list.innerHTML = '';

  const filtered = todos.filter((todo) => (filter === 'high' ? todo.priority === 'high' : true));

  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done - b.done;
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  for (const todo of filtered) {
    const node = template.content.firstElementChild.cloneNode(true);
    const toggle = node.querySelector('.todo-toggle');
    const title = node.querySelector('.todo-title');
    const priority = node.querySelector('.priority');
    const tag = node.querySelector('.tag');
    const due = node.querySelector('.due');
    const del = node.querySelector('.delete-btn');

    toggle.checked = todo.done;
    title.textContent = todo.title;
    priority.textContent = todo.priority.toUpperCase();
    priority.classList.add(todo.priority);
    tag.textContent = todo.tag;
    due.textContent = todo.due;

    node.classList.toggle('done', todo.done);

    toggle.addEventListener('change', () => {
      todo.done = toggle.checked;
      persist();
      render();
      speak(todo.done ? `Task completed: ${todo.title}` : `Task reopened: ${todo.title}`);
    });

    del.addEventListener('click', () => {
      todos = todos.filter((item) => item.id !== todo.id);
      persist();
      render();
      speak(`Task deleted: ${todo.title}`);
    });

    list.appendChild(node);
  }

  totalCount.textContent = String(todos.length);
  doneCount.textContent = String(todos.filter((t) => t.done).length);
  highCount.textContent = String(todos.filter((t) => t.priority === 'high' && !t.done).length);
}

function executeCommand(raw) {
  const command = parseCommand(raw);

  if (command.type === 'empty') {
    speak('No command detected. Feed me mission data.', 'alert');
    return;
  }

  if (command.type === 'add') {
    if (!command.payload.title) {
      speak('Task title missing. Example: add Buy reactor coils tomorrow !high #ship', 'alert');
      return;
    }
    todos.push(command.payload);
    persist();
    render();
    speak(`Task deployed: ${command.payload.title}`);
    return;
  }

  if (command.type === 'done') {
    const target = todos.find((t) => t.title.toLowerCase().includes(command.query));
    if (!target) {
      speak(`No task matches "${command.query}".`, 'alert');
      return;
    }
    target.done = true;
    persist();
    render();
    speak(`Marked complete: ${target.title}`);
    return;
  }

  if (command.type === 'clearCompleted') {
    const before = todos.length;
    todos = todos.filter((t) => !t.done);
    persist();
    render();
    speak(`Purged ${before - todos.length} completed task(s).`);
    return;
  }

  if (command.type === 'focusHigh') {
    filter = 'high';
    focusHighBtn.classList.add('active');
    showAllBtn.classList.remove('active');
    render();
    speak('High-priority focus mode enabled.');
    return;
  }

  if (command.type === 'showAll') {
    filter = 'all';
    showAllBtn.classList.add('active');
    focusHighBtn.classList.remove('active');
    render();
    speak('Showing full mission queue.');
  }
}

addBtn.addEventListener('click', () => {
  executeCommand(input.value);
  input.value = '';
  input.focus();
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    addBtn.click();
  }
});

clearCompletedBtn.addEventListener('click', () => executeCommand('clear completed'));
focusHighBtn.addEventListener('click', () => executeCommand('focus high'));
showAllBtn.addEventListener('click', () => executeCommand('show all'));

render();
if (!todos.length) {
  speak('Ready. Add your first mission task.');
}
