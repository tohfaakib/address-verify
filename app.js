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
  if (!dataToSend || typeof dataToSend !== 'object') {
    return "Missing request data";
  }
  if (!dataToSend.address || typeof dataToSend.address !== 'string' || dataToSend.address.trim().length === 0) {
    return "Address is required";
  }
  if (!dataToSend.zipcode || typeof dataToSend.zipcode !== 'string') {
    return "Zip code is required";
  }
  return null;
}

// --- Fast endpoint: property + location data (1-3 seconds) ---
app.post('/get_data', async (req, res) => {
  try {
    const { dataToSend } = req.body;
    const validationError = validateInput(dataToSend);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

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

    const [usgeocoderResult, melissaPropertyResult, melissaGlobalResult] = await Promise.allSettled([
      axios.get(usgeocoderUrl, { timeout: 15000 }),
      axios.get(melissaPropertyUrl, { timeout: 15000 }),
      axios.get(melissaGlobalUrl, { timeout: 15000 }),
    ]);

    const climate_zone = getClimateZone(zipcode);

    const all_data = {
      usgeocoder: usgeocoderResult.status === 'fulfilled' ? usgeocoderResult.value.data : null,
      melissa: melissaPropertyResult.status === 'fulfilled' ? melissaPropertyResult.value.data : null,
      melissa_global: melissaGlobalResult.status === 'fulfilled' ? melissaGlobalResult.value.data : null,
      climate_zone: climate_zone,
    };

    res.json(all_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// --- Slow endpoint: environmental/design criteria via scraper (10-30+ seconds) ---
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
