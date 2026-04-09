/* global window */

var img  = document.getElementById('preview-img');
var wrap = document.getElementById('canvas-wrap');

var inTop    = document.getElementById('in-top');
var inRight  = document.getElementById('in-right');
var inBottom = document.getElementById('in-bottom');
var inLeft   = document.getElementById('in-left');

var imgW = 0, imgH = 0;

// Guide insets in image coordinates (points)
var guides = { top: 0, right: 0, bottom: 0, left: 0 };

// ── Receive data from plugin ───────────────────────────────────────────────
window.receiveImageData = function(filePath, w, h, defaultInset) {
  imgW = w; imgH = h;
  img.src = 'file://' + filePath;
  guides.top = guides.right = guides.bottom = guides.left = defaultInset;
  img.onload = function() { renderGuides(); updateInputs(); };
};

// ── Coordinate helpers ─────────────────────────────────────────────────────
function imgToPx(val, axis) {
  return axis === 'x' ? (val / imgW) * img.offsetWidth
                      : (val / imgH) * img.offsetHeight;
}
function pxToImg(val, axis) {
  return axis === 'x' ? (val / img.offsetWidth)  * imgW
                      : (val / img.offsetHeight) * imgH;
}

// ── Clamp helpers ──────────────────────────────────────────────────────────
function clampTop(v)    { return Math.max(1, Math.min(v, imgH - guides.bottom - 1)); }
function clampBottom(v) { return Math.max(1, Math.min(v, imgH - guides.top    - 1)); }
function clampLeft(v)   { return Math.max(1, Math.min(v, imgW - guides.right  - 1)); }
function clampRight(v)  { return Math.max(1, Math.min(v, imgW - guides.left   - 1)); }

// ── Render guide lines ─────────────────────────────────────────────────────
function renderGuides() {
  wrap.querySelectorAll('.guide').forEach(function(el) { el.remove(); });

  var defs = [
    { id: 'top',    cls: 'horizontal', axis: 'y',
      px: function() { return imgToPx(guides.top, 'y'); },
      label: function() { return 'top: ' + Math.round(guides.top); } },
    { id: 'bottom', cls: 'horizontal', axis: 'y',
      px: function() { return imgToPx(imgH - guides.bottom, 'y'); },
      label: function() { return 'bottom: ' + Math.round(guides.bottom); } },
    { id: 'left',   cls: 'vertical',   axis: 'x',
      px: function() { return imgToPx(guides.left, 'x'); },
      label: function() { return 'left: ' + Math.round(guides.left); } },
    { id: 'right',  cls: 'vertical',   axis: 'x',
      px: function() { return imgToPx(imgW - guides.right, 'x'); },
      label: function() { return 'right: ' + Math.round(guides.right); } },
  ];

  defs.forEach(function(def) {
    var el = document.createElement('div');
    el.className = 'guide ' + def.cls;
    el.dataset.id = def.id;

    if (def.cls === 'horizontal') el.style.top  = def.px() + 'px';
    else                          el.style.left = def.px() + 'px';

    var lbl = document.createElement('div');
    lbl.className = 'guide-label';
    lbl.textContent = def.label();
    el.appendChild(lbl);

    makeDraggable(el, def);
    wrap.appendChild(el);
  });
}

// ── Drag logic ─────────────────────────────────────────────────────────────
function makeDraggable(el, def) {
  el.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var startMouse = def.cls === 'horizontal' ? e.clientY : e.clientX;
    var startInset = guides[def.id];

    function onMove(e) {
      var delta    = (def.cls === 'horizontal' ? e.clientY : e.clientX) - startMouse;
      var deltaPt  = pxToImg(delta, def.axis);
      var sign     = (def.id === 'bottom' || def.id === 'right') ? -1 : 1;
      var newInset = startInset + sign * deltaPt;

      if (def.id === 'top')    guides.top    = clampTop(newInset);
      if (def.id === 'bottom') guides.bottom = clampBottom(newInset);
      if (def.id === 'left')   guides.left   = clampLeft(newInset);
      if (def.id === 'right')  guides.right  = clampRight(newInset);

      renderGuides();
      updateInputs();
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Inputs ─────────────────────────────────────────────────────────────────
function updateInputs() {
  inTop.value    = Math.round(guides.top);
  inRight.value  = Math.round(guides.right);
  inBottom.value = Math.round(guides.bottom);
  inLeft.value   = Math.round(guides.left);
}

function applyInput(id, rawVal) {
  var v = parseInt(rawVal, 10);
  if (isNaN(v)) return;
  if (id === 'top')    guides.top    = clampTop(v);
  if (id === 'right')  guides.right  = clampRight(v);
  if (id === 'bottom') guides.bottom = clampBottom(v);
  if (id === 'left')   guides.left   = clampLeft(v);
  renderGuides();
  updateInputs();
}

[
  [inTop,    'top'],
  [inRight,  'right'],
  [inBottom, 'bottom'],
  [inLeft,   'left'],
].forEach(function(pair) {
  var input = pair[0], id = pair[1];
  input.addEventListener('change', function() { applyInput(id, input.value); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { applyInput(id, input.value); input.blur(); }
    if (e.key === 'ArrowUp')   { applyInput(id, String(parseInt(input.value, 10) + 1)); e.preventDefault(); }
    if (e.key === 'ArrowDown') { applyInput(id, String(parseInt(input.value, 10) - 1)); e.preventDefault(); }
  });
});

// ── Bulk text input (top,right,bottom,left) ────────────────────────────────
var inAll = document.getElementById('in-all');

inAll.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var parts = inAll.value.split(/[\s,]+/).map(function(v) { return parseInt(v, 10); });
  if (parts.length === 1 && !isNaN(parts[0])) {
    parts = [parts[0], parts[0], parts[0], parts[0]];
  }
  if (parts.length !== 4 || parts.some(isNaN)) {
    inAll.style.borderColor = '#f55';
    return;
  }
  inAll.style.borderColor = '';
  guides.top    = Math.max(1, parts[0]);
  guides.right  = Math.max(1, parts[1]);
  guides.bottom = Math.max(1, parts[2]);
  guides.left   = Math.max(1, parts[3]);
  guides.top    = clampTop(guides.top);
  guides.bottom = clampBottom(guides.bottom);
  guides.left   = clampLeft(guides.left);
  guides.right  = clampRight(guides.right);
  renderGuides();
  updateInputs();
  inAll.value = '';
  inAll.blur();
});

inAll.addEventListener('input', function() {
  inAll.style.borderColor = '';
});

// ── Buttons ────────────────────────────────────────────────────────────────
document.getElementById('btn-apply').addEventListener('click', function() {
  window.postMessage('apply', {
    top:    Math.round(guides.top),
    right:  Math.round(guides.right),
    bottom: Math.round(guides.bottom),
    left:   Math.round(guides.left),
  });
});

document.getElementById('btn-cancel').addEventListener('click', function() {
  window.postMessage('cancel');
});

// ── Signal plugin that we're ready to receive image data ───────────────────
window.postMessage('ready');
