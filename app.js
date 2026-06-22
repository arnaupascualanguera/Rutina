// ---------- Datos de la rutina ----------
const ROUTINE = {
  dia1: {
    label: "Pecho, hombro y tríceps",
    short: "Día 1",
    exercises: [
      { id: "press_banca", name: "Press de banca con barra", sets: 4, reps: "8-10" },
      { id: "press_inclinado_mancuernas", name: "Press inclinado con mancuernas", sets: 3, reps: "10-12" },
      { id: "aperturas_polea", name: "Aperturas en polea (cruce)", sets: 3, reps: "12-15" },
      { id: "press_militar", name: "Press militar con mancuernas", sets: 3, reps: "8-10" },
      { id: "elevaciones_laterales", name: "Elevaciones laterales", sets: 3, reps: "12-15" },
      { id: "fondos_triceps", name: "Fondos en máquina o paralelas", sets: 3, reps: "10-12" },
      { id: "extension_triceps_polea", name: "Extensión de tríceps en polea", sets: 3, reps: "12-15" }
    ]
  },
  dia2: {
    label: "Espalda, bíceps y trapecios",
    short: "Día 2",
    exercises: [
      { id: "dominadas_jalon", name: "Jalón al pecho o dominadas asistidas", sets: 4, reps: "8-10" },
      { id: "remo_polea", name: "Remo en polea baja", sets: 3, reps: "10-12" },
      { id: "remo_mancuerna", name: "Remo a una mano con mancuerna", sets: 3, reps: "10-12" },
      { id: "encogimientos", name: "Encogimientos de trapecio (shrugs)", sets: 3, reps: "12-15" },
      { id: "curl_biceps_barra", name: "Curl de bíceps con barra", sets: 3, reps: "10-12" },
      { id: "curl_martillo", name: "Curl martillo con mancuernas", sets: 3, reps: "12-15" },
      { id: "face_pull", name: "Face pull en polea", sets: 3, reps: "15" }
    ]
  }
};

const STORAGE_KEY = "rutina-app-data-v1";

// ---------- Estado ----------
let state = {
  currentDay: "dia1",
  currentView: "workout",
  log: {},      // sesiones en curso, sin guardar todavía: { "dia1_2026-06-22": [ {exerciseId, sets:[{reps,weight}]} ] }
  history: []   // entrenamientos guardados
};

function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function formatDateLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// ---------- Persistencia ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.history = parsed.history || [];
    }
  } catch (e) {
    console.error("Error cargando datos", e);
    state.history = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ history: state.history }));
  } catch (e) {
    console.error("Error guardando datos", e);
  }
}

// ---------- Lógica de sesión ----------
function getSessionLog(dayId, dateKey) {
  const key = dayId + "_" + dateKey;
  if (!state.log[key]) {
    const day = ROUTINE[dayId];
    state.log[key] = day.exercises.map(ex => ({
      exerciseId: ex.id,
      sets: Array.from({ length: ex.sets }, () => ({ reps: "", weight: "" }))
    }));
  }
  return state.log[key];
}

function setSetValue(dayId, dateKey, exIndex, setIndex, field, value) {
  const log = getSessionLog(dayId, dateKey);
  log[exIndex].sets[setIndex][field] = value;
}

function addSet(exIndex) {
  const log = getSessionLog(state.currentDay, todayKey());
  log[exIndex].sets.push({ reps: "", weight: "" });
  renderWorkoutView();
}

function finishWorkout() {
  const dateKey = todayKey();
  const dayId = state.currentDay;
  const log = getSessionLog(dayId, dateKey);

  const hasData = log.some(ex => ex.sets.some(s => s.reps !== "" || s.weight !== ""));
  if (!hasData) {
    alert("Registra al menos una serie antes de guardar el entrenamiento.");
    return;
  }

  const entry = {
    date: dateKey,
    dayId: dayId,
    dayLabel: ROUTINE[dayId].short + " — " + ROUTINE[dayId].label,
    exercises: log.map(ex => {
      const def = ROUTINE[dayId].exercises.find(e => e.id === ex.exerciseId);
      return {
        name: def.name,
        sets: ex.sets.filter(s => s.reps !== "" || s.weight !== "")
      };
    }).filter(ex => ex.sets.length > 0)
  };

  // si ya había un entrenamiento guardado hoy para este día, lo reemplazamos
  state.history = state.history.filter(h => !(h.date === dateKey && h.dayId === dayId));
  state.history.unshift(entry);
  saveData();

  delete state.log[dayId + "_" + dateKey];

  switchView("history");
}

function deleteHistoryEntry(index) {
  if (!confirm("¿Eliminar este entrenamiento del historial?")) return;
  state.history.splice(index, 1);
  saveData();
  renderHistoryView();
}

