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

app.get('/eventually', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/eventually.html'));
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

    const environmentalData = await fetchEnvironmentalData(address);


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
