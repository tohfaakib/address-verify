// Google Places Autocomplete
function initAutocomplete() {
    const addressInput = document.getElementById("addressInput");
    const autocomplete = new google.maps.places.Autocomplete(addressInput);
  
    autocomplete.addListener("place_changed", function () {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
  
      const city = place.address_components.find(c => c.types.includes("locality"));
      const zipcode = place.address_components.find(c => c.types.includes("postal_code"));
      const state = place.address_components.find(c => c.types.includes("administrative_area_level_1"));
  
      document.getElementById("cityInput").value = city ? city.long_name : "";
      document.getElementById("zipcodeInput").value = zipcode ? zipcode.long_name : "";
      document.getElementById("stateInput").value = state ? state.short_name : "";
    });
  }
  
  google.maps.event.addDomListener(window, "load", initAutocomplete);
  
  // Override the form submission behavior from Eventually
  document.querySelector('#signup-form').addEventListener('submit', async function (e) {
    e.preventDefault();
  
    const address = document.getElementById("addressInput").value.trim();
    const city = document.getElementById("cityInput").value;
    const zipcode = document.getElementById("zipcodeInput").value;
    const state = document.getElementById("stateInput").value;
    const submitButton = document.getElementById("submitButton");
    const resultDiv = document.getElementById("result");
  
    if (!address) {
      alert("Please enter an address.");
      return;
    }
  
    submitButton.disabled = true;
    submitButton.value = "Loading...";
  
    try {
      const res = await fetch("/get_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataToSend: { address, city, zipcode, state } }),
      });
  
      const data = await res.json();
      showData(data);
    } catch (err) {
      console.error(err);
      resultDiv.innerHTML = "<p style='color:red;'>Something went wrong.</p>";
      resultDiv.style.display = "block";
    }
  
    submitButton.disabled = false;
    submitButton.value = "Submit Address";
  });

  function formatLocation(inputText) {
    const words = inputText.trim().split(' ');
    const lastWord = words[words.length - 1].toLowerCase();

    if (lastWord === 'city' || lastWord === 'town') {
      const locationName = words.slice(0, -1).join(' ');
      const formattedLocation = `${lastWord.charAt(0).toUpperCase() + lastWord.slice(1)} of ${locationName}`;
      return formattedLocation;
    } else {
      return inputText;
    }
  }

  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  function roundToTwoDecimalPlaces(inputStr) {
    const number = parseFloat(inputStr);
    if (!isNaN(number)) {
      return Math.round(number * 100) / 100;
    } else {
      return "Invalid input";
    }
  }
  
  
  
  
  function showData(all_data) {
    const {
      usgeocoder = null,
      melissa = null,
      melissa_global = null,
      cliemate_zone = null,
      environmentalData = null
    } = all_data || {};
  
    const resultDiv = document.getElementById("result");
    resultDiv.style.display = "block";
    resultDiv.innerHTML = ""; // Clear previous content
  
    // Success/failure icon on button
    let statusIcon = "❌";
    const is_property_data = melissa?.Records?.length > 0;
    const addressStatus = usgeocoder?.usgeocoder?.address_info?.address_status || "Not Found";
    const submitButton = document.getElementById("submitButton");
  
    if (addressStatus === "Match Found" && is_property_data) {
      submitButton.classList.remove("error");
      submitButton.classList.add("success");
      statusIcon = "✔";
    } else {
      submitButton.classList.remove("success");
      submitButton.classList.add("error");
    }
    submitButton.innerHTML = `${statusIcon} Submit Address`;
  
    // Jurisdiction title
    let jurisdictionTitle = "Results";
    const addressInfo = usgeocoder?.usgeocoder?.address_info;
    const jurisdictionInfo = usgeocoder?.usgeocoder?.jurisdictions_info;
  
    if (addressInfo) {
      let municipalType = "Not Found";
      const municipalStatus = jurisdictionInfo?.municipal?.municipal_status;
      if (municipalStatus === "Match Found") {
        municipalType = jurisdictionInfo.municipal.municipal_type;
      } else if (addressInfo.county) {
        municipalType = addressInfo.county + " County";
      }
      jurisdictionTitle = `Jurisdiction: ${formatLocation(municipalType)}`;
    }
  
    let html = `
      <section class="result-card">
        <header><h2>${jurisdictionTitle}</h2></header>
        <div class="grid">
    `;
  
    // 🌐 Location Info
    if (melissa_global?.Records?.[0]) {
      const loc = melissa_global.Records[0];
      html += `
        <div class="subsection">
          <h3><span class="material-icons">location_on</span> Location Information</h3>
          <div class="grid">
            ${renderItem("Street", loc.FormattedAddress?.split(";")[0])}
            ${renderItem("City", loc.Locality)}
            ${renderItem("State", loc.AdministrativeArea)}
            ${renderItem("Zip", loc.PostalCode)}
            ${renderItem("County", loc.SubAdministrativeArea)}
            ${renderItem("Climate Zone", cliemate_zone)}
          </div>
        </div>
      `;
    }
  
    // 🏡 Property Info
    if (melissa?.Records?.[0]) {
      const prop = melissa.Records[0];
      html += `
        <div class="subsection">
          <h3><span class="material-icons">home</span> Property Information</h3>
          <div class="grid">
            ${renderItem("Owner", toTitleCase(prop.PrimaryOwner?.Name1Full))}
            ${renderItem("APN", prop.Parcel?.UnformattedAPN)}
            ${renderItem("Year Built", prop.PropertyUseInfo?.YearBuilt)}
            ${renderItem("SqFt", roundToTwoDecimalPlaces(prop.PropertySize?.AreaBuilding))}
            ${renderItem("Lot Size", roundToTwoDecimalPlaces(prop.PropertySize?.AreaLotSF))}
            ${renderItem("Bedrooms", prop.IntRoomInfo?.BedroomsCount)}
            ${renderItem("Total Rooms", prop.IntRoomInfo?.RoomsCount)}
          </div>
        </div>
      `;
    }
  
    // 🌿 Environmental Info - Make sure this section is displayed
    if (environmentalData) {
      html += `
        <div class="subsection">
          <h3><span class="material-icons">eco</span> Design Criteria</h3>
          <div class="grid">
            ${renderItem("Wind Speed", environmentalData.wind_speed)}
            ${renderItem("Seismic SDS", environmentalData.sds)}
            ${renderItem("Seismic Category", environmentalData.seismic_design_category)}
            ${renderItem("Snow Load", environmentalData.ground_snow_load)}
            ${renderItem("Flood Zone", environmentalData.flood_zone)}
          </div>
        </div>
      `;
    }
  
    html += `</div></section>`;
    resultDiv.innerHTML = html;
    
    // Log to check if environmentalData exists
    console.log("Environmental Data:", environmentalData);
  }
  
  // Helper functions (moved to global scope)
  function formatLocation(location) {
    return location || "Unknown";
  }
  
  function renderItem(label, value) {
    return `
      <div class="item">
        <div class="label">${label}</div>
        <div class="value">${value || "N/A"}</div>
      </div>
    `;
  }
  
