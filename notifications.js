// notifications.js — Recordatorios locales.
// Funcionan mientras la app está abierta (o recién en segundo plano).
// En iPhone, además, la app debe estar agregada a la pantalla de inicio.
'use strict';

const Notifs = (() => {
  let intervalId = null;

  function isStandalone() {
    return window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isSupported() {
    return 'Notification' in window;
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    const res = await Notification.requestPermission();
    return res; // 'granted' | 'denied' | 'default'
  }

  function permissionState() {
    if (!isSupported()) return 'unsupported';
    return Notification.permission;
  }

  async function fire(title, body, tag) {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
          return;
        }
      }
      new Notification(title, { body, tag, icon: 'icons/icon-192.png' });
    } catch (e) {
      console.warn('No se pudo mostrar la notificación', e);
    }
  }

  // Revisa tareas y hábitos con horario y dispara recordatorios cuando corresponde.
  function checkDue() {
    const settings = DB.Settings.get();
    if (!settings.notificationsEnabled || Notifs.permissionState() !== 'granted') return;

    const now = new Date();
    const lead = settings.leadMinutes || 15;

    // Tareas con hora y recordatorio activado
    DB.Todos.all().forEach(t => {
      if (t.done || !t.reminder || !t.time) return;
      const when = new Date(`${t.date}T${t.time}:00`);
      const diffMin = (when - now) / 60000;
      const key = `todo:${t.id}:${t.date}`;
      if (diffMin <= lead && diffMin > -5 && !DB.NotifiedLog.has(key)) {
        Notifs.fire('Recordatorio', t.title, key);
        DB.NotifiedLog.add(key);
      }
    });

    // Rutina del día: aviso una vez a la mañana (o al abrir si es la primera vez del día)
    const todayISO = DB.todayISO();
    const routineId = DB.Schedule.routineForDate(todayISO);
    if (routineId && routineId !== 'rest') {
      const routine = DB.Routines.get(routineId);
      const key = `routine:${todayISO}`;
      if (routine && !DB.NotifiedLog.has(key)) {
        Notifs.fire('Entrenamiento de hoy', routine.name, key);
        DB.NotifiedLog.add(key);
      }
    }

    // Objetivos con fecha límite próxima (mismo día)
    DB.Goals.all().forEach(g => {
      if (!g.targetDate) return;
      const key = `goal:${g.id}:${g.targetDate}`;
      if (g.targetDate === todayISO && !DB.NotifiedLog.has(key)) {
        Notifs.fire('Objetivo vence hoy', g.title, key);
        DB.NotifiedLog.add(key);
      }
    });
  }

  function start() {
    if (intervalId) return;
    checkDue();
    intervalId = setInterval(checkDue, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkDue();
    });
  }

  return { isStandalone, isIOS, isSupported, requestPermission, permissionState, fire, checkDue, start };
})();

window.Notifs = Notifs;
