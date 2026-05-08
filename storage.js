// ============================================================
// storage.js — Capa de datos (localStorage + JSON export/import)
// ============================================================

class TaskStorage {
  constructor() {
    this.STORAGE_KEY = 'taskpanel_data';
    this.data = this._load();
  }

  // ---- Persistencia ----

  _getDefault() {
    return {
      tasks: [],
      tags: [
        { id: 'tag-urgente', name: 'Urgente', color: '#ef4444' },
        { id: 'tag-revision', name: 'Revisión', color: '#f59e0b' },
        { id: 'tag-cliente', name: 'Cliente', color: '#6366f1' },
        { id: 'tag-interno', name: 'Interno', color: '#10b981' }
      ],
      settings: { theme: 'dark' },
      taskCodeCounter: 0
    };
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks)) return parsed;
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
    return this._getDefault();
  }

  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error guardando datos:', e);
    }
  }

  // ---- Utilidades ----

  _id() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _nextCode() {
    this.data.taskCodeCounter = (this.data.taskCodeCounter || 0) + 1;
    return 'T-' + String(this.data.taskCodeCounter).padStart(4, '0');
  }

  _todayStr() {
    return new Date().toLocaleDateString('sv-SE');
  }

  // ---- CRUD Tareas ----

  createTask(d) {
    const task = {
      id: this._id(),
      code: this._nextCode(),
      title: d.title || '',
      description: d.description || '',
      date: d.date || this._todayStr(),
      timeStart: d.timeStart || '',
      timeEnd: d.timeEnd || '',
      priority: d.priority || 'medium',
      category: d.category || 'otro',
      completed: false,
      createdAt: new Date().toISOString(),
      alarm: d.alarm || null,       // ISO datetime string
      deadline: d.deadline || null, // date string YYYY-MM-DD
      recurrence: d.recurrence || null, // {type:'daily'|'weekly'|'monthly', until:'YYYY-MM-DD'}
      tags: d.tags || [], // array of tag IDs
      subtasks: (d.subtasks || []).map(s => ({
        id: this._id(),
        title: typeof s === 'string' ? s : s.title,
        completed: false
      })),
      attachments: d.attachments || []
    };
    this.data.tasks.push(task);
    this._save();
    return task;
  }

  updateTask(id, updates) {
    const i = this.data.tasks.findIndex(t => t.id === id);
    if (i === -1) return null;
    this.data.tasks[i] = { ...this.data.tasks[i], ...updates };
    this._save();
    return this.data.tasks[i];
  }

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this._save();
  }

  getTask(id) {
    return this.data.tasks.find(t => t.id === id) || null;
  }

  getTasksByDate(dateStr) {
    return this.data.tasks
      .filter(t => t.date === dateStr)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.timeStart || '').localeCompare(b.timeStart || '');
      });
  }

  getTasksForMonth(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return this.data.tasks.filter(t => t.date && t.date.startsWith(prefix));
  }

  getAllTasks() {
    return this.data.tasks;
  }

  moveTask(id, newDate) {
    return this.updateTask(id, { date: newDate });
  }

  toggleTask(id) {
    const t = this.getTask(id);
    if (!t) return null;
    return this.updateTask(id, { completed: !t.completed });
  }

  // ---- Subtareas ----

  addSubtask(taskId, title) {
    const t = this.getTask(taskId);
    if (!t) return null;
    const sub = { id: this._id(), title, completed: false };
    t.subtasks = t.subtasks || [];
    t.subtasks.push(sub);
    this._save();
    return sub;
  }

  toggleSubtask(taskId, subId) {
    const t = this.getTask(taskId);
    if (!t) return null;
    const s = (t.subtasks || []).find(s => s.id === subId);
    if (!s) return null;
    s.completed = !s.completed;
    this._save();
    return s;
  }

  deleteSubtask(taskId, subId) {
    const t = this.getTask(taskId);
    if (!t) return;
    t.subtasks = (t.subtasks || []).filter(s => s.id !== subId);
    this._save();
  }

  // ---- Etiquetas (Tags) ----

  getAllTags() {
    if (!this.data.tags) this.data.tags = [];
    return this.data.tags;
  }

  getTag(id) {
    return (this.data.tags || []).find(t => t.id === id) || null;
  }

  createTag(name, color) {
    if (!this.data.tags) this.data.tags = [];
    const tag = { id: this._id(), name, color };
    this.data.tags.push(tag);
    this._save();
    return tag;
  }

  updateTag(id, updates) {
    const tag = this.getTag(id);
    if (!tag) return null;
    if (updates.name !== undefined) tag.name = updates.name;
    if (updates.color !== undefined) tag.color = updates.color;
    this._save();
    return tag;
  }

  deleteTag(id) {
    this.data.tags = (this.data.tags || []).filter(t => t.id !== id);
    // Remove tag from all tasks
    this.data.tasks.forEach(t => {
      if (t.tags) t.tags = t.tags.filter(tid => tid !== id);
    });
    this._save();
  }

  getTagsForTask(taskId) {
    const task = this.getTask(taskId);
    if (!task || !task.tags) return [];
    return task.tags.map(tid => this.getTag(tid)).filter(Boolean);
  }

  // ---- Estadísticas ----

  getStatsForDate(dateStr) {
    const tasks = this.getTasksByDate(dateStr);
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      pending: tasks.filter(t => !t.completed).length,
      high: tasks.filter(t => t.priority === 'high' && !t.completed).length
    };
  }

  getTaskCountByDay(year, month) {
    const tasks = this.getTasksForMonth(year, month);
    const counts = {};
    tasks.forEach(t => {
      const day = parseInt(t.date.split('-')[2], 10);
      if (!counts[day]) counts[day] = { total: 0, completed: 0, pending: 0 };
      counts[day].total++;
      if (t.completed) counts[day].completed++;
      else counts[day].pending++;
    });
    return counts;
  }

  // ---- Alarmas pendientes ----

  getPendingAlarms() {
    const now = new Date();
    return this.data.tasks.filter(t => {
      if (t.completed || !t.alarm) return false;
      const alarmTime = new Date(t.alarm);
      return alarmTime <= now && alarmTime > new Date(now.getTime() - 60000);
    });
  }

  getUpcomingAlarms(minutesAhead = 60) {
    const now = new Date();
    const future = new Date(now.getTime() + minutesAhead * 60000);
    return this.data.tasks.filter(t => {
      if (t.completed || !t.alarm) return false;
      const alarmTime = new Date(t.alarm);
      return alarmTime > now && alarmTime <= future;
    });
  }

  // ---- Tareas vencidas ----

  getOverdueTasks() {
    const today = this._todayStr();
    return this.data.tasks.filter(t => {
      if (t.completed) return false;
      if (t.deadline && t.deadline < today) return true;
      if (t.date < today) return true;
      return false;
    });
  }

  // ---- Export / Import ----

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tareas_backup_${this._todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported && Array.isArray(imported.tasks)) {
            this.data = imported;
            this._save();
            resolve(imported);
          } else {
            reject(new Error('Formato de archivo inválido'));
          }
        } catch (err) {
          reject(new Error('Error leyendo archivo JSON'));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }
}

// Singleton global
const storage = new TaskStorage();
