window.App = window.App || {};

App.dashboard = {
  sweChart: null,
  flowChart: null,

  init() {
    this.renderMetrics();
    document.getElementById('season-period').value = App.state.saved.season || 'aprJul';
    document.getElementById('season-period').addEventListener('change', (e) => {
      App.state.saved.season = e.target.value;
      App.storage.save({ season: e.target.value });
      this.renderMetrics();
    });
    document.getElementById('forecast-note').textContent = App.state.metrics.forecast.horizonNote;
  },

  ensureCharts() {
    if (!this.sweChart || !this.flowChart) this.renderCharts();
    else {
      this.sweChart.resize();
      this.flowChart.resize();
    }
  },

  seasonValue() {
    const m = App.state.metrics.seasonal;
    return App.state.saved.season === 'aprSep' ? m.aprSepKaf : m.aprJulKaf;
  },

  seasonPrior() {
    const m = App.state.metrics.seasonal;
    return App.state.saved.season === 'aprSep' ? m.aprSepPriorKaf : m.aprJulPriorKaf;
  },

  renderMetrics() {
    const m = App.state.metrics;
    const season = this.seasonValue();
    const prior = this.seasonPrior();
    const yoy = (((season - prior) / prior) * 100).toFixed(1);
    const sweDelta = m.swe.changePercent;
    const html = [
      card('SWE depth', m.swe.inches.toFixed(1) + ' in', (sweDelta > 0 ? '+' : '') + sweDelta + '% vs last year', sweDelta >= 0),
      card('SWE volume', m.swe.kaf.toFixed(1) + ' kAF', (m.swe.changeInches > 0 ? '+' : '') + m.swe.changeInches + ' in'),
      card('Reservoir storage', m.totals.storageKaf.toFixed(1) + ' kAF', m.totals.storageAf.toLocaleString() + ' AF'),
      card('Seasonal forecast', season.toFixed(1) + ' kAF', (yoy > 0 ? '+' : '') + yoy + '% vs prior year', yoy >= 0),
      card('Temperature', m.climate.temperatureF.toFixed(1) + ' °F', 'Basin mean'),
      card('Soil moisture', m.climate.soilMoisturePct + '%', 'ET ' + m.climate.etInchesMonth + ' in / mo')
    ].join('');
    document.getElementById('dash-metrics').innerHTML = html;

    document.getElementById('stat-swe').textContent = m.swe.inches.toFixed(1) + ' in';
    document.getElementById('stat-swe-vol').textContent = m.swe.kaf.toFixed(1) + ' kAF';
    document.getElementById('stat-storage').textContent = m.totals.storageKaf.toFixed(1) + ' kAF';
    document.getElementById('stat-inflow').textContent = m.totals.inflowCfs + ' cfs';
    document.getElementById('stat-outflow').textContent = m.totals.outflowCfs + ' cfs';
  },

  renderCharts() {
    const m = App.state.metrics;
    const grid = '#E8EEF4';
    const tick = '#6B778C';
    if (this.sweChart) this.sweChart.destroy();
    if (this.flowChart) this.flowChart.destroy();

    this.sweChart = new Chart(document.getElementById('swe-chart'), {
      type: 'line',
      data: {
        labels: m.swe.seriesLabels,
        datasets: [
          {
            label: 'Current year',
            data: m.swe.currentYear,
            borderColor: '#1565A8',
            backgroundColor: 'rgba(21,101,168,0.12)',
            fill: true,
            tension: 0.3,
            pointRadius: 3
          },
          {
            label: 'Previous year',
            data: m.swe.previousYear,
            borderColor: '#6B778C',
            borderDash: [5, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 2
          }
        ]
      },
      options: chartOpts('SWE (inches)', grid, tick)
    });

    this.flowChart = new Chart(document.getElementById('flow-chart'), {
      type: 'bar',
      data: {
        labels: m.forecast.labels,
        datasets: [{
          label: 'Forecast (cfs)',
          data: m.forecast.cfs,
          backgroundColor: '#2F4A6D'
        }]
      },
      options: chartOpts('Streamflow (cfs)', grid, tick)
    });
  }
};

function card(k, v, d, up) {
  const cls = up === false ? 'd down' : 'd';
  return '<div class="metric-card"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="' + cls + '">' + d + '</div></div>';
}

function chartOpts(title, grid, tick) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { boxWidth: 10, font: { size: 11, family: 'IBM Plex Sans' } } },
      title: { display: true, text: title, align: 'start', font: { size: 12, family: 'IBM Plex Sans' } }
    },
    scales: {
      x: { grid: { color: grid }, ticks: { color: tick, font: { size: 10 } } },
      y: { grid: { color: grid }, ticks: { color: tick, font: { size: 10 } } }
    }
  };
}
