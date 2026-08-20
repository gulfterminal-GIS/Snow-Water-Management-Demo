window.App = window.App || {};

App.state = {
  map: null,
  draw: null,
  metrics: null,
  saved: null,
  placeMode: null,
  pendingGauge: null,
  pendingLngLat: null,
  is3D: true,
  snowOn: true,
  riverLine: null,
  suppressClick: false
};

App.ui = {
  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  },

  closeFlyouts() {
    document.getElementById('draw-menu').classList.remove('open');
    document.getElementById('add-menu').classList.remove('open');
  },

  toggleFlyout(id) {
    const el = document.getElementById(id);
    const willOpen = !el.classList.contains('open');
    this.closeFlyouts();
    if (willOpen) el.classList.add('open');
  },

  closeDetail() {
    document.getElementById('detail-panel').classList.remove('open');
  },

  openDetail(type, title, stats, links, extraHtml) {
    document.getElementById('detail-type').textContent = type;
    document.getElementById('detail-title').textContent = title;
    let html = '<div class="stat-grid">';
    Object.keys(stats).forEach((key) => {
      html += '<div class="stat"><div class="k">' + key + '</div><div class="v">' + stats[key] + '</div></div>';
    });
    html += '</div>';
    (links || []).forEach((link, i) => {
      html += '<a class="detail-link' + (i ? ' secondary' : '') + '" href="' + link.href + '" target="_blank" rel="noopener">' + link.label + '</a>';
    });
    if (extraHtml) html += extraHtml;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-panel').classList.add('open');
  },

  showDam(p) {
    const href = (p.HYPERLINK && p.HYPERLINK.trim()) ? p.HYPERLINK.trim() : (App.config.damLinks[p.NAME] || App.config.links.dwrMap);
    this.openDetail('Dam', p.NAME, {
      Type: p.TYPE || 'Storage',
      Reservoir: p.LAKE_NAME || 'Not listed',
      River: p.RIVER_NAME || 'Blue River',
      Owner: p.OWNER || 'Not listed'
    }, [
      { href: href, label: 'Facility record →' },
      { href: App.config.links.dwrMap, label: 'DWR reservoir map →' }
    ]);
  },

  showGauge(p, coord) {
    const assignment = p.assignedTo ? p.assignedTo + ' · ' + (p.targetId || '') : 'Unassigned';
    let extra = '';
    if (coord) {
      extra = '<div class="form-field" style="margin-top:12px"><label>Reassign to</label>' +
        '<select id="reassign-target">' +
        '<option value="reservoir|Dillon Reservoir">Dillon Reservoir</option>' +
        '<option value="reservoir|Green Mountain Reservoir">Green Mountain Reservoir</option>' +
        '<option value="river|Blue River">Blue River</option>' +
        '<option value="watershed|Blue River Watershed">Blue River Watershed</option>' +
        '</select></div>' +
        '<button class="btn" id="btn-reassign" type="button" style="width:100%">Save assignment</button>';
    }
    this.openDetail('Gauge station', p.name, {
      'Station ID': p.stationId,
      Agency: p.agency,
      Flow: (p.flowCfs != null && p.flowCfs !== '' ? p.flowCfs : 'n/a') + ' cfs',
      Stage: (p.stageFt != null && p.stageFt !== '' ? p.stageFt : 'n/a') + ' ft',
      Assignment: assignment
    }, [
      { href: p.dwrUrl || App.config.links.dwrStations, label: 'Colorado DWR stations →' }
    ], extra);

    const select = document.getElementById('reassign-target');
    const current = (p.assignedTo || '') + '|' + (p.targetId || '');
    if (select && [...select.options].some((o) => o.value === current)) select.value = current;
    const btn = document.getElementById('btn-reassign');
    if (btn) {
      btn.addEventListener('click', () => {
        const [assignedTo, targetId] = document.getElementById('reassign-target').value.split('|');
        p.assignedTo = assignedTo;
        p.targetId = targetId;
        const saved = App.state.saved.placedGauges.find((g) => g.id === p.id);
        if (saved) {
          saved.assignedTo = assignedTo;
          saved.targetId = targetId;
          App.storage.save({ placedGauges: App.state.saved.placedGauges });
        }
        App.ui.toast('Assigned to ' + targetId);
        App.ui.showGauge(p, coord);
      });
    }
  },

  showSensor(p) {
    this.openDetail('Water level sensor', p.name, {
      'Sensor ID': p.sensorId,
      Reservoir: p.reservoir,
      Stage: p.stageFt + ' ft',
      Storage: p.storageAf.toLocaleString() + ' AF',
      Status: p.status,
      Updated: (p.updated || '').replace('T', ' ').replace('Z', ' UTC')
    }, [
      { href: App.config.links.dwrMap, label: 'DWR reservoir map →' }
    ], '<p class="muted" style="margin-top:10px">Demo sensor. Live reservoir telemetry can replace these sample points.</p>');
  },

  showNote(n) {
    this.openDetail('Field note', n.title, {
      Note: n.text || 'No note text',
      Location: n.coordinates[1].toFixed(5) + ', ' + n.coordinates[0].toFixed(5),
      Recorded: (n.created || '').replace('T', ' ').slice(0, 16)
    });
  },

  showExtra(item) {
    const type = item.kind === 'dam' ? 'Dam' : 'Diversion / reversion';
    this.openDetail(type, item.name, {
      Type: type,
      Location: item.coordinates[1].toFixed(5) + ', ' + item.coordinates[0].toFixed(5)
    });
  },

  showBreakpoint(record) {
    const contrib = App.analysis.contribution(record.fraction);
    this.openDetail('Reservoir breakpoint', record.reservoir, {
      'Upstream share': Math.round(record.fraction * 100) + '% of main stem',
      'Upstream SWE': contrib.inches.toFixed(1) + ' in',
      'Flow contribution': contrib.af.toLocaleString() + ' AF',
      'Volume': contrib.kaf + ' kAF'
    }, [], '<p class="muted" style="margin-top:10px">Green = upstream reach. Amber = downstream reach. Contribution uses watershed area × SWE × distance along the Blue River.</p>');
  },

  showReservoir(name) {
    const meta = App.config.reservoirMeta[name] || {};
    const sample = (App.state.metrics.reservoirs || []).find((r) => r.name === name) || {};
    const fraction = name.indexOf('Green') >= 0 ? 0.88 : 0.42;
    const contrib = App.analysis.contribution(fraction);
    this.openDetail('Reservoir', name, {
      Owner: sample.owner || meta.owner || 'Not listed',
      Capacity: (sample.capacityAf || meta.capacityAf || 0).toLocaleString() + ' AF',
      Storage: (sample.storageAf || meta.storageAf || 0).toLocaleString() + ' AF',
      'Percent full': (sample.percentFull != null ? sample.percentFull : 'n/a') + '%',
      'Water level sensors': sample.hasWaterLevelSensors ? 'Yes (2 demo)' : 'Unknown',
      'Upstream contribution': contrib.af.toLocaleString() + ' AF'
    }, [
      { href: App.config.links.dwrMap, label: 'DWR reservoir map →' }
    ]);
  },

  showWatershed() {
    const m = App.state.metrics;
    this.openDetail('Watershed', m.watershed.name, {
      HUC8: m.watershed.huc8,
      Area: m.watershed.areaAcres.toLocaleString() + ' acres',
      SWE: m.swe.inches + ' in',
      'SWE volume': m.swe.kaf + ' kAF',
      Storage: m.totals.storageKaf + ' kAF'
    });
  },

  promptLayer(feature) {
    this.modal({
      title: 'Save boundary',
      copy: 'Name this polygon. Official Blue River layers stay locked; this copy is editable.',
      fields: [
        { id: 'layer-name', label: 'Name', value: 'User watershed' },
        {
          id: 'layer-kind',
          label: 'Type',
          type: 'select',
          options: [
            { value: 'basin', label: 'Basin' },
            { value: 'watershed', label: 'Watershed' },
            { value: 'subbasin', label: 'Sub-basin' }
          ]
        }
      ],
      onOk: (values) => {
        const feat = App.state.draw.get(feature.id) || feature;
        feat.properties = Object.assign({}, feat.properties, {
          name: values['layer-name'],
          kind: values['layer-kind']
        });
        App.state.draw.add(feat);
        App.drawTools.persistDraw();
        App.ui.toast('Saved ' + values['layer-name']);
      },
      onCancel: () => {
        App.state.draw.delete([feature.id]);
      }
    });
  },

  promptNote(lngLat) {
    this.modal({
      title: 'Field note',
      copy: 'Pin a note to this location. Saved on this device for the demo.',
      fields: [
        { id: 'note-title', label: 'Title', value: 'Field observation' },
        { id: 'note-text', label: 'Note', type: 'textarea', value: '' }
      ],
      onOk: (values) => App.catalog.addNote(lngLat, values['note-title'], values['note-text'])
    });
  },

  promptExtra(kind, lngLat) {
    const label = kind === 'dam' ? 'Dam name' : 'Diversion / reversion name';
    this.modal({
      title: kind === 'dam' ? 'Add dam' : 'Add diversion / reversion',
      copy: 'This marker is stored locally for the interactive demo.',
      fields: [{ id: 'item-name', label: label, value: kind === 'dam' ? 'User dam' : 'User diversion' }],
      onOk: (values) => App.catalog.addExtra(kind, lngLat, values['item-name'])
    });
  },

  promptBreakpoint(lngLat) {
    this.modal({
      title: 'Reservoir breakpoint',
      copy: 'Identify which reservoir this break represents. Upstream and downstream reaches will be styled on the river.',
      fields: [{
        id: 'bp-res',
        label: 'Reservoir',
        type: 'select',
        options: [
          { value: 'Dillon Reservoir', label: 'Dillon Reservoir' },
          { value: 'Green Mountain Reservoir', label: 'Green Mountain Reservoir' }
        ]
      }],
      onOk: (values) => {
        const record = App.analysis.applyBreakpoint(lngLat, values['bp-res']);
        if (record) App.ui.showBreakpoint(record);
      }
    });
  },

  modal(opts) {
    const back = document.getElementById('modal');
    document.getElementById('modal-title').textContent = opts.title;
    document.getElementById('modal-copy').textContent = opts.copy || '';
    const box = document.getElementById('modal-fields');
    box.innerHTML = '';
    (opts.fields || []).forEach((field) => {
      const wrap = document.createElement('div');
      wrap.className = 'form-field';
      const label = document.createElement('label');
      label.textContent = field.label;
      wrap.appendChild(label);
      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
        input.value = field.value || '';
      } else if (field.type === 'select') {
        input = document.createElement('select');
        (field.options || []).forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = field.value || '';
      }
      input.id = field.id;
      wrap.appendChild(input);
      box.appendChild(wrap);
    });
    back.classList.add('open');

    const ok = document.getElementById('modal-ok');
    const cancel = document.getElementById('modal-cancel');
    const finish = (save) => {
      back.classList.remove('open');
      ok.onclick = null;
      cancel.onclick = null;
      if (save) {
        const values = {};
        (opts.fields || []).forEach((f) => { values[f.id] = document.getElementById(f.id).value; });
        opts.onOk(values);
      } else if (opts.onCancel) {
        opts.onCancel();
      }
    };
    ok.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
  },

  refreshUserLayers() {
    const box = document.getElementById('user-layers-list');
    const layers = App.state.saved.userLayers || [];
    if (!layers.length) {
      box.className = 'muted';
      box.textContent = 'No user boundaries yet. Use Draw to add a basin, watershed, or sub-basin.';
      return;
    }
    box.className = '';
    box.innerHTML = layers.map((layer) =>
      '<div class="user-layer-row"><span>' + layer.name + ' · ' + layer.kind + '</span></div>'
    ).join('');
  }
};

