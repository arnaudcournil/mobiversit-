function enableCollapse() {
    const collapsesBtn = document.getElementsByClassName('collapseBtn');
    //get the data-target attribute from the button
    //const collaspe_target = collapseBtn.getAttribute('data-target');
    const collapsesContent = document.getElementsByClassName('collapse');
    
    for(let i = 0; i < collapsesBtn.length; i++) {
        collapsesBtn[i].addEventListener('click', function() {
            if (collapsesContent[i].classList.contains('open')) {
                collapsesContent[i].classList.remove('open');
            } else {
                for (let j = 0; j < collapsesContent.length; j++) {
                    if (collapsesContent[j].classList.contains('open')) {
                        collapsesContent[j].classList.remove('open');
                    }
                }
                collapsesContent[i].classList.add('open');
            }
            }
        );
    }
};

async function readCSV(filePath) {
  try {
      const response = await fetch(filePath);
      if (response.status !== 200) {
          throw new Error(`Erreur lors du chargement du fichier: ${response.status}`);
      }

      const csvText = await response.text();
      const rows = csvText.split('\n');
      const headers = rows[0].split(',');

      const jsonData = [];

      for (let i = 1; i < rows.length; i++) {
          const row = rows[i].split(',');
          if (row.length !== headers.length) {
              continue;
          }

          const obj = {};
          for (let j = 0; j < headers.length; j++) {
              obj[headers[j].trim()] = row[j].trim();
          }
          jsonData.push(obj);
      }

      return jsonData;
  } catch (error) {
      console.error("Une erreur s'est produite :", error);
      return null;
  }
}

