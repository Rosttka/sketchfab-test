let api;
let annotations = [];
let cached = []; // [{index, name, world:[x,y,z]}]
const ui = document.getElementById('ui-elements');
let rafId = null;

window.addEventListener('DOMContentLoaded', init);

function init() {
  const iframe = document.getElementById('api-frame');
  const client = new Sketchfab(iframe);

  client.init('40fa706855ed407fbbd0123951988cc0', {
    success: (fetchedApi) => {
      api = fetchedApi;
      api.start();
      api.addEventListener('viewerready', onReady);
    },
    error: () => console.error('❌ Помилка ініціалізації Sketchfab API'),
  });
}

async function onReady() {
  console.log('✅ Sketchfab готовий');

  annotations = await getAnnotationListAsync();
  console.log(`ℹ️ Знайдено анотацій: ${annotations.length}`);

  // 1) Пробігаємось по всіх анотаціях і кешуємо worldPosition
  cached = await preloadWorldPositions(annotations);

  // 2) Малюємо хотспоти
  createHotspots(cached);

  // 3) Початкове позиціонування
  updateHotspotsPosition();

  // 4) Події для оновлення позицій
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastart', startRAF);
  api.addEventListener('camerastop', stopRAF);
  api.addEventListener('annotationFocus', () => {
    startRAF();
    setTimeout(stopRAF, 400);
  });
}

/* ---------- API PROMISIFIED HELPERS ---------- */

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function getAnnotationListAsync() {
  return new Promise((resolve, reject) => {
    api.getAnnotationList((err, list) => err ? reject(err) : resolve(list || []));
  });
}

function getAnnotationAsync(i) {
  return new Promise((resolve, reject) => {
    api.getAnnotation(i, (err, a) => err ? reject(err) : resolve(a));
  });
}

function gotoAnnotationAsync(i, opts = {}) {
  return new Promise((resolve) => {
    try {
      api.gotoAnnotation(i, opts);
      resolve();
    } catch (e) {
      resolve(); // навіть якщо не підтримує opts — ідемо далі
    }
  });
}

function worldToScreenAsync(vec3) {
  return new Promise((resolve) => {
    api.getWorldToScreenCoordinates(vec3, (e, sc) => {
      resolve(e ? null : sc);
    });
  });
}

/* ---------- UTILS ---------- */

function toVec3(pos) {
  if (!pos) return null;
  if (Array.isArray(pos) && pos.length >= 3) return [pos[0], pos[1], pos[2]];
  if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.z === 'number')
    return [pos.x, pos.y, pos.z];
  return null;
}

/**
 * Пробігаємось по всіх анотаціях: переходимо до кожної, чекаємо,
 * читаємо worldPosition, зберігаємо в кеш.
 */
async function preloadWorldPositions(list) {
  const result = [];
  const delay = 350; // мс — невелика затримка, щоб камера “доїхала”

  // збережемо поточний індекс, щоб повернутись (не обов’язково)
  let currentIndex = -1;

  try {
    // Спробуємо зчитати фокусну анотацію (якщо є)
    // не критично, тож без зайвих викрутасів
  } catch (e) {}

  for (let i = 0; i < list.length; i++) {
    const name = list[i]?.name || `Hotspot ${i + 1}`;

    await gotoAnnotationAsync(i);
    await wait(delay);

    // кілька спроб дістати worldPosition
    let wp = null;
    for (let tries = 0; tries < 4 && !wp; tries++) {
      try {
        const a = await getAnnotationAsync(i);
        wp = toVec3(a?.worldPosition) || toVec3(a?.position);
      } catch (e) {}
      if (!wp) await wait(120);
    }

    if (!wp) {
      console.warn(`⚠️ Не вдалося отримати worldPosition для анотації #${i} (${name})`);
      continue;
    }

    result.push({ index: i, name, world: wp });
  }

  // повернемось до першої анотації, щоб не дратувати користувача
  if (result.length) {
    await gotoAnnotationAsync(result[0].index);
    await wait(delay);
  }

  console.log(`✅ Кешовано позицій: ${result.length}/${list.length}`);
  return result;
}

function createHotspots(items) {
  ui.innerHTML = '';
  items.forEach(({ index, name }) => {
    const btn = document.createElement('button');
    btn.className = 'custom-hotspot';
    btn.id = `hotspot-${index}`;
    btn.textContent = name;
    btn.addEventListener('click', () => api.gotoAnnotation(index));
    ui.appendChild(btn);
  });
  console.log('✅ Кастомні хотспоти створені');
}

/* ---------- POSITIONING ---------- */

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

async function updateHotspotsPosition() {
  if (!cached.length) return;

  const iframe = document.getElementById('api-frame');
  const rect = iframe.getBoundingClientRect();

  // Паралельно проектуємо всі точки
  const projs = await Promise.all(
    cached.map(item => worldToScreenAsync(item.world))
  );

  projs.forEach((sc, idx) => {
    const { index } = cached[idx];
    const el = document.getElementById(`hotspot-${index}`);
    if (!el) return;

    if (!sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
      el.style.display = 'none';
      return;
    }

    // x/y — пікселі в межах viewer-а; додаємо зсув iframe
    el.style.left = `${rect.left + sc.x}px`;
    el.style.top  = `${rect.top  + sc.y}px`;
    el.style.display = 'block';
  });
}