App.bindUi = function () {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'dashboard') App.dashboard.ensureCharts();
    });
  });

  const select = document.getElementById('basin-select');
  App.config.basins.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.loaded ? b.label : b.label + ' (sample not loaded)';
    opt.disabled = !b.loaded;
    opt.selected = b.loaded;
    select.appendChild(opt);
  });

  document.getElementById('link-dwr-stations').href = App.config.links.dwrStations;
  document.getElementById('link-dwr-map').href = App.config.links.dwrMap;
  document.getElementById('btn-close-detail').addEventListener('click', () => App.ui.closeDetail());
  document.getElementById('btn-report').addEventListener('click', () => App.export.report());
  document.getElementById('btn-excel').addEventListener('click', () => App.export.excel());
  document.getElementById('btn-add-note-form').addEventListener('click', () => {
    App.state.placeMode = 'note';
    App.state.map.getCanvas().style.cursor = 'crosshair';
    App.ui.toast('Click the map to pin a field note.');
  });
  document.getElementById('btn-add-diversion').addEventListener('click', () => {
    App.state.placeMode = 'diversion';
    App.state.map.getCanvas().style.cursor = 'crosshair';
    App.ui.toast('Click the map to place a diversion / reversion.');
  });

  const toggles = {
    'toggle-basin': ['basin-fill', 'basin-line'],
    'toggle-watershed': ['watershed-fill', 'watershed-line'],
    'toggle-river': ['river-glow', 'river-line', 'river-flow', 'river-upstream', 'river-downstream'],
    'toggle-reservoirs': ['reservoirs-fill', 'reservoirs-outline']
  };
  Object.keys(toggles).forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      App.layers.setVisibility(toggles[id], e.target.checked);
    });
  });
  document.getElementById('toggle-dams').addEventListener('change', (e) => App.catalog.setGroupVisible('dams', e.target.checked));
  document.getElementById('toggle-gauges').addEventListener('change', (e) => App.catalog.setGroupVisible('gauges', e.target.checked));
  document.getElementById('toggle-sensors').addEventListener('change', (e) => App.catalog.setGroupVisible('sensors', e.target.checked));
  document.getElementById('toggle-notes').addEventListener('change', (e) => App.catalog.setGroupVisible('notes', e.target.checked));
  document.getElementById('toggle-terrain').addEventListener('change', (e) => App.map.setTerrain(e.target.checked));
  document.getElementById('toggle-snow').addEventListener('change', (e) => App.map.setSnow(e.target.checked));
};

