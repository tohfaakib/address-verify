// const words = [
//     'record', 'track', 'monitor', 'remember',
//     'teamwork', 'schedule', 'archive', 'prepare', 'office'
//   ];


    const words = [
        'Addition Permit', 'ADU Permit', 'As-Built Repair Permit',
        'Deck Repair Permit', 'Dry Rot/Mold Repair Permit',
        'Electrical Panel Changeout Permit', 'Fire Damage Repair Permit',
        'New Construction Permit', 'Remodel Permit', 'Reroof Permit',
        'Research Permit', 'Roof Collapse Permit', 'Siding Replacement Permit',
        'Signage Permit', 'Storm Damage Permit', 'Structural Repair Permit',
        'Tenant Improvement Permit', 'Tree Damage Repair Permit',
        'Vehicle Impact Repair Permit', 'Water Damage Repair Permit',
        'Water Heater Replacement Permit', 'Wind Damage Repair Permit'
      ];

  
  function createItem(text) {
    const div = document.createElement('div');
    div.className = 'slot-item';
    div.textContent = text;
    return div;
  }
  
  function rotate(container, index) {
    setTimeout(() => {
      for (let i = 0; i < index; i++) {
        container.appendChild(container.children[0]);
      }
      container.style.transition = 'none';
      container.style.top = '0';
    }, 500);
  }
  
  function animate(container) {
    const index = Math.floor(Math.random() * words.length);
    container.style.transition = 'top 0.5s ease';
    container.style.top = `-${index * 1.25}em`;
    rotate(container, index);
  }
  
  window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('slot-items');
    if (!container) return;
  
    // Fill with repeated words
    for (let i = 0; i < 4; i++) {
      words.forEach(word => {
        container.appendChild(createItem(word));
      });
    }
  
    setInterval(() => animate(container), 2000);
  });
  