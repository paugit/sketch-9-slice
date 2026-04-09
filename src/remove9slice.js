import sketch from 'sketch';
import { layerSettingForKey } from 'sketch/settings';

const { UI } = sketch;

function findInstances(layers, symbolId) {
  return layers.reduce((acc, layer) => {
    if (layer.type === 'SymbolInstance' && layer.symbolId === symbolId) {
      acc.push(layer);
    } else if (layer.layers) {
      return acc.concat(findInstances(layer.layers, symbolId));
    }
    return acc;
  }, []);
}

export default function(context) {
  const document = sketch.fromNative(context.document);
  const selection = document.selectedLayers.layers;

  if (selection.length === 0) {
    UI.alert('Remove 9-Slice', 'Select a 9-Slice symbol master or instance.');
    return;
  }

  const layer = selection[0];

  // Resolve to symbol master: accept master directly or SymbolInstance
  let master = null;
  if (layer.type === 'SymbolMaster') {
    master = layer;
  } else if (layer.type === 'SymbolInstance') {
    master = layer.master;
  }

  if (!master) {
    UI.alert('Remove 9-Slice', 'Selected layer is not a 9-Slice symbol (type: ' + layer.type + ').');
    return;
  }

  if (!layerSettingForKey(master, 'isNineSlice')) {
    UI.alert('Remove 9-Slice', 'Selected symbol was not created by the 9-Slice plugin.\nName: ' + master.name);
    return;
  }

  // Count instances recursively (they may be inside groups)
  const page = document.selectedPage;
  const instances = findInstances(page.layers, master.symbolId);
  const instanceCount = instances.length;

  const instanceInfo = instanceCount > 0
    ? ' and ' + instanceCount + ' instance' + (instanceCount > 1 ? 's' : '') + ' on this page'
    : '';

  const alert = NSAlert.alloc().init();
  alert.setMessageText_('Remove 9-Slice');
  alert.setInformativeText_('This will permanently delete the symbol master' + instanceInfo + '.\n\n"' + master.name + '"');
  alert.addButtonWithTitle_('Delete');
  alert.addButtonWithTitle_('Cancel');
  alert.setAlertStyle_(NSAlertStyleWarning);

  if (alert.runModal() !== NSAlertFirstButtonReturn) return;

  instances.forEach(instance => instance.remove());

  const masterName = master.name;
  master.remove();

  const n = instances.length;
  UI.message(`\u2705 Removed: ${masterName}${n > 0 ? ` + ${n} instance${n > 1 ? 's' : ''}` : ''}`);
}
