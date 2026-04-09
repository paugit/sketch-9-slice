import BrowserWindow from 'sketch-module-web-view';
import sketch from 'sketch';
import { setLayerSettingForKey } from 'sketch/settings';

export default function(context) {
  const document = sketch.fromNative(context.document);
  const selection = document.selectedLayers.layers;

  if (selection.length === 0 || selection[0].type !== 'Image') {
    sketch.UI.alert('9-Slice', 'Select an Image layer first.');
    return;
  }

  const layer = selection[0];
  const W = layer.frame.width;
  const H = layer.frame.height;
  const defaultInset = Math.round(Math.min(W, H) * 0.2 / 5) * 5 || 10;

  // Save image to temp PNG file
  const imageData = layer.sketchObject.image();
  if (!imageData) {
    sketch.UI.alert('9-Slice', 'Could not read image data from the selected layer.');
    return;
  }
  const nsImage = imageData.NSImage();
  const tiff = nsImage.TIFFRepresentation();
  const rep = NSBitmapImageRep.imageRepWithData_(tiff);
  const pngData = rep.representationUsingType_properties_(NSPNGFileType, null);
  const tmpPath = `/tmp/sketch-9slice-preview-${Date.now()}.png`;
  pngData.writeToFile_atomically_(tmpPath, true);

  // No fixed identifier — each invocation gets a fresh BrowserWindow,
  // preventing duplicate event listeners if the user opens the panel twice.
  const win = new BrowserWindow({
    width: 620,
    height: 540,
    title: '9-Slice Editor',
    backgroundColor: '#1e1e1e',
    show: false,
  });

  // Delete temp file and do any other teardown when the window is fully gone.
  win.on('closed', function() {
    NSFileManager.defaultManager().removeItemAtPath_error_(tmpPath, null);
  });

  // Webview signals it's ready → send image data.
  win.webContents.on('ready', function() {
    win.show();
    win.webContents
      .executeJavaScript(
        `window.receiveImageData(${JSON.stringify(tmpPath)}, ${W}, ${H}, ${defaultInset})`
      )
      .catch(function() {});
  });

  let closing = false;
  function closeWindow() {
    if (closing) return;
    closing = true;
    win.destroy();
  }

  // User clicked Apply.
  win.webContents.on('apply', function(data) {
    setTimeout(function() {
      closeWindow();
      applyNineSlice(document, layer, W, H, data.top, data.right, data.bottom, data.left);
    }, 0);
  });

  // User clicked Cancel.
  win.webContents.on('cancel', function() {
    setTimeout(closeWindow, 0);
  });

  // Native X button — windowShouldClose: may return nil in Sketch 2026,
  // so we force-close via destroy() regardless of what the delegate returns.
  win.on('close', function() {
    setTimeout(closeWindow, 0);
  });

  // 'panel.html' is resolved automatically from Contents/Resources/
  win.loadURL('panel.html');
}

function applyNineSlice(document, layer, W, H, top, right, bottom, left) {
  const { SymbolMaster, Image, Rectangle } = sketch;
  const FIXED = 0, FILL = 2, PIN_MIN = 1, PIN_MAX = 4, PIN_ALL = 5;
  const CELL_CONFIG = [
    [[FIXED,FIXED,PIN_MIN,PIN_MIN],[FILL,FIXED,PIN_ALL,PIN_MIN],[FIXED,FIXED,PIN_MAX,PIN_MIN]],
    [[FIXED,FILL, PIN_MIN,PIN_ALL],[FILL,FILL, PIN_ALL,PIN_ALL],[FIXED,FILL, PIN_MAX,PIN_ALL]],
    [[FIXED,FIXED,PIN_MIN,PIN_MAX],[FILL,FIXED,PIN_ALL,PIN_MAX],[FIXED,FIXED,PIN_MAX,PIN_MAX]],
  ];
  const CELL_NAMES = [
    ['corner-TL', 'edge-top',    'corner-TR'],
    ['edge-left',  'center',     'edge-right'],
    ['corner-BL', 'edge-bottom', 'corner-BR'],
  ];

  const page = document.selectedPage;
  const nsImage = layer.sketchObject.image().NSImage();
  const cols = [0, left, W - right, W];
  const rows = [0, top, H - bottom, H];

  const symbol = new SymbolMaster({
    parent: page,
    name: layer.name,
    frame: new Rectangle(layer.frame.x, layer.frame.y, W, H),
  });
  setLayerSettingForKey(symbol, 'isNineSlice', true);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cellX = cols[c], cellY = rows[r];
      const cellW = cols[c+1] - cols[c], cellH = rows[r+1] - rows[r];
      const cfg = CELL_CONFIG[r][c];
      const cropped = cropNSImage(nsImage, cellX, cellY, cellW, cellH, W, H);
      const cell = new Image({
        parent: symbol,
        name: CELL_NAMES[r][c],
        frame: new Rectangle(cellX, cellY, cellW, cellH),
        image: cropped,
      });
      cell.horizontalSizing = cfg[0];
      cell.verticalSizing   = cfg[1];
      cell.horizontalPins   = cfg[2];
      cell.verticalPins     = cfg[3];
    }
  }

  layer.remove();
  sketch.UI.message('\u2705 9-Slice applied! (\u2191' + top + ' \u2192' + right + ' \u2193' + bottom + ' \u2190' + left + ')');
}

function cropNSImage(nsImage, x, y, w, h, layerW, layerH) {
  const sz = nsImage.size();
  const sx = x * sz.width / layerW;
  const sy = (layerH - y - h) * sz.height / layerH;
  const sw = w * sz.width / layerW;
  const sh = h * sz.height / layerH;
  const result = NSImage.alloc().initWithSize_(CGSizeMake(w, h));
  result.lockFocus();
  nsImage.drawInRect_fromRect_operation_fraction_(
    CGRectMake(0, 0, w, h), CGRectMake(sx, sy, sw, sh),
    NSCompositingOperationSourceOver, 1.0
  );
  result.unlockFocus();
  return result;
}