// Appel de la fonction readCSV
(async function() {
  try {
      const df = await readCSV('assets/od_footprints_random.csv');

      // Convverti station_footprint_start, station_footprint_end, footprint_main_leg, rab_dif_footprint_start, rab_dif_footprint_end et total en nombre
      df.forEach(row => {
          row.station_footprint_start = Number(row.station_footprint_start);
          row.station_footprint_end = Number(row.station_footprint_end);
          row.footprint_main_leg = Number(row.footprint_main_leg);
          row.rab_dif_footprint_start = Number(row.rab_dif_footprint_start);
          row.rab_dif_footprint_end = Number(row.rab_dif_footprint_end);
          row.total = Number(row.total);
      });

      // Populate dropdowns
      function populateDropdowns() {
          // Accès aux éléments <select>
          let origineSelect = document.getElementById('origine-select');

          // Vider les listes déroulantes avant de les peupler
          origineSelect.innerHTML = '';

          // Extraire les noms de stations uniques
          let uniqueStations = Array.from(new Set(df.map(item => item.gtfs_station_name_start).concat(df.map(item => item.gtfs_station_name_end))));

          // Trier les noms de stations par ordre alphabétique
          uniqueStations.sort();

          // Remplir la liste d'origine
          uniqueStations.forEach(station => {
              let option = document.createElement('option');
              option.value = station;
              option.textContent = station;
              origineSelect.appendChild(option.cloneNode(true));
          });
          updateDropdowns();
      }

      function updateDropdowns() {
          let origineSelect = document.getElementById('origine-select');
          let destinationSelect = document.getElementById('destination-select');
          let origineValue = origineSelect.value; // optimisation

          destinationSelect.innerHTML = '';

          // Filtrer les données en fonction de la station d'origine
          let filteredData = df.filter(item =>
              item.gtfs_station_name_start == origineValue ||
              item.gtfs_station_name_end == origineValue
          );

          // Obtenir les stations correspondantes pour la destination
          let correspondingStations = Array.from(new Set(filteredData.map(item => item.gtfs_station_name_start).concat(filteredData.map(item => item.gtfs_station_name_end))));

          // Trier les noms de stations par ordre alphabétique
          correspondingStations.sort();

          // Remplir la liste de destination
          correspondingStations.forEach(station => {
              if (station !== origineValue) {
                  let option = document.createElement('option');
                  option.value = station;
                  option.textContent = station;
                  destinationSelect.appendChild(option.cloneNode(true));
              }
          });
          updateMainContent();
      }

      function createProgressBar(row, max_size = 100) {
          let section = document.createElement('section');
          let article = document.createElement('article');
          section.className =  "collapseBtn";

          // Title
          let title = document.createElement('b');
          title.textContent = {
              'train': 'Train',
              'car': 'Voiture',
              'plane': 'Avion'
          } [row.mode];
          title.style.marginLeft = '70px';
          section.appendChild(title);

          // Image
          let img = document.createElement('img');
          img.src = `assets/${row.mode}.png`;
          img.alt = row.mode;
          img.width = 40;
          img.height = 40;
          article.appendChild(img);

          // Progress bar
          let progressBar = document.createElement('div');
          progressBar.className = 'animated-progress';
          progressBar.style.width = (row.total / max_size * 800) + 'px'; // The max_value of 100 and page_width of 800 are placeholders
          progressBar.role = 'progressbar';

          let span = document.createElement('span');
          span.style.width = (row.total / max_size * 800) + 'px'; // The max_value of 100 is a placeholder
          span.style.backgroundColor = '#0088CE';
          progressBar.appendChild(span);

          // Label
          let label = document.createElement('div');
          label.className = 'progress-label';
          label.style.whiteSpace = 'nowrap';
          label.innerHTML = `<b>${row.total.toFixed(2)}</b> m² / voyageur`;

          // Append collapse
          let collapse = document.createElement('div');
          collapse.className = 'collapse';
          
          if(row.mode != "car"){
            let rabattement = document.createElement('div');
            rabattement.innerHTML = `Rabattement : <b>${row.rab_dif_footprint_start.toFixed(2)}</b> m² / voyageur`;
            collapse.appendChild(rabattement);

            let depart = document.createElement('div');
            if(row.mode == "train") depart.innerHTML = `Gare de départ : <b>${row.station_footprint_start.toFixed(2)}</b> m² / voyageur`;
            else depart.innerHTML = `Aéroport de départ : <b>${row.station_footprint_start.toFixed(2)}</b> m² / voyageur`;
            collapse.appendChild(depart);
          }

          let trajet = document.createElement('div');
          trajet.innerHTML = `Trajet principal : <b>${row.footprint_main_leg.toFixed(2)}</b> m² / voyageur`;
          collapse.appendChild(trajet);

          if(row.mode != "car"){
            let arrivee = document.createElement('div');
            if(row.mode == "train") arrivee.innerHTML = `Gare d'arrivée : <b>${row.station_footprint_end.toFixed(2)}</b> m² / voyageur`;
            else arrivee.innerHTML = `Aéroport d'arrivée : <b>${row.station_footprint_end.toFixed(2)}</b> m² / voyageur`;
            collapse.appendChild(arrivee);

            let diffusion = document.createElement('div');
            diffusion.innerHTML = `Diffusion : <b>${row.rab_dif_footprint_end.toFixed(2)}</b> m² / voyageur`;
            collapse.appendChild(diffusion);
          }

          article.appendChild(progressBar);
          article.appendChild(label);
          section.appendChild(article);
          section.appendChild(collapse);
          section.appendChild(document.createElement('p'));

          return section;
      }

      // Update main content when dropdown values change
      function updateMainContent() {
          let origineValue = document.getElementById('origine-select').value;
          let destinationValue = document.getElementById('destination-select').value;

          // Filter and manipulate data similar to your Pandas operations
          // This part is simplified for the example
          let filteredData = df.filter(item =>
              (item.gtfs_station_name_start === origineValue && item.gtfs_station_name_end === destinationValue) ||
              (item.gtfs_station_name_start === destinationValue && item.gtfs_station_name_end === origineValue)
          );

          // Clear previous content
          let mainContent = document.getElementById('main-content');
          mainContent.innerHTML = '';

          if (filteredData.length === 0) {
              mainContent.innerHTML = '<p>Aucun résultat pour cette recherche</p>';
              return;
          }

          let max_total = Math.max(...filteredData.map(item => item.total));

          let order = ["train", "plane", "car"]
          filteredData.sort((a, b) => order.indexOf(a.mode) - order.indexOf(b.mode));

          // Create new HTML content based on filtered data
          filteredData.forEach(row => {
              let progressBar = createProgressBar(row, max_total);
              mainContent.appendChild(progressBar);
          });

          enableCollapse();
      }

      // Initialization
      populateDropdowns();
      document.getElementById('origine-select').addEventListener('change', updateDropdowns);
      document.getElementById('destination-select').addEventListener('change', updateMainContent);

  } catch (error) {
      console.error("Une erreur s'est produite lors de la lecture du fichier CSV :", error);
  }
})();