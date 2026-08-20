window.App = window.App || {};

App.export = {
  summaryRows() {
    const m = App.state.metrics;
    const seasonKey = App.state.saved.season === 'aprSep' ? 'April to September' : 'April to July';
    const season = App.dashboard.seasonValue();
    const prior = App.dashboard.seasonPrior();
    const yoy = (((season - prior) / prior) * 100).toFixed(1);
    return [
      ['Watershed', m.watershed.name],
      ['HUC8', m.watershed.huc8],
      ['Area (acres)', m.watershed.areaAcres],
      ['As of', m.asOf],
      ['SWE depth (in)', m.swe.inches],
      ['SWE volume (kAF)', m.swe.kaf],
      ['SWE prior year (in)', m.swe.previousYearInches],
      ['SWE change (in)', m.swe.changeInches],
      ['SWE change (%)', m.swe.changePercent],
      ['Reservoir storage (kAF)', m.totals.storageKaf],
      ['Reservoir storage (AF)', m.totals.storageAf],
      ['Seasonal period', seasonKey],
      ['Seasonal forecast (kAF)', season],
      ['Prior year seasonal (kAF)', prior],
      ['Seasonal change (%)', yoy],
      ['Streamflow forecast horizon (days)', m.forecast.horizonDays],
      ['Temperature (°F)', m.climate.temperatureF],
      ['ET (in / month)', m.climate.etInchesMonth],
      ['Soil moisture (%)', m.climate.soilMoisturePct],
      ['Inflow (cfs)', m.totals.inflowCfs],
      ['Outflow (cfs)', m.totals.outflowCfs]
    ];
  },

  excel() {
    const m = App.state.metrics;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Metric', 'Value']].concat(this.summaryRows())), 'Summary');

    const sweRows = [['Month', 'Current year (in)', 'Previous year (in)']];
    m.swe.seriesLabels.forEach((label, i) => {
      sweRows.push([label, m.swe.currentYear[i], m.swe.previousYear[i]]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sweRows), 'SWE');

    const resRows = [['Reservoir', 'Owner', 'Capacity (AF)', 'Storage (AF)', '% full', 'Water level sensors']];
    m.reservoirs.forEach((r) => {
      resRows.push([r.name, r.owner, r.capacityAf, r.storageAf, r.percentFull, r.hasWaterLevelSensors ? 'Yes' : 'No']);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resRows), 'Reservoirs');

    const fcRows = [['Day', 'Forecast (cfs)']];
    m.forecast.labels.forEach((d, i) => fcRows.push([d, m.forecast.cfs[i]]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fcRows), 'Forecast');

    XLSX.writeFile(wb, 'Blue_River_Watershed_Summary.xlsx');
  },

  report() {
    const m = App.state.metrics;
    const rows = this.summaryRows().map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('');
    const res = m.reservoirs.map((r) =>
      '<tr><td>' + r.name + '</td><td>' + r.owner + '</td><td>' + r.storageAf.toLocaleString() +
      '</td><td>' + r.capacityAf.toLocaleString() + '</td><td>' + r.percentFull + '%</td><td>' +
      (r.hasWaterLevelSensors ? 'Yes' : 'No') + '</td></tr>'
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Blue River Watershed Report</title>
      <style>
        body { font-family: "IBM Plex Sans", Calibri, sans-serif; color: #1B2A4A; padding: 32px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 16px; margin: 24px 0 8px; }
        p, td, th { font-size: 13px; }
        .sub { color: #6B778C; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th, td { border: 1px solid #D7DEE8; padding: 8px 10px; text-align: left; }
        th { background: #F4F7FA; }
        .note { font-size: 12px; color: #6B778C; margin-top: 24px; }
      </style></head><body>
      <h1>Blue River Watershed: Snow and Water Summary</h1>
      <p class="sub">Colorado River Basin · HUC8 ${m.watershed.huc8} · Demo sample dated ${m.asOf}</p>
      <h2>Platform deliverables</h2>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>Reservoir storage</h2>
      <table><thead><tr><th>Reservoir</th><th>Owner</th><th>Storage (AF)</th><th>Capacity (AF)</th><th>% full</th><th>Water level sensors</th></tr></thead>
      <tbody>${res}</tbody></table>
      <h2>Forecast notes</h2>
      <p>${m.forecast.horizonNote}</p>
      <p class="note">SWE, storage, climate, and forecast figures in this demo are representative samples, not live telemetry.</p>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }
};
