const express = require('express');
const axios = require('axios');
const { log } = require('console');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/get_data', async (req, res) => {
  try {
    const { address } = req.body;
    const zipcode = extractZipCode(address);
    const addressWithoutZip = address.replace(zipcode, '').trim();
    const authkey = "bc447ed5abef387b50b76ad49a66d11c";

    const url = "https://usgeocoder.com/api/get_info.php?address="+ addressWithoutZip +"&zipcode=" + zipcode + "&authkey=" + authkey + "&format=json"

    console.log(addressWithoutZip);
    console.log(zipcode);


    const response = await axios.get(url);

    const pro_url = 'https://property.melissadata.net/v4/WEB/LookupProperty/?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&ff=' + address + '&format=json'

    const property_res = await axios.get(pro_url);

    console.log("property:", property_res.data);

    const parsedAddress = parseAddress(address);
    const street = parsedAddress.street;
    const city = parsedAddress.city;
    const state = parsedAddress.state;

    console.log(street);
    console.log(city);
    console.log(state);

    const melissa_global_url = 'https://address.melissadata.net/v3/WEB/GlobalAddress/doGlobalAddress?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&a1=' + street + '&loc=' + city + '&ctry=USA&admarea=' + state + '&format=json'
    console.log(melissa_global_url);
    const global_res = await axios.get(melissa_global_url);

    console.log("global res:", global_res);


    let all_data = {
      "usgeocoder": response.data,
      "melissa": property_res.data,
      "melissa_global": global_res.data
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

function extractZipCode(address) {
    const words = address.trim().split(' ');
    const lastWord = words[words.length - 1];
    const zipCodeRegex = /^\d{3,6}$/; // Regular expression to match 3 to 6 numeric characters
  
    if (zipCodeRegex.test(lastWord)) {
      return lastWord;
    } else {
      // If the last word is not a valid ZIP code, return an empty string or handle the error accordingly.
      return '';
    }
  }
  

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