App.handleMapClick = function (e) {
  const mode = App.state.placeMode;
  if (!mode) return;
  App.state.suppressClick = true;
  setTimeout(() => { App.state.suppressClick = false; }, 400);
  const lngLat = e.lngLat;
  if (mode === 'catalog-gauge' && App.state.pendingGauge) {
    App.catalog.placeCatalogGauge(lngLat, App.state.pendingGauge);
  } else if (mode === 'gauge') {
    App.state.pendingGauge = {
      stationId: 'USER',
      name: 'User gauge',
      agency: 'User',
      parameter: 'Streamflow',
      flowCfs: 'n/a',
      stageFt: 'n/a',
      dwrUrl: App.config.links.dwrStations
    };
    App.catalog.placeCatalogGauge(lngLat, App.state.pendingGauge);
  } else if (mode === 'note') {
    App.ui.promptNote(lngLat);
  } else if (mode === 'dam') {
    App.ui.promptExtra('dam', lngLat);
  } else if (mode === 'diversion') {
    App.ui.promptExtra('diversion', lngLat);
  } else if (mode === 'breakpoint') {
    App.ui.promptBreakpoint(lngLat);
  }
  App.state.placeMode = null;
  App.state.pendingGauge = null;
  App.state.map.getCanvas().style.cursor = '';
  document.getElementById('btn-add').classList.remove('active');
};

