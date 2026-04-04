const express = require('express');
const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- Climate zone cache: load once at startup ---
const climateZoneMap = new Map();
(function loadClimateZones() {
  const excelFilePath = path.join(__dirname, 'BuildingClimateZonesByZIPCode_ada.xlsx');
  const workbook = XLSX.readFile(excelFilePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  for (let i = 2; ; i++) {
    const zipcodeCell = worksheet[`A${i}`];
    const valueCell = worksheet[`B${i}`];
    if (!zipcodeCell || !valueCell) break;
    climateZoneMap.set(zipcodeCell.v.toString(), valueCell.v);
  }
  console.log(`Loaded ${climateZoneMap.size} climate zone entries`);
})();

function getClimateZone(zipcode) {
  return climateZoneMap.get(zipcode) ?? 'Zip code not found';
}

// --- API key config from environment ---
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const USGEOCODER_AUTH_KEY = process.env.USGEOCODER_AUTH_KEY || '';
const MELISSA_DATA_API_KEY = process.env.MELISSA_DATA_API_KEY || '';

app.get('/config', (req, res) => {
  res.json({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
});

// --- Helper functions ---
function parseAddress(address) {
  const addressParts = address.split(',');
  if (addressParts.length < 3) {
    throw new Error('Invalid address format');
  }
  return {
    street: addressParts[0].trim(),
    city: addressParts[1].trim(),
    state: addressParts[2].trim().split(" ")[0],
  };
}

function validateInput(dataToSend) {
  if (!dataToSend || typeof dataToSend !== 'object') return "Missing request data";
  if (!dataToSend.address || typeof dataToSend.address !== 'string' || dataToSend.address.trim().length === 0) return "Address is required";
  if (!dataToSend.zipcode || typeof dataToSend.zipcode !== 'string') return "Zip code is required";
  return null;
}

// --- ArcGIS / Geo query helpers ---
function arcgisPointQuery(url, lon, lat) {
  const sep = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${sep}geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
  return axios.get(fullUrl, { timeout: 10000 });
}

async function fetchFireDistrict(lon, lat) {
  try {
    const res = await arcgisPointQuery(
      'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/California_Local_Fire_Districts/FeatureServer/0/query',
      lon, lat
    );
    const feat = res.data?.features?.[0]?.attributes;
    if (!feat) return { name: 'Not Found' };
    return { name: feat.NAME || feat.Name || 'Not Found', phone: feat.PHONE || feat.Phone || '', fdid: feat.FDID || '' };
  } catch { return { name: 'Unavailable' }; }
}

async function fetchElectricUtility(lon, lat) {
  try {
    const res = await arcgisPointQuery(
      'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/ElectricLoadServingEntities_IOU_POU/FeatureServer/0/query',
      lon, lat
    );
    const feat = res.data?.features?.[0]?.attributes;
    if (!feat) return { name: 'Not Found' };
    return { name: feat.Utility || feat.UTILITY || 'Not Found', type: feat.Type || '' };
  } catch { return { name: 'Unavailable' }; }
}

async function fetchGasUtility(lon, lat) {
  try {
    const res = await arcgisPointQuery(
      'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Natural_Gas_Service_Area/FeatureServer/0/query',
      lon, lat
    );
    const feat = res.data?.features?.[0]?.attributes;
    if (!feat) return { name: 'Not Found' };
    return { name: feat.SERVICE || feat.Name || 'Not Found' };
  } catch { return { name: 'Unavailable' }; }
}

async function fetchFemaFlood(lon, lat) {
  try {
    const res = await arcgisPointQuery(
      'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query',
      lon, lat
    );
    const feat = res.data?.features?.[0]?.attributes;
    if (!feat) return { flood_zone: 'Not in FEMA flood zone', bfe_ft: null };
    return {
      flood_zone: feat.FLD_ZONE || 'Unknown',
      zone_subtype: feat.ZONE_SUBTY || '',
      bfe_ft: feat.STATIC_BFE != null ? parseFloat(feat.STATIC_BFE) : null,
    };
  } catch { return { flood_zone: 'Unavailable', bfe_ft: null }; }
}

async function fetchGroundElevation(lon, lat) {
  try {
    const res = await axios.get(`https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}&wkid=4326&units=Feet`, { timeout: 10000 });
    const val = res.data?.value;
    if (val != null) return { ground_ft: parseFloat(val) };
    return { ground_ft: null };
  } catch { return { ground_ft: null }; }
}

async function fetchWUI(lon, lat) {
  try {
    const lonF = parseFloat(lon);
    const latF = parseFloat(lat);
    const url = `https://services.gis.ca.gov/arcgis/rest/services/Environment/Fire_Severity_Zones/MapServer/identify?geometry=${lon},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=0&mapExtent=${lonF-0.1},${latF-0.1},${lonF+0.1},${latF+0.1}&imageDisplay=400,300,96&returnGeometry=false&f=json`;
    const res = await axios.get(url, { timeout: 10000 });
    const results = res.data?.results;
    if (!results || results.length === 0) return { in_wui: false, severity: null };
    const attr = results[0].attributes;
    const severity = attr.HAZ_CLASS || attr.SRA22_2 || attr.SEVERITY || 'Unknown';
    return { in_wui: true, severity };
  } catch { return { in_wui: false, severity: 'Unavailable' }; }
}

// --- Fast endpoint: property + location + geo data ---
app.post('/get_data', async (req, res) => {
  try {
    const { dataToSend } = req.body;
    const validationError = validateInput(dataToSend);
    if (validationError) return res.status(400).json({ error: validationError });

    const { address, city, zipcode, state } = dataToSend;
    const street = parseAddress(address);

    const encodedStreet = encodeURIComponent(street.street);
    const encodedAddress = encodeURIComponent(address);
    const encodedCity = encodeURIComponent(city || '');
    const encodedState = encodeURIComponent(state || '');
    const encodedZipcode = encodeURIComponent(zipcode);

    const usgeocoderUrl = `https://usgeocoder.com/api/get_info.php?address=${encodedStreet}&zipcode=${encodedZipcode}&authkey=${USGEOCODER_AUTH_KEY}&format=json`;
    const melissaPropertyUrl = `https://property.melissadata.net/v4/WEB/LookupProperty/?id=${MELISSA_DATA_API_KEY}&ff=${encodedAddress}&format=json`;
    const melissaGlobalUrl = `https://address.melissadata.net/v3/WEB/GlobalAddress/doGlobalAddress?id=${MELISSA_DATA_API_KEY}&a1=${encodedAddress}&loc=${encodedCity}&ctry=USA&admarea=${encodedState}&format=json`;

    // Phase 1: existing API calls in parallel
    const [usgeocoderResult, melissaPropertyResult, melissaGlobalResult] = await Promise.allSettled([
      axios.get(usgeocoderUrl, { timeout: 15000 }),
      axios.get(melissaPropertyUrl, { timeout: 15000 }),
      axios.get(melissaGlobalUrl, { timeout: 15000 }),
    ]);

    const climate_zone = getClimateZone(zipcode);

    // Extract lat/lon from Melissa Global
    const melissaGlobalData = melissaGlobalResult.status === 'fulfilled' ? melissaGlobalResult.value.data : null;
    const lat = melissaGlobalData?.Records?.[0]?.Latitude;
    const lon = melissaGlobalData?.Records?.[0]?.Longitude;

    // Phase 2: geo queries in parallel (only if we have coordinates)
    let geoData = {};
    if (lat && lon) {
      const [fireResult, electricResult, gasResult, floodResult, elevResult, wuiResult] = await Promise.allSettled([
        fetchFireDistrict(lon, lat),
        fetchElectricUtility(lon, lat),
        fetchGasUtility(lon, lat),
        fetchFemaFlood(lon, lat),
        fetchGroundElevation(lon, lat),
        fetchWUI(lon, lat),
      ]);

      const flood = floodResult.status === 'fulfilled' ? floodResult.value : { flood_zone: 'Unavailable', bfe_ft: null };
      const elev = elevResult.status === 'fulfilled' ? elevResult.value : { ground_ft: null };

      // Compute freeboard
      let freeboard_ft = null;
      if (elev.ground_ft != null && flood.bfe_ft != null) {
        freeboard_ft = Math.round((elev.ground_ft - flood.bfe_ft) * 100) / 100;
      }

      geoData = {
        fire_district: fireResult.status === 'fulfilled' ? fireResult.value : { name: 'Unavailable' },
        electric_utility: electricResult.status === 'fulfilled' ? electricResult.value : { name: 'Unavailable' },
        gas_utility: gasResult.status === 'fulfilled' ? gasResult.value : { name: 'Unavailable' },
        elevation: {
          ground_ft: elev.ground_ft,
          bfe_ft: flood.bfe_ft,
          freeboard_ft,
          flood_zone: flood.flood_zone,
          zone_subtype: flood.zone_subtype || '',
        },
        wui: wuiResult.status === 'fulfilled' ? wuiResult.value : { in_wui: false, severity: 'Unavailable' },
      };
    }

    const all_data = {
      usgeocoder: usgeocoderResult.status === 'fulfilled' ? usgeocoderResult.value.data : null,
      melissa: melissaPropertyResult.status === 'fulfilled' ? melissaPropertyResult.value.data : null,
      melissa_global: melissaGlobalData,
      climate_zone,
      lat: lat || null,
      lon: lon || null,
      ...geoData,
    };

    res.json(all_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// --- Slow endpoint: environmental/design criteria via scraper ---
app.post('/get_environmental', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return res.status(400).json({ error: "Address is required" });
    }

    const SCRAPER_API = `http://localhost:8000/scrape?address=${encodeURIComponent(address)}`;
    const response = await axios.get(SCRAPER_API, { timeout: 90000 });
    const data = response.data;

    res.json({
      wind_speed: data["wind_speed"] ?? "No Data",
      ground_snow_load: data["ground_snow_load"] ?? "No Data",
      flood_zone: data["flood_zone"] ?? "No Data",
      sds: data["sds"] ?? "No Data",
      seismic_design_category: data["seismic_design_category"] ?? "No Data",
    });
  } catch (error) {
    console.error("Error fetching environmental data:", error.message);
    res.status(500).json({ error: "Design criteria unavailable" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
