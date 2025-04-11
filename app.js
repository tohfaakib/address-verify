const express = require('express');
const axios = require('axios');
const { log } = require('console');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/classic', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/classic.html'));
});



async function fetchEnvironmentalData(address) {
  const SCRAPER_API = `http://localhost:8000/scrape?address=${encodeURIComponent(address)}`;

  try {
    const response = await axios.get(SCRAPER_API);
    const data = response.data;

    return {
      wind_speed: data["wind_speed"] ?? "No Data",
      ground_snow_load: data["ground_snow_load"] ?? "No Data",
      flood_zone: data["flood_zone"] ?? "No Data",
      sds: data["sds"] ?? "No Data",
      seismic_design_category: data["seismic_design_category"] ?? "No Data",
    };
  } catch (error) {
    console.error("Error fetching from scraper API:", error.message);
    return null;
  }
}

app.post('/get_data', async (req, res) => {
  try {
    const { dataToSend } = req.body;
    const { address, city, zipcode, state } = dataToSend;

    let street;
    try {
      street = parseAddress(address);
    } catch (e) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const authkey = "bc447ed5abef387b50b76ad49a66d11c";

    // USGeocoder
    let usgeocoderData = null;
    try {
      const url = `https://usgeocoder.com/api/get_info.php?address=${street.street}&zipcode=${zipcode}&authkey=${authkey}&format=json`;
      const response = await axios.get(url);
      usgeocoderData = response.data;
    } catch (error) {
      console.error("USGeocoder error:", error.message);
    }

    // Melissa Property
    let melissaPropertyData = null;
    try {
      const pro_url = `https://property.melissadata.net/v4/WEB/LookupProperty/?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&ff=${address}&format=json`;
      const property_res = await axios.get(pro_url);
      melissaPropertyData = property_res.data;
    } catch (error) {
      console.error("Melissa Property error:", error.message);
    }

    // Melissa Global
    let melissaGlobalData = null;
    try {
      const melissa_global_url = `https://address.melissadata.net/v3/WEB/GlobalAddress/doGlobalAddress?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&a1=${address}&loc=${city}&ctry=USA&admarea=${state}&format=json`;
      const global_res = await axios.get(melissa_global_url);
      melissaGlobalData = global_res.data;
    } catch (error) {
      console.error("Melissa Global error:", error.message);
    }

    // Climate zone
    let climateZone = null;
    try {
      climateZone = getCorrespondingValue(zipcode);
    } catch (error) {
      console.error("Climate zone lookup error:", error.message);
    }

    // Environmental data
    let environmentalData = null;
    try {
      environmentalData = await fetchEnvironmentalData(address);
    } catch (error) {
      console.error("Environmental data error:", error.message);
    }

    const all_data = {
      usgeocoder: usgeocoderData,
      melissa: melissaPropertyData,
      melissa_global: melissaGlobalData,
      cliemate_zone: climateZone,
      environmentalData: environmentalData
    };

    res.json(all_data);
  } catch (error) {
    console.error("Overall server error:", error.message);
    res.status(500).json({
      usgeocoder: null,
      melissa: null,
      melissa_global: null,
      cliemate_zone: null,
      environmentalData: null,
      error: "Internal server error"
    });
  }
});



function parseAddress(address) {
  const addressParts = address.split(','); // Split the address by commas

  if (addressParts.length < 3) {
      throw new Error('Invalid address format');
  }

  const street = addressParts[0].trim();
  const city = addressParts[1].trim();
  const state = addressParts[2].trim().split(" ")[0];

  return {
      street,
      city,
      state
  };
}



// Define the path to your Excel file
const excelFilePath = path.join(__dirname, 'BuildingClimateZonesByZIPCode_ada.xlsx');

// Function to retrieve corresponding value from Excel based on zipcode
function getCorrespondingValue(zipcode) {
  // Load the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  
  // Assume the data is in the first sheet and starts from the second row
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Iterate through the rows
  for (let i = 2; ; i++) {
    const zipcodeCell = worksheet[`A${i}`];
    const valueCell = worksheet[`B${i}`];
    
    if (!zipcodeCell || !valueCell) {
      // No more data
      break;
    }
    
    const currentZipcode = zipcodeCell.v.toString();
    if (currentZipcode === zipcode) {
      return valueCell.v;
    }
  }
  
  // Zip code not found
  return 'Zip code not found';
}


  

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
