let api;
let annotations = [];
let cached = []; // [{ index, name, world:[x,y,z] }]
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
    error: () => console.error('❌ Sketchfab init error'),
  });
}

async function onReady() {
  console.log('✅ Sketchfab готовий');

  // 1) тягнемо список
  annotations = await getAnnotationListAsync().catch(() => []);
  console.log(`ℹ️ Анотацій: ${annotations.length}`);

  // 2) одразу створюємо кнопки (щоб точно бачили щось на екрані)
  createHotspots(annotations.map((a, i) => ({ index: i, name: a?.name || `Hotspot ${i+1}` })));

  // 3) паралельно намагаємось закешувати worldPosition через «тиху» пробіжку
  preloadWorldPositions(annotations).then(res => {
    cached = res;
    console.log(`✅ Кешовано: ${cached.length}/${annotations.length}`);
    updateHotspotsPosition();     // перше нормальне позиціонування
  });

  // 4) прості оновлення
  api.addEventListener('viewerresize', updateHotspotsPosition);
  api.addEventListener('camerastart', startRAF);
  api.addEventListener('camerastop', stopRAF);
  api.addEventListener('annotationFocus', () => {
    startRAF();
    setTimeout(stopRAF, 350);
  });
}

/* ---------- helpers ---------- */
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
      const focused = typeof e === 'number' ? e : (e && typeof e.index === 'number' ? e.index : null);
      if (focused === index || focused === null) { cleanup(); resolve(); }
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

function toVec3(pos) {
  if (!pos) return null;
  if (Array.isArray(pos) && pos.length >= 3) return [pos[0], pos[1], pos[2]];
  if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.z === 'number')
    return [pos.x, pos.y, pos.z];
  return null;
}

/* ---------- preload world positions (не блокує UI) ---------- */
async function preloadWorldPositions(list) {
  const result = [];

  for (let i = 0; i < list.length; i++) {
    const name = list[i]?.name || `Hotspot ${i + 1}`;

    await gotoAnnotationAsync(i);
    await waitForAnnotationFocus(i);
    await wait(120);

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

  // повернемось до першої валідної
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
  // Якщо кеш порожній — просто не чіпаємо left/top (кнопки будуть у центрі, сірі)
  if (!cached.length) return;

  cached.forEach(({ index, world }) => {
    const el = document.getElementById(`hotspot-${index}`);
    if (!el) return;

    api.getWorldToScreenCoordinates(world, (e, sc) => {
      el.style.display = 'block'; // ніколи не ховаємо під час діагностики

      if (e || !sc || typeof sc.x !== 'number' || typeof sc.y !== 'number') {
        el.dataset.bad = '1'; // червона — проєкції немає
        return;
      }

      el.dataset.bad = '0';   // синя — проєкція ок
      el.style.left = `${sc.x}px`;
      el.style.top  = `${sc.y}px`;
    });
  });
}