// ---------- Navegación ----------
function switchDay(dayId) {
  state.currentDay = dayId;
  renderWorkoutView();
}

function switchView(view) {
  state.currentView = view;
  document.getElementById("view-workout").classList.toggle("active", view === "workout");
  document.getElementById("view-history").classList.toggle("active", view === "history");
  document.getElementById("nav-workout").classList.toggle("active", view === "workout");
  document.getElementById("nav-history").classList.toggle("active", view === "history");
  if (view === "workout") renderWorkoutView();
  if (view === "history") renderHistoryView();
}

// ---------- Render ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderWorkoutView() {
  const container = document.getElementById("view-workout");
  const dateKey = todayKey();
  const dayId = state.currentDay;
  const day = ROUTINE[dayId];
  const log = getSessionLog(dayId, dateKey);

  const dayTabsHtml = Object.keys(ROUTINE).map(id => {
    const active = id === dayId;
    return `<button class="day-tab${active ? ' active' : ''}" data-day="${id}">${ROUTINE[id].short}<br>${ROUTINE[id].label}</button>`;
  }).join("");

  const exercisesHtml = day.exercises.map((ex, exIndex) => {
    const exLog = log[exIndex];
    const setsHtml = exLog.sets.map((s, setIndex) => `
      <div class="set-row">
        <span class="set-num">${setIndex + 1}</span>
        <input type="number" inputmode="numeric" placeholder="reps" value="${s.reps}"
          data-ex="${exIndex}" data-set="${setIndex}" data-field="reps" class="set-input" />
        <input type="number" inputmode="decimal" placeholder="kg" value="${s.weight}"
          data-ex="${exIndex}" data-set="${setIndex}" data-field="weight" class="set-input" />
      </div>
    `).join("");

    return `
      <div class="exercise-card">
        <div class="ex-header">
          <p class="ex-name">${escapeHtml(ex.name)}</p>
          <span class="ex-target">objetivo ${ex.reps} reps</span>
        </div>
        <div class="col-labels">
          <span></span>
          <span>repeticiones</span>
          <span>peso (kg)</span>
        </div>
        ${setsHtml}
        <button class="add-set-btn" data-add-set="${exIndex}">+ añadir serie</button>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="day-tabs">${dayTabsHtml}</div>
    <div>${exercisesHtml}</div>
    <button class="finish-btn" id="finish-btn">Guardar entrenamiento de hoy</button>
  `;

  container.querySelectorAll("[data-day]").forEach(btn => {
    btn.addEventListener("click", () => switchDay(btn.dataset.day));
  });
  container.querySelectorAll(".set-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const exIndex = parseInt(e.target.dataset.ex);
      const setIndex = parseInt(e.target.dataset.set);
      const field = e.target.dataset.field;
      setSetValue(dayId, dateKey, exIndex, setIndex, field, e.target.value);
    });
  });
  container.querySelectorAll("[data-add-set]").forEach(btn => {
    btn.addEventListener("click", () => addSet(parseInt(btn.dataset.addSet)));
  });
  document.getElementById("finish-btn").addEventListener("click", finishWorkout);
}

function renderHistoryView() {
  const container = document.getElementById("view-history");

  if (state.history.length === 0) {
    container.innerHTML = `<p class="empty-state">Todavía no has guardado ningún entrenamiento.<br>Ve a "Entrenar" para registrar tu primera sesión.</p>`;
    return;
  }

  const entriesHtml = state.history.map((entry, index) => {
    const exercisesList = entry.exercises.map(ex => {
      const setsStr = ex.sets.map(s => {
        const parts = [];
        if (s.reps !== "") parts.push(s.reps + " reps");
        if (s.weight !== "") parts.push(s.weight + " kg");
        return parts.join(" × ");
      }).join(" · ");
      return `<div class="h-exercise"><strong>${escapeHtml(ex.name)}</strong> <span class="ex-sets">— ${setsStr}</span></div>`;
    }).join("");

    return `
      <div class="history-entry">
        <div class="h-head">
          <span class="badge ${entry.dayId}">${escapeHtml(entry.dayLabel)}</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="h-date">${formatDateLabel(entry.date)}</span>
            <button class="delete-entry" data-delete="${index}" aria-label="Eliminar">×</button>
          </div>
        </div>
        ${exercisesList}
      </div>
    `;
  }).join("");

  container.innerHTML = entriesHtml;

  container.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteHistoryEntry(parseInt(btn.dataset.delete)));
  });
}

// ---------- Navegación inferior ----------
document.getElementById("nav-workout").addEventListener("click", () => switchView("workout"));
document.getElementById("nav-history").addEventListener("click", () => switchView("history"));

// ---------- Inicio ----------
loadData();
renderWorkoutView();

// ---------- Service worker (para que funcione offline e instalable) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.error("SW error", err));
  });
}
