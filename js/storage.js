// ============================================================
// storage.js — Capa de datos (Híbrida: LocalStorage + Firebase)
// ============================================================

// 1. Configuración de tu base de datos czr-tareas
const firebaseConfig = {
  apiKey: "AIzaSyBG8gh7lTAPE9I9kBXKKcjADM4X0OeigvM",
  authDomain: "czr-tareas.firebaseapp.com",
  projectId: "czr-tareas",
  storageBucket: "czr-tareas.firebasestorage.app",
  messagingSenderId: "786109551717",
  appId: "1:786109551717:web:0a5a5899a9ca780210a28c"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
let db;
try {
  db = firebase.firestore();
} catch (e) {
  console.warn("Storage: Firebase no disponible, usando modo local", e);
  db = { 
    collection: () => ({ 
      doc: () => ({ 
        set: () => Promise.resolve(), 
        get: () => Promise.resolve({ exists: false }),
        delete: () => Promise.resolve()
      }) 
    }) 
  };
}

class TaskStorage {
  constructor() {
    this.STORAGE_KEY = 'taskpanel_data';
    // 1. Cargar cache local inmediatamente (para que tu UI actual no se rompa)
    this.data = this._loadLocal();
    
    // 2. Sincronizar silenciosamente con Firebase en segundo plano
    this._initFirebaseSync();
  }

  // ---- Sincronización Firebase ----

  _initFirebaseSync() {
    // Escucha cambios en las tareas en la nube y las refleja en local
    db.collection("tareas").onSnapshot(snapshot => {
      const cloudTasks = [];
      snapshot.forEach(doc => cloudTasks.push(doc.data()));
      if (cloudTasks.length > 0 || snapshot.metadata.fromCache === false) {
        this.data.tasks = cloudTasks;
        this._saveLocal();
        if (typeof app !== 'undefined') app.refreshCurrentView();
      }
    });

    // Escucha cambios en las etiquetas
    db.collection("etiquetas").onSnapshot(snapshot => {
      const cloudTags = [];
      snapshot.forEach(doc => cloudTags.push(doc.data()));
      if (cloudTags.length > 0) {
        this.data.tags = cloudTags;
        this._saveLocal();
      } else {
        // Si la nube está vacía (primera vez), subimos las etiquetas por defecto
        this.data.tags.forEach(t => db.collection("etiquetas").doc(t.id).set(t));
      }
    });

    // Escucha cambios en configuraciones (metadata)
    db.collection("metadata").doc("main").onSnapshot(doc => {
      if (doc.exists) {
        const meta = doc.data();
        this.data.settings = meta.settings || this.data.settings;
        this.data.taskCodeCounter = meta.taskCodeCounter || this.data.taskCodeCounter;
        this._saveLocal();
      } else {
        this._updateMeta();
      }
    });
  }

  _updateMeta() {
    db.collection("metadata").doc("main").set({
      settings: this.data.settings,
      taskCodeCounter: this.data.taskCodeCounter
    }).catch(e => console.error("Error guardando meta:", e));
  }

  // ---- Persistencia Local ----

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
      taskCodeCounter: 0,
      noteCodeCounter: 0
    };
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks)) return parsed;
      }
    } catch (e) {
      console.error('Error cargando datos locales:', e);
    }
    return this._getDefault();
  }

  _saveLocal() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error guardando datos locales:', e);
    }
  }

  // ---- Utilidades ----

  _id() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _nextCode(isNote = false) {
    if (isNote) {
      this.data.noteCodeCounter = (this.data.noteCodeCounter || 0) + 1;
      return 'N-' + String(this.data.noteCodeCounter).padStart(4, '0');
    }
    this.data.taskCodeCounter = (this.data.taskCodeCounter || 0) + 1;
    return 'T-' + String(this.data.taskCodeCounter).padStart(4, '0');
  }

  _todayStr() {
    return new Date().toLocaleDateString('sv-SE');
  }

  // ---- CRUD Tareas ----

  createTask(d) {
    const isNote = d.type === 'note';
    const task = {
      id: this._id(),
      code: this._nextCode(isNote),
      type: d.type || 'task',
      title: d.title || '',
      description: d.description || '',
      date: d.date || this._todayStr(),
      timeStart: d.timeStart || '',
      timeEnd: d.timeEnd || '',
      priority: d.priority || 'medium',
      category: d.category || 'otro',
      completed: false,
      createdAt: new Date().toISOString(),
      alarm: d.alarm || null,       
      deadline: d.deadline || null, 
      recurrence: d.recurrence || null, 
      tags: d.tags || [], 
      subtasks: (d.subtasks || []).map(s => ({
        id: this._id(),
        title: typeof s === 'string' ? s : s.title,
        completed: false
      })),
      attachments: d.attachments || []
    };
    
    // 1. Guardar en memoria y local
    this.data.tasks.push(task);
    this._saveLocal();
    
    // 2. Guardar en Nube (Firebase)
    db.collection("tareas").doc(task.id).set(task).catch(console.error);
    this._updateMeta(); 
    
    return task;
  }

  updateTask(id, updates) {
    const i = this.data.tasks.findIndex(t => t.id === id);
    if (i === -1) return null;
    
    this.data.tasks[i] = { ...this.data.tasks[i], ...updates };
    this._saveLocal();
    
    db.collection("tareas").doc(id).set(this.data.tasks[i]).catch(console.error);
    return this.data.tasks[i];
  }

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this._saveLocal();
    db.collection("tareas").doc(id).delete().catch(console.error);
  }

  getTask(id) {
    return this.data.tasks.find(t => t.id === id) || null;
  }

  getTasksByDate(dateStr) {
    return this.data.tasks
      .filter(t => t.date === dateStr && t.type !== 'note')
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
    this._saveLocal();
    
    db.collection("tareas").doc(taskId).set(t).catch(console.error);
    return sub;
  }

  toggleSubtask(taskId, subId) {
    const t = this.getTask(taskId);
    if (!t) return null;
    const s = (t.subtasks || []).find(s => s.id === subId);
    if (!s) return null;
    s.completed = !s.completed;

    // INNOVACIÓN: Autocompletar tarea si todas las subtareas están listas
    const allDone = (t.subtasks || []).length > 0 && (t.subtasks || []).every(st => st.completed);
    t.completed = allDone;

    this._saveLocal();
    db.collection("tareas").doc(taskId).set(t).catch(console.error);
    return s;
  }

  deleteSubtask(taskId, subId) {
    const t = this.getTask(taskId);
    if (!t) return;
    t.subtasks = (t.subtasks || []).filter(s => s.id !== subId);
    this._saveLocal();
    
    db.collection("tareas").doc(taskId).set(t).catch(console.error);
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
    this._saveLocal();
    
    db.collection("etiquetas").doc(tag.id).set(tag).catch(console.error);
    return tag;
  }

  updateTag(id, updates) {
    const tag = this.getTag(id);
    if (!tag) return null;
    if (updates.name !== undefined) tag.name = updates.name;
    if (updates.color !== undefined) tag.color = updates.color;
    this._saveLocal();
    
    db.collection("etiquetas").doc(id).set(tag).catch(console.error);
    return tag;
  }

  deleteTag(id) {
    this.data.tags = (this.data.tags || []).filter(t => t.id !== id);
    
    // Remove tag from all tasks and sync to Firebase
    this.data.tasks.forEach(t => {
      if (t.tags && t.tags.includes(id)) {
        t.tags = t.tags.filter(tid => tid !== id);
        db.collection("tareas").doc(t.id).set(t).catch(console.error);
      }
    });
    
    this._saveLocal();
    db.collection("etiquetas").doc(id).delete().catch(console.error);
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
            this._saveLocal();

            // Subir todo masivamente a Firebase (Sincronización)
            const promises = [];
            imported.tasks.forEach(t => promises.push(db.collection("tareas").doc(t.id).set(t)));
            if (imported.tags) {
               imported.tags.forEach(t => promises.push(db.collection("etiquetas").doc(t.id).set(t)));
            }
            promises.push(db.collection("metadata").doc("main").set({ 
               settings: imported.settings, 
               taskCodeCounter: imported.taskCodeCounter 
            }));

            Promise.all(promises).then(() => {
               console.log("Importación sincronizada con la nube correctamente");
               resolve(imported);
            }).catch(err => {
               console.error("Error al subir a la nube:", err);
               resolve(imported); // Resolvemos igual porque ya se guardó localmente
            });
            
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
window.storage = storage;