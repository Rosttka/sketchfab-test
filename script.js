let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);

function initializeSketchfabAPI() {
  const iframe = document.getElementById('api-frame');
  const client = new Sketchfab(iframe);

  client.init('40fa706855ed407fbbd0123951988cc0', {
    success: (fetchedApi) => {
      api = fetchedApi;
      api.start();
      api.addEventListener('viewerready', onViewerReady);
    },
    error: () => console.error('❌ Помилка ініціалізації Sketchfab API'),
  });
}

function onViewerReady() {
  console.log('✅ Sketchfab готовий');

  api.getAnnotationList((err, list) => {
    if (err) return console.error('❌ Не дістав список анотацій:', err);
    annotations = list || [];
    createCustomHotspots();

    // перше позиціонування
    updateHotspotsPosition();
  });

  // Мінімальний набір подій для оновлення позицій
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastop', updateHotspotsPosition);
  api.addEventListener('annotationFocus', () => setTimeout(updateHotspotsPosition, 200));
}

function createCustomHotspots() {
  uiContainer.innerHTML = '';

  annotations.forEach((a, i) => {
    const btn = document.createElement('button');
    btn.className = 'custom-hotspot';
    btn.id = `hotspot-${i}`;
    btn.textContent = a.name || `Hotspot ${i + 1}`;
    btn.addEventListener('click', () => api.gotoAnnotation(i));
    uiContainer.appendChild(btn);
  });

  console.log('✅ Кастомні хотспоти створені');
}

/**
 * Діагностична версія:
 * - НЕ ховаємо кнопки автоматично
 * - додаємо зсув iframe (на випадок, якщо він не з (0,0))
 * - лише розставляємо координати
 */
function updateHotspotsPosition() {
  const iframe = document.getElementById('api-frame');
  const rect = iframe.getBoundingClientRect();

  annotations.forEach((_, i) => {
    api.getAnnotation(i, (err, a) => {
      const el = document.getElementById(`hotspot-${i}`);
      if (!el || err || !a) return;

      const wp = a.worldPosition || a.position;
      if (!wp || typeof wp.x !== 'number') return;

      api.getWorldToScreenCoordinates([wp.x, wp.y, wp.z], (e2, sc) => {
        if (e2 || !sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') return;

        // Координати віддаються в ПІКСЕЛЯХ усередині viewer-а
        // Додаємо зсув iframe на сторінці (про всяк випадок)
        const x = rect.left + sc.x;
        const y = rect.top  + sc.y;

        el.style.left = `${x}px`;
        el.style.top  = `${y}px`;
        el.style.display = 'block';
      });
    });
  });
}