App.handleDrop = function (e) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/gauge-id');
  if (!id) return;
  const station = App.state.gauges.features.find((f) => String(f.properties.stationId) === id);
  if (!station) return;
  const canvas = App.state.map.getCanvasContainer();
  const rect = canvas.getBoundingClientRect();
  const lngLat = App.state.map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
  App.catalog.placeCatalogGauge(lngLat, station.properties);
};

App.start = async function () {
  App.icons.mount();
  App.state.saved = App.storage.load();
  App.bindUi();
  const map = App.map.create();
  map.on('load', async () => {
    App.map.addTerrainAndSky();
    await App.layers.loadAll();
    App.drawTools.init();
    App.drawTools.restore();
    App.catalog.init();
    App.dashboard.init();
    App.widgets.init();
    map.on('click', App.handleMapClick);
    const wrap = document.getElementById('map-wrap');
    wrap.addEventListener('dragover', (ev) => ev.preventDefault());
    wrap.addEventListener('drop', App.handleDrop);
    document.addEventListener('click', (ev) => {
      if (!ev.target.closest('#draw-menu') && !ev.target.closest('#btn-draw') &&
          !ev.target.closest('#add-menu') && !ev.target.closest('#btn-add')) {
        App.ui.closeFlyouts();
      }
    });
    const m = App.state.metrics;
    document.getElementById('data-facts').innerHTML =
      '<strong>HUC8:</strong> ' + m.watershed.huc8 + '<br>' +
      '<strong>State:</strong> ' + m.watershed.state + '<br>' +
      '<strong>Area:</strong> ' + m.watershed.areaAcres.toLocaleString() + ' acres<br>' +
      '<strong>Main river:</strong> Blue River<br>' +
      '<strong>Reservoirs:</strong> Dillon, Green Mountain';
    App.ui.refreshUserLayers();
  });
};

document.addEventListener('DOMContentLoaded', App.start);
