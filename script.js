let api;
let annotations = [];
const uiContainer = document.getElementById('ui-elements');
let animHandle = null;

function initializeSketchfabAPI() {
  const iframe = document.getElementById('api-frame');
  const client = new Sketchfab(iframe);

  client.init('40fa706855ed407fbbd0123951988cc0', {
    success: (fetchedApi) => {
      api = fetchedApi;
      api.start();

      api.addEventListener('viewerready', () => {
        console.log('✅ Sketchfab готовий');

        // 1) тягнемо список
        api.getAnnotationList((err, list) => {
          if (err) {
            console.error('❌ Помилка отримання анотацій:', err);
            return;
          }
          annotations = list;
          createCustomHotspots();

          // 2) одразу оновимо позиції
          updateHotspotsPosition();
        });

        // Камера/resize — тригеримо перерахунок
        api.addEventListener('camerastart', startUpdating);
        api.addEventListener('camerastop', stopUpdating);
        api.addEventListener('viewerresize', () => {
          updateHotspotsPosition();
        });
      });
    },
    error: () => console.error('❌ Помилка ініціалізації API Sketchfab')
  });
}

function createCustomHotspots() {
  annotations.forEach((a, i) => {
    const el = document.createElement('button');
    el.className = 'custom-hotspot';
    el.id = `hotspot-${i}`;
    el.innerText = a.name || `Hotspot ${i + 1}`;
    el.onclick = () => api.gotoAnnotation(i);
    uiContainer.appendChild(el);
  });
  console.log('✅ Кастомні хотспоти створені');
}

function startUpdating() {
  if (animHandle) return;
  const tick = () => {
    updateHotspotsPosition();
    animHandle = requestAnimationFrame(tick);
  };
  animHandle = requestAnimationFrame(tick);
}

function stopUpdating() {
  if (animHandle) {
    cancelAnimationFrame(animHandle);
    animHandle = null;
  }
  updateHotspotsPosition();
}

function updateHotspotsPosition() {
  // Для кожної анотації тягнемо СВІТОВУ позицію через getAnnotation
  annotations.forEach((_, i) => {
    api.getAnnotation(i, (err, a) => {
      if (err || !a) {
        console.warn(`⚠️ Не вдалося отримати анотацію #${i}`, err);
        return;
      }

      const wp = a.worldPosition || a.position;
      if (!wp || typeof wp.x !== 'number') {
        // на всяк випадок fallback
        return;
      }

      const world = [wp.x, wp.y, wp.z];

      api.getWorldToScreenCoordinates(world, (e2, sc) => {
        const el = document.getElementById(`hotspot-${i}`);
        if (!el) return;

        if (e2 || !sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
          // Якщо не проектується (позаду камери і т.д.) — сховати
          el.style.display = 'none';
          return;
        }

        // ВАЖЛИВО: координати вже в пікселях в межах вікна в’ювера
        // тому НЕ додаємо iframeRect.left/top
        el.style.left = `${sc.x}px`;
        el.style.top = `${sc.y}px`;

        // Якщо API повертає нормалізовані (viewport) — інколи є .viewport
        if (sc.viewport) {
          const oob = sc.viewport.x < 0 || sc.viewport.x > 1 || sc.viewport.y < 0 || sc.viewport.y > 1;
          el.style.display = oob ? 'none' : 'block';
        } else {
          el.style.display = 'block';
        }
      });
    });
  });
}

window.addEventListener('DOMContentLoaded', initializeSketchfabAPI);
