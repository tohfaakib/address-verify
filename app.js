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

    // const url = "https://usgeocoder.com/api/get_info.php";
    const url = "https://usgeocoder.com/api/get_info.php?address="+ addressWithoutZip +"&zipcode=" + zipcode + "&authkey=" + authkey + "&format=json"

    console.log(addressWithoutZip);
    console.log(zipcode);

    // const querystring = { addressWithoutZip, zipcode, authkey, format: "json" };

    const response = await axios.get(url);
    // const response = await axios.get(url, { params: querystring });

    console.log(response.data);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

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
