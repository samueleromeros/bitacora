# Bitácora — tu app personal

App 100% privada: no tiene login, no manda nada a ningún servidor. Todo (rutinas, objetivos, tareas) se guarda únicamente en el almacenamiento del navegador de tu iPhone. Nadie más la ve ni la usa.

## Qué incluye
- **Hoy**: la rutina de entrenamiento del día, tus tareas de hoy y objetivos próximos.
- **Calendario**: vista mensual con puntos que indican entrenamiento (verde), tareas (dorado) y vencimientos de objetivos (gris). Tocás un día para ver el detalle y cambiar la rutina asignada solo para esa fecha.
- **Rutinas**: creás tus rutinas (nombre, color, ejercicios con series/repeticiones) y las asignás a un horario semanal (ej: lunes = Empuje).
- **Objetivos**: tres tipos que se adaptan automáticamente —
  - *Progreso numérico* (ej: correr 10km, bajar 3kg): barra de progreso.
  - *Hábito diario* (ej: meditar): racha de días seguidos.
  - *Lista de pasos* (ej: planear un viaje): checklist con % completado.
- **Tareas**: lista completa con filtros (pendientes / hechas / todas), con fecha, hora y recordatorio opcional.
- **Ajustes** (ícono ⚙ arriba a la derecha): activar recordatorios, elegir con cuánta anticipación avisar, exportar/importar copia de seguridad, borrar todo.

## Cómo instalarla en tu iPhone (gratis, con GitHub Pages)

1. **Creá un repositorio en GitHub** (si no tenés cuenta, es gratis en github.com).
   - "New repository" → nombre `bitacora` → **Public** → Create repository.
   > Nota: para usar GitHub Pages gratis el repositorio tiene que ser público. Esto solo hace público el *código* de la app (el diseño), nunca tus datos personales — esos jamás salen de tu teléfono.
2. **Subí todos los archivos de esta carpeta** (manteniendo la subcarpeta `icons/`):
   - Más fácil: en la página del repo, "Add file" → "Upload files" → arrastrá todos los archivos y la carpeta `icons`.
3. **Activá GitHub Pages**:
   - Settings → Pages → en "Source" elegí `Deploy from a branch` → branch `main`, carpeta `/ (root)` → Save.
   - Esperá 1–2 minutos. Te va a dar una URL como `https://tu-usuario.github.io/bitacora/`.
4. **Instalala en tu iPhone**:
   - Abrí esa URL en **Safari** (tiene que ser Safari, no Chrome).
   - Tocá el ícono de Compartir → **"Agregar a inicio"**.
   - Abrí la app desde el ícono que apareció en tu pantalla de inicio (no desde Safari).
5. **Activá los recordatorios**:
   - Dentro de la app (ya instalada), tocá el ⚙ → activá "Recordatorios" → aceptá el permiso que pide iOS.

## Sobre las notificaciones (importante)

iOS permite que esta app te avise **mientras la tenés abierta o la abriste hace poco**. Es una limitación real de Apple para apps web: no puede "despertar" tu teléfono con la app completamente cerrada por horas, salvo que se conecte a un servicio de notificaciones push real (con servidor). Esta versión no lo necesita y funciona muy bien si la abrís un par de veces al día (por ejemplo al levantarte y antes de entrenar) — ahí te va a mostrar todo lo pendiente y próximo.

Si en algún momento querés notificaciones que lleguen incluso con el teléfono guardado, se puede agregar una segunda capa gratuita con OneSignal + GitHub Actions. Avisame y te la armo.

## Cuidá tus datos

Los datos viven en el navegador de tu teléfono. iOS puede llegar a borrar datos de sitios que no abrís durante mucho tiempo. Cada tanto, andá a Ajustes → **Exportar** para guardarte una copia de seguridad (un archivo `.json`). Si alguna vez perdés los datos, la importás desde ahí y listo.

## Personalizar

- Cambiar el nombre "Bitácora": editá `manifest.json` (`name`, `short_name`) y la etiqueta `<title>` en `index.html`.
- Colores: todo el tema está centralizado arriba de `style.css` en la sección `:root`.
