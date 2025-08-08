let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');

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
    updateHotspotsPosition(); // перше позиціонування
  });

  // Мінімальна кількість подій, коли треба оновлювати позиції
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastart', startRAF);
  api.addEventListener('camerastop', stopRAF);
  // коли стрибаємо до анотації — теж перерахунок
  api.addEventListener('annotationFocus', () => {
    startRAF();
    setTimeout(stopRAF, 400); // невеликий хвіст, поки камера доїде
  });
}

function createCustomHotspots() {
  // прибираємо старі (на випадок перезавантажень)
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

let rafId = null;
function startRAF() {
  if (rafId) return;
  const tick = () => {
    updateHotspotsPosition();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopRAF() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = null;
  updateHotspotsPosition();
}

function updateHotspotsPosition() {
  // Для КОЖНОЇ анотації беремо worldPosition через getAnnotation
  annotations.forEach((_, i) => {
    api.getAnnotation(i, (err, a) => {
      const el = document.getElementById(`hotspot-${i}`);
      if (!el) return;

      if (err || !a) {
        el.style.display = 'none';
        return;
      }

      const wp = a.worldPosition || a.position;
      if (!wp || typeof wp.x !== 'number') {
        el.style.display = 'none';
        return;
      }

      const world = [wp.x, wp.y, wp.z];
      api.getWorldToScreenCoordinates(world, (e2, sc) => {
        if (e2 || !sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
          el.style.display = 'none';
          return;
        }

        // Повертаються ПІКСЕЛІ в межах вікна в’ювера (без DPR-танців)
        el.style.left = `${sc.x}px`;
        el.style.top  = `${sc.y}px`;

        // Ховаємо, якщо за межами viewport (коли доступно)
        if (sc.viewport) {
          const out = sc.viewport.x < 0 || sc.viewport.x > 1 || sc.viewport.y < 0 || sc.viewport.y > 1;
          el.style.display = out ? 'none' : 'block';
        } else {
          el.style.display = 'block';
        }
      });
    });
  });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
