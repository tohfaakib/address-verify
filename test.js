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


const address = "3208 Berkshire Way, Sacramento, CA 95864";
const parsedAddress = parseAddress(address);

console.log("Street:", parsedAddress.street);
console.log("City:", parsedAddress.city);
console.log("State:", parsedAddress.state);

