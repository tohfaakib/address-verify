const axios = require('axios');

let config = {
  method: 'get',
  maxBodyLength: Infinity,
  url: 'https://address.melissadata.net/v3/WEB/GlobalAddress/doGlobalAddress?id=biSxhdpkI8-4KVqfEHnJ_H**nSAcwXpxhQ0PC2lXxuDAZ-**&a1=3208 Berkshire Way&loc=Sacramento&ctry=USA&admarea=CA&format=json',
  headers: { }
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});
