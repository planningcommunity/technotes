<!DOCTYPE html>
<html>
<head>
  <title>Project Map</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    
    /* Popup Styling */
    .popup-content { font-family: 'Helvetica Neue', Arial, sans-serif; min-width: 160px; }
    .popup-content h3 { margin: 0 0 5px; font-size: 16px; color: #333; font-weight: 600; }
    .popup-content p { margin: 0 0 10px; font-size: 13px; color: #666; }
    
    /* The Button */
    .popup-btn { 
        display: block; 
        width: 100%;
        box-sizing: border-box;
        text-align: center;
        padding: 8px 12px; 
        background: #0071C2; 
        color: white; 
        text-decoration: none; 
        border-radius: 4px; 
        font-size: 13px;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
    }
    .popup-btn:hover { background: #005a9c; }

    /* --- Clean Legend Styling --- */
    .legend {
        background: white;
        background: rgba(255, 255, 255, 0.95);
        padding: 12px 15px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 13px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border-radius: 5px;
        color: #333;
        line-height: 24px;
    }
    .legend h4 {
        margin: 0 0 10px;
        font-size: 14px;
        color: #333;
        font-weight: 600;
    }
    .legend i {
        width: 14px;
        height: 14px;
        float: left;
        margin-right: 10px;
        margin-top: 5px;
        border-radius: 3px;
        border: 1px solid rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>

  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    // 1. Initialize Map (Start zoomed out)
    const map = L.map('map').setView([28.19890992649971, 112.9634436989727], 13); 

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    let geoJsonLayer;
    let legendControl;

    // --- NEW: Helper to override colors based on Tier ---
    function getFeatureColor(priority, wixColor) {
        if (!priority) return wixColor;
        
        // Convert to string in case priority is a number (e.g. 3 instead of "Tier 3")
        let prioStr = String(priority).toLowerCase();
        
        if (prioStr.includes('3')) return '#0071C2'; // Force Tier 3 to Blue
        if (prioStr.includes('4')) return '#28a745'; // Force Tier 4 to Green
        
        return wixColor; // Otherwise, use the original color from Wix
    }

    // 2. Helper to send navigation request to Wix
    window.requestNavigation = function(url) {
        if(url) {
            window.parent.postMessage({ type: 'navigate', url: url }, "*");
        }
    }

    // 3. Listener
    window.onmessage = function(event) {
      const msg = event.data;

      if (msg && Array.isArray(msg)) {
        updateMap(msg);
      } else if (msg && msg.type === 'zoomTo') {
        findAndZoom(msg.itemId);
      }
    };

    // 4. Function to Find Feature & Zoom
    function findAndZoom(targetId) {
        if (!geoJsonLayer) return;

        let foundLayer = null;

        geoJsonLayer.eachLayer(function(layer) {
            if (layer.feature.properties.id === targetId) {
                foundLayer = layer;
            }
        });

        if (foundLayer) {
            foundLayer.openPopup();

            if (foundLayer.feature.geometry.type === "Point") {
                 map.flyTo(foundLayer.getLatLng(), 16, { animate: true, duration: 1.5 });
            } else {
                 map.flyToBounds(foundLayer.getBounds(), { padding: [50, 50], duration: 1.5 });
            }
        }
    }

    // 5. Draw Projects
    function updateMap(data) {
      if (geoJsonLayer) map.removeLayer(geoJsonLayer);

      geoJsonLayer = L.geoJSON(data, {
        
        pointToLayer: function (feature, latlng) {
          // Apply color override
          let finalColor = getFeatureColor(feature.properties.priority, feature.properties.color);
          
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: finalColor || "#FF5733",
            color: "#fff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });
        },

        style: function(feature) {
          // Apply color override for lines/polygons
          let finalColor = getFeatureColor(feature.properties.priority, feature.properties.color);
          
          return {
            color: finalColor || "#3388ff",
            weight: 4,
            opacity: 0.7
          };
        },

        onEachFeature: function (feature, layer) {
          let popupHtml = `
              <div class="popup-content">
                <h3>${feature.properties.title_fld}</h3>
                <p>Tier: ${feature.properties.priority}</p>
                <p>Est.Cost: ${feature.properties.estimatedCost}</p>
          `;
          
          if (feature.properties.url) {
              popupHtml += `<button class="popup-btn" onclick="requestNavigation('${feature.properties.url}')">Go to Project</button>`;
          }
          
          popupHtml += `</div>`;
          layer.bindPopup(popupHtml);

          layer.on('click', function (e) {
            window.parent.postMessage({
              type: 'mapClick',
              itemId: feature.properties.id 
            }, "*");

            if (feature.geometry.type === "Point") {
                map.flyTo(e.latlng, 16, { animate: true, duration: 1.5 });
            } else {
                map.flyToBounds(layer.getBounds(), { padding: [50, 50], duration: 1.5 });
            }
            
            layer.openPopup();
          });
        }
      }).addTo(map);

      // --- Generate Dynamic Legend with Overrides ---
      if (legendControl) {
          map.removeControl(legendControl); 
      }

      const tiers = {};
      data.forEach(item => {
          if (item.properties && item.properties.priority) {
              // Capture the color, processing it through our override function
              let wixColor = item.properties.color || (item.geometry && item.geometry.type === "Point" ? "#FF5733" : "#3388ff");
              let finalColor = getFeatureColor(item.properties.priority, wixColor);
              
              tiers[item.properties.priority] = finalColor;
          }
      });

      if (Object.keys(tiers).length > 0) {
          legendControl = L.control({ position: 'bottomright' });
          legendControl.onAdd = function () {
              const div = L.DomUtil.create('div', 'legend');
              div.innerHTML = '<h4>Project Priority</h4>';
              
              Object.keys(tiers).sort().forEach(priority => {
                  div.innerHTML += `<i style="background: ${tiers[priority]}"></i> ${priority}<br>`;
              });
              return div;
          };
          legendControl.addTo(map);
      }
    }
  </script>
</body>
</html>
