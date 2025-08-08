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

  annotations = await getAnnotationListAsync().catch(e => (console.error(e), []));
  console.log(`ℹ️ Знайдено анотацій: ${annotations.length}`);

  // 1) кешуємо worldPosition, пробігаючись по всіх анотаціях
  cached = await preloadWorldPositions(annotations);
  console.log(`✅ Кешовано позицій: ${cached.length}/${annotations.length}`);

  // 2) малюємо кнопки
  createHotspots(cached);

  // 3) первинне позиціонування
  updateHotspotsPosition();

  // 4) оновлення при подіях
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastart', startRAF);
  api.addEventListener('camerastop', stopRAF);
  api.addEventListener('annotationFocus', () => {
    startRAF();
    setTimeout(stopRAF, 400);
  });
}

/* ---------- Promises helpers ---------- */
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const getAnnotationListAsync = () =>
  new Promise((res, rej) => api.getAnnotationList((e, list) => e ? rej(e) : res(list || [])));

const getAnnotationAsync = (i) =>
  new Promise((res, rej) => api.getAnnotation(i, (e, a) => e ? rej(e) : res(a)));

const gotoAnnotationAsync = (i, opts={}) =>
  new Promise((res) => { try { api.gotoAnnotation(i, opts); } catch(_){} res(); });

const worldToScreenAsync = (vec3) =>
  new Promise((res) => api.getWorldToScreenCoordinates(vec3, (e, sc) => res(e ? null : sc)));

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
  const delay = 350;

  for (let i = 0; i < list.length; i++) {
    const name = list[i]?.name || `Hotspot ${i + 1}`;
    await gotoAnnotationAsync(i);
    await wait(delay);

    let wp = null;
    for (let tries = 0; tries < 4 && !wp; tries++) {
      try {
        const a = await getAnnotationAsync(i);
        wp = toVec3(a?.worldPosition) || toVec3(a?.position);
      } catch (_) {}
      if (!wp) await wait(120);
    }

    if (!wp) {
      console.warn(`⚠️ Не вдалося отримати worldPosition для #${i} (${name})`);
      continue;
    }
    result.push({ index: i, name, world: wp });
  }

  if (result.length) {
    await gotoAnnotationAsync(result[0].index);
    await wait(delay);
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

/* ---------- positioning ---------- */
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

async function updateHotspotsPosition() {
  if (!cached.length) return;

  // ВАЖЛИВО: наш оверлей точно співпадає з iframe (inset:0),
  // ТОМУ НЕ додаємо ніяких rect.left/top. Використовуємо sc.x/sc.y напряму.
  const projs = await Promise.all(cached.map(item => worldToScreenAsync(item.world)));

  projs.forEach((sc, idx) => {
    const { index } = cached[idx];
    const el = document.getElementById(`hotspot-${index}`);
    if (!el) return;

    if (!sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
      // тимчасово не ховаємо, щоб бачити, що відбувається
      return;
    }

    el.style.left = `${sc.x}px`;
    el.style.top  = `${sc.y}px`;
    el.style.display = 'block';
  });
}
