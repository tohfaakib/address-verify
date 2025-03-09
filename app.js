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


/**
 * Fetches all environmental hazard data based on latitude and longitude.
 */
async function fetchEnvironmentalData(lat, lon) {
  const API_KEY = "12f80990-1384-469f-9ab1-9885693af148";
  const API_BASE_URL = "https://vt8pmhgbpp.us-east-1.awsapprunner.com/v1";

  const endpoints = {
    flood: `${API_BASE_URL}/flood?lat=${lat}&lon=${lon}&token=${API_KEY}`,
    ice: `${API_BASE_URL}/ice?lat=${lat}&lon=${lon}&standardsVersion=7-10&token=${API_KEY}`,
    rain: `${API_BASE_URL}/rain?lat=${lat}&lon=${lon}&token=${API_KEY}`,
    seismic: `${API_BASE_URL}/seismic?lat=${lat}&lon=${lon}&standardsVersion=7-10&riskLevel=2&siteClass=A&token=${API_KEY}`,
    snow: `${API_BASE_URL}/snow?lat=${lat}&lon=${lon}&standardsVersion=7-10&riskLevel=1&token=${API_KEY}`,
    tsunami: `${API_BASE_URL}/tsunami?lat=${lat}&lon=${lon}&standardsVersion=7-10&token=${API_KEY}`,
    wind: `${API_BASE_URL}/wind?lat=${lat}&lon=${lon}&standardsVersion=7-10&token=${API_KEY}`
  };

  try {
    const responses = await Promise.all([
      axios.get(endpoints.flood),
      axios.get(endpoints.ice),
      axios.get(endpoints.rain),
      axios.get(endpoints.seismic),
      axios.get(endpoints.snow),
      axios.get(endpoints.tsunami),
      axios.get(endpoints.wind)
    ]);

    // Extract site info (Elevation, Lat, Long)
    const siteInfo = responses[0].data.requestInfo?.siteInfo || {};

    // Fixing Rain Data Parsing
    const rainGroups = responses[2].data.rain?.groups ?? [];
    let rain15Min = "No Data";
    let rain60Min = "No Data";

    if (rainGroups.length > 0) {
      try {
        // Fix invalid JSON format (single quotes -> double quotes)
        const parsedRain = rainGroups.map(group =>
          JSON.parse(group.replace(/'/g, '"')) // Replace single quotes with double quotes
        );

        rain15Min = parsedRain?.[0]?.[0]?.[0] ?? "No Data"; // First row, first column
        rain60Min = parsedRain?.[1]?.[0]?.[0] ?? "No Data"; // Second row, first column
      } catch (error) {
        console.error("Error parsing rain data:", error);
      }
    }

    return {
      elevation: siteInfo.elevation ?? "No Data",
      latitude: siteInfo.latitude ?? lat,
      longitude: siteInfo.longitude ?? lon,
      standard: "ASCE 7-10", // Assuming this standard is fixed
      riskCategory: "II",
      soilClass: "D",
      windSpeed: responses[6].data.wind?.windSpeed ?? "No Data",
      seismicSDS: responses[3].data.seismic?.response?.data?.sds ?? responses[3].data.seismic?.results?.data?.sds ?? "No Data",
      seismicDesignCategory: responses[3].data.seismic?.response?.data?.sdcs ?? responses[3].data.seismic?.results?.data?.sdcs ?? "No Data",
      iceThickness: responses[1].data.ice?.[0]?.attributes?.ice_load ?? "No Data",
      groundSnowLoad: responses[4].data.snow?.snowResults?.[0]?.features?.[0]?.attributes?.Load2_1 ?? "No Data",
      rain15Min,
      rain60Min,
      floodZone: responses[0].data.flood?.[0]?.features?.[0]?.attributes?.FLD_ZONE ?? "No Data",
      tsunamiRisk: responses[5].data.tsunami?.features?.length ? "At Risk" : "Not at Risk"
    };
  } catch (error) {
    console.error("Error fetching environmental data:", error.message);
    return null;
  }
}


app.post('/get_data', async (req, res) => {
  try {
    const { dataToSend } = req.body;

    console.log("+++++++++++++++++++++")
    console.log(dataToSend)
    console.log("+++++++++++++++++++++")

    const address = dataToSend.address;

    const city = dataToSend.city;
    const zipcode = dataToSend.zipcode;
    const state = dataToSend.state;

    street = parseAddress(address)

    const authkey = "bc447ed5abef387b50b76ad49a66d11c";

    console.log("zip:", zipcode);

    const url = "https://usgeocoder.com/api/get_info.php?address="+ street.street +"&zipcode=" + zipcode + "&authkey=" + authkey + "&format=json"


    const response = await axios.get(url);

    const pro_url = 'https://property.melissadata.net/v4/WEB/LookupProperty/?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&ff=' + address + '&format=json'

    const property_res = await axios.get(pro_url);

    console.log("property:", property_res.data);


    const melissa_global_url = 'https://address.melissadata.net/v3/WEB/GlobalAddress/doGlobalAddress?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&a1=' + address + '&loc=' + city + '&ctry=USA&admarea=' + state + '&format=json'
    console.log(melissa_global_url);
    const global_res = await axios.get(melissa_global_url);

    console.log("global res:", global_res.data);

    const globalLatitude = global_res.data.Records?.[0]?.Latitude || 'Latitude not found';
    const globalLongitude = global_res.data.Records?.[0]?.Longitude || 'Longitude not found';

    console.log("Global Latitude:", globalLatitude);
    console.log("Global Longitude:", globalLongitude);

  const cliemate_zone = getCorrespondingValue(zipcode);
  console.log(`Corresponding value: ${cliemate_zone}`);

    const environmentalData = await fetchEnvironmentalData(globalLatitude, globalLongitude);


    let all_data = {
      "usgeocoder": response.data,
      "melissa": property_res.data,
      "melissa_global": global_res.data,
      "cliemate_zone": cliemate_zone,
      "environmentalData": environmentalData
    }

    console.log("all:", all_data);

    res.json(all_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
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
