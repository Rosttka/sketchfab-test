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
    updateHotspotsPosition(); // перше позиціонування
  });

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

// ---- helpers ----
function toVec3(pos) {
  // Повертаємо [x, y, z] з будь-якого формату
  if (!pos) return null;
  if (Array.isArray(pos) && pos.length >= 3) return [pos[0], pos[1], pos[2]];
  if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.z === 'number')
    return [pos.x, pos.y, pos.z];
  return null;
}

// -----------------
function updateHotspotsPosition() {
  const iframe = document.getElementById('api-frame');
  const rect = iframe.getBoundingClientRect();

  annotations.forEach((_, i) => {
    api.getAnnotation(i, (err, a) => {
      const el = document.getElementById(`hotspot-${i}`);
      if (!el || err || !a) return;

      // деякі версії дають worldPosition, інші — position
      let wp = toVec3(a.worldPosition) || toVec3(a.position);
      if (!wp) {
        // як fallback спробуємо й зі списку (на випадок відмінностей)
        const fromList = annotations[i];
        wp = toVec3(fromList && (fromList.worldPosition || fromList.position));
      }
      if (!wp) {
        // показати хоча б діагностику раз
        if (!el.dataset.warned) {
          console.warn(`⚠️ Аннотація #${i} без валідної позиції`, a);
          el.dataset.warned = '1';
        }
        return;
      }

      api.getWorldToScreenCoordinates(wp, (e2, sc) => {
        if (e2 || !sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
          if (!el.dataset.warned2) {
            console.warn(`⚠️ Не проектується #${i}`, { e2, sc, wp });
            el.dataset.warned2 = '1';
          }
          return;
        }

        // sc.x/sc.y — пікселі в межах viewer-а; додаємо зсув iframe на сторінці
        const x = rect.left + sc.x;
        const y = rect.top  + sc.y;

        el.style.left = `${x}px`;
        el.style.top  = `${y}px`;
        el.style.display = 'block';
      });
    });
  });
}
