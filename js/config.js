window.App = window.App || {};

App.config = {
  mapboxToken: 'pk.eyJ1IjoiYWhtZWRoYXNoZW0xIiwiYSI6ImNsajBjYTdnMjB2M3ozY281bjlhZGhoanEifQ.b-7aKnfttDWLdhzFRr4pxQ',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  home: {
    center: [-106.20, 39.75],
    zoom: 9.5,
    pitch: 60,
    bearing: 0
  },
  terrainExaggeration: 1.4,
  paths: {
    basin: 'data/Basin_Colorado.geojson',
    watershed: 'data/Watershed_Blue.geojson',
    river: 'data/Blue_River.geojson',
    reservoirs: 'data/Reservoirs_2Count.geojson',
    dams: 'data/Dams_2Count.geojson',
    gauges: 'data/gauges.json',
    sensors: 'data/sensors.json',
    metrics: 'data/metrics.json'
  },
  links: {
    dwrStations: 'https://dwr.state.co.us/Tools/Stations?Stations=Current&submitButton=Submit&SelectedDataCategory=Surface%20Water',
    dwrMap: 'https://maps.dnrgis.state.co.us/dwr/Index.html?viewer=mapviewer',
    usbrGreenMountain: 'https://www.usbr.gov/projects/index.php?id=174',
    denverWaterDillon: 'https://www.denverwater.org/your-water/water-supply-and-planning/reservoirs'
  },
  basins: [
    { id: 'arkansas', label: 'Arkansas River Basin', loaded: false },
    { id: 'colorado', label: 'Colorado River Basin', loaded: true, watershed: 'Blue River' },
    { id: 'dolores', label: 'Dolores / San Juan / San Miguel Basin', loaded: false },
    { id: 'gunnison', label: 'Gunnison River Basin', loaded: false },
    { id: 'north-platte', label: 'North Platte River Basin', loaded: false },
    { id: 'republican', label: 'Republican River Basin', loaded: false },
    { id: 'rio-grande', label: 'Rio Grande Basin', loaded: false },
    { id: 'south-platte', label: 'South Platte River Basin', loaded: false },
    { id: 'yampa', label: 'Yampa / White / Green River Basins', loaded: false }
  ],
  reservoirMeta: {
    'Dillon Reservoir': {
      owner: 'Denver Water',
      capacityAf: 257000,
      storageAf: 198400,
      dam: 'Dillon Dam',
      mapUrl: 'https://maps.dnrgis.state.co.us/dwr/Index.html?viewer=mapviewer'
    },
    'Green Mountain Reservoir': {
      owner: 'Bureau of Reclamation',
      capacityAf: 153639,
      storageAf: 112200,
      dam: 'Green Mountain Dam',
      mapUrl: 'https://maps.dnrgis.state.co.us/dwr/Index.html?viewer=mapviewer'
    }
  },
  damLinks: {
    'Green Mountain Dam': 'https://www.usbr.gov/projects/index.php?id=174',
    'Dillon Dam': 'https://www.denverwater.org/your-water/water-supply-and-planning/reservoirs'
  },
  colors: {
    navy: '#1B2A4A',
    steel: '#2F4A6D',
    water: '#1565A8',
    watershed: '#0F766E',
    river: '#1D8CD6',
    reservoir: '#0E7490',
    snow: '#F4F7FA',
    gauge: '#15803D',
    sensor: '#0E8A9A',
    dam: '#6D5D4B',
    note: '#C2410C',
    diversion: '#6B4C9A',
    upstream: '#1B7A4A',
    downstream: '#C45C26'
  },
  storageKey: 'blueRiverDemo.v1'
};
