let api;
let annotations = [];
let cached = []; // [{ index, name, world:[x,y,z] }]
const ui = document.getElementById('ui-elements');
const cover = document.getElementById('preload-cover');
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
    error: () => console.error('❌ Sketchfab init error'),
  });
}

async function onReady() {
  console.log('✅ Sketchfab готовий');

  // 1) беремо список анотацій
  annotations = await getAnnotationListAsync().catch(() => []);
  console.log(`ℹ️ Анотацій: ${annotations.length}`);

  // 2) кешуємо worldPosition, але під cover’ом, без «галопу»
  cover.style.display = 'grid';
  cached = await preloadWorldPositions(annotations);
  console.log(`✅ Кешовано: ${cached.length}/${annotations.length}`);

  // 3) рендеримо кнопки
  createHotspots(cached);

  // 4) первинне позиціонування
  updateHotspotsPosition();

  // 5) прибираємо cover — користувач побачить уже готовий стан
  cover.style.display = 'none';

  // 6) оновлення позицій
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastart', startRAF);
  api.addEventListener('camerastop', stopRAF);
  api.addEventListener('annotationFocus', () => {
    startRAF();
    setTimeout(stopRAF, 350);
  });
}

/* ---------- Promise helpers ---------- */
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const getAnnotationListAsync = () =>
  new Promise((res, rej) => api.getAnnotationList((e, list) => e ? rej(e) : res(list || [])));

const getAnnotationAsync = (i) =>
  new Promise((res, rej) => api.getAnnotation(i, (e, a) => e ? rej(e) : res(a)));

const gotoAnnotationAsync = (i) =>
  new Promise((res) => { try { api.gotoAnnotation(i); } catch(_) {} res(); });

function waitForAnnotationFocus(index, timeout = 2000) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { cleanup(); resolve(); } }, timeout);

    function handler(e) {
      // у різних версіях e може містити { index } або сам індекс
      const focused = typeof e === 'number' ? e : (e && typeof e.index === 'number' ? e.index : null);
      if (focused === index || focused === null) { // якщо API не дає індекс — теж резолвимо
        cleanup();
        resolve();
      }
    }
    function cleanup() {
      if (done) return;
      done = true;
      clearTimeout(t);
      try { api.removeEventListener('annotationFocus', handler); } catch(_) {}
    }

    api.addEventListener('annotationFocus', handler);
  });
}

/* ---------- utils ---------- */
function toVec3(pos) {
  if (!pos) return null;
  if (Array.isArray(pos) && pos.length >= 3) return [pos[0], pos[1], pos[2]];
  if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.z === 'number')
    return [pos.x, pos.y, pos.z];
  return null;
}

/* ---------- preload ---------- */
async function preloadWorldPositions(list) {
  const result = [];

  for (let i = 0; i < list.length; i++) {
    const name = list[i]?.name || `Hotspot ${i + 1}`;

    await gotoAnnotationAsync(i);
    // чекаємо поки viewer реально фокусне цю анотацію
    await waitForAnnotationFocus(i);
    // невеликий лаг для стабілізації
    await wait(120);

    // кілька спроб дістати worldPosition
    let wp = null;
    for (let tries = 0; tries < 5 && !wp; tries++) {
      try {
        const a = await getAnnotationAsync(i);
        wp = toVec3(a?.worldPosition) || toVec3(a?.position);
      } catch (_) {}
      if (!wp) await wait(100);
    }

    if (!wp) {
      console.warn(`⚠️ Не вдалося отримати worldPosition для #${i} (${name})`);
      continue;
    }
    result.push({ index: i, name, world: wp });
  }

  // повернемося до першої валідної (щоб старт був передбачуваний)
  if (result.length) {
    await gotoAnnotationAsync(result[0].index);
    await wait(150);
  }

  return result;
}

/* ---------- UI ---------- */
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

/* ---------- позиціонування ---------- */
function startRAF() {
  if (rafId) return;
  const tick = () => { updateHotspotsPosition(); rafId = requestAnimationFrame(tick); };
  rafId = requestAnimationFrame(tick);
}
function stopRAF() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = null;
  updateHotspotsPosition();
}

function updateHotspotsPosition() {
  if (!cached.length) return;

  cached.forEach(({ index, world }) => {
    api.getWorldToScreenCoordinates(world, (e, sc) => {
      const el = document.getElementById(`hotspot-${index}`);
      if (!el) return;
      if (e || !sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
        el.style.display = 'none';
        return;
      }
      // Оверлей один-в-один накриває viewer, тож беремо sc.x/sc.y напряму
      el.style.left = `${sc.x}px`;
      el.style.top  = `${sc.y}px`;
      el.style.display = 'block';
    });
  });
}
