Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5ZWI0M2YxNS0wNzcyLTQ4YjAtYWEzOC0wYmRhOGRkYzBlYmIiLCJpZCI6Mjk5NDY0LCJpYXQiOjE3NDYzOTEwNTN9.isnJLq0fPyNvZ9QJtCMaDnFB9hTXOyT928Rsj1QX354';

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain()
});

viewer.scene.globe.depthTestAgainstTerrain = true;

let buildingTileset;

async function loadTilesets() {
  buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(3541567); // Your asset ID
  viewer.scene.primitives.add(buildingTileset);
  await viewer.zoomTo(buildingTileset);
  document.getElementById("loadingOverlay").style.display = "none";
}

let photoTileset;

async function loadPhotogrammetry() {
  if (photoTileset) {
    viewer.scene.primitives.remove(photoTileset);
  }

  photoTileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207); // Replace with your photogrammetry asset ID
  viewer.scene.primitives.add(photoTileset);
}
window.loadPhotogrammetry = loadPhotogrammetry;

function colorByHeight() {
  buildingTileset.style = new Cesium.Cesium3DTileStyle({
    defines: { h: "Number(${feature['bldg:measuredheight']})" },
    color: {
      conditions: [
        ["${h} > 50", "color('maroon', 0.9)"],
        ["${h} > 30", "color('darkorange', 0.8)"],
        ["${h} > 15", "color('yellow', 0.6)"],
        ["true", "color('lightblue', 0.6)"]
      ]
    }
  });
  showLegend("Height");
}

function highlightByStoreys() {
  buildingTileset.style = new Cesium.Cesium3DTileStyle({
    defines: { s: "Number(${feature['bldg:storeysaboveground']})" },
    color: {
      conditions: [
        ["${s} >= 10", "color('purple', 0.9)"],
        ["${s} >= 6", "color('red', 0.8)"],
        ["${s} >= 3", "color('orange', 0.6)"],
        ["true", "color('green', 0.4)"]
      ]
    }
  });
  showLegend("Storeys");
}


function colorByEnergyDemand() {
  buildingTileset.style = new Cesium.Cesium3DTileStyle({
    defines: {
      // Use the exact property name that appears in your popup
      // (might be 'Volume', 'bldg:Volume', or something else)
      energy: "Number(${feature['Volume']} !== null ? Number(${feature['Volume']}) * 15 : 0)"
    },
    color: {
      conditions: [
        ["${energy} >= 30000", "color('red', 0.9)"],
        ["${energy} >= 15000", "color('orange', 0.8)"],
        ["${energy} > 0", "color('lightblue', 0.6)"],
        ["true", "color('gray', 0.3)"]
      ]
    }
  });
  showLegend("Energy");
}




function clearFilters() {
  buildingTileset.style = undefined;
  document.getElementById("legend").style.display = "none";
}

function showLegend(type) {
  const legend = document.getElementById("legend");
  let html = "";
  if (type === "Height") {
    html = "<b>Building Height (m)</b><br><span style='color:red'>■</span> 50+<br><span style='color:darkorange'>■</span> 30–49<br><span style='color:yellow'>■</span> 15–29<br><span style='color:lightblue'>■</span> &lt;15";
  } else if (type === "Storeys") {
    html = "<b>Storeys Above Ground</b><br><span style='color:blue'>■</span> 10+<br><span style='color:red'>■</span> 6–9<br><span style='color:orange'>■</span> 3–5<br><span style='color:green'>■</span> &lt;3";
  } else if (type === "Function") {
    html = "<b>Building Function</b><br><span style='color:yellow'>■</span> Residential<br><span style='color:orange'>■</span> Office<br><span style='color:gray'>■</span> Other";
  } else if (type === "Energy") {
    html = "<b>Energy Demand</b><br><span style='color:red'>■</span> ≥ 30,000 kWh/year<br><span style='color:orange'>■</span> 15,000 - 29,999 kWh/year<br><span style='color:lightblue'>■</span> &lt; 15,000 kWh/year";
  }
  legend.innerHTML = html;
  legend.style.display = "block";
}

document.getElementById("togglePhotogrammetryCheckbox").addEventListener("change", async function (e) {
  if (e.target.checked) {
    await loadPhotogrammetry();
    document.getElementById("toggleLabel").innerText = "Hide photogrammetry";
  } else if (photoTileset) {
    viewer.scene.primitives.remove(photoTileset);
    photoTileset = undefined;
    document.getElementById("toggleLabel").innerText = "Show photogrammetry";
  }
});

// Expose functions globally for easy button binding
window.colorByHeight = colorByHeight;
window.highlightByStoreys = highlightByStoreys;
window.colorByEnergyDemand = colorByEnergyDemand;
window.clearFilters = clearFilters;

loadTilesets();


const highlighted = {
  feature: undefined,
  originalColor: new Cesium.Color()
};

// Mouse move — highlight on hover
viewer.screenSpaceEventHandler.setInputAction((movement) => {
  if (!buildingTileset) return;

  if (Cesium.defined(highlighted.feature)) {
    try {
      highlighted.feature.color = highlighted.originalColor;
    } catch (err) {}
    highlighted.feature = undefined;
  }

  const pickedFeature = viewer.scene.pick(movement.endPosition);

  if (
    Cesium.defined(pickedFeature) &&
    pickedFeature.tileset === buildingTileset &&
    typeof pickedFeature.getProperty === "function"
  ) {
    highlighted.feature = pickedFeature;
    Cesium.Color.clone(pickedFeature.color, highlighted.originalColor);
    pickedFeature.color = Cesium.Color.YELLOW;
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

const infoPopup = document.getElementById("infoPopup");

viewer.screenSpaceEventHandler.setInputAction((movement) => {
  if (!buildingTileset) return;

  if (Cesium.defined(highlighted.feature)) {
    try {
      highlighted.feature.color = highlighted.originalColor;
    } catch (err) {}
    highlighted.feature = undefined;
  }

  const pickedFeature = viewer.scene.pick(movement.endPosition);

  if (
    Cesium.defined(pickedFeature) &&
    pickedFeature.tileset === buildingTileset &&
    typeof pickedFeature.getProperty === "function"
  ) {
    highlighted.feature = pickedFeature;
    Cesium.Color.clone(pickedFeature.color, highlighted.originalColor);
    pickedFeature.color = Cesium.Color.YELLOW;

    const gmlId = pickedFeature.getProperty("gml:id") || "-";
    const volumeRaw = pickedFeature.getProperty("Volume");
    const volumeNum = volumeRaw !== undefined && !isNaN(Number(volumeRaw)) ? Number(volumeRaw) : null;
    const volume = volumeNum !== null ? volumeNum.toFixed(2) : "-";

    let energyDemand = "-";
    let annualCost = "-";
    if (volumeNum !== null) {
        energyDemand = (volumeNum * 15).toFixed(2); // 15 kWh/m³/year
        annualCost = (energyDemand * 0.40).toFixed(2); // €0.40/kWh
    }

    const co2Emissions = volumeNum !== null ? (energyDemand * 0.31).toFixed(2) : "-";

    infoPopup.style.left = movement.endPosition.x + 10 + "px";
    infoPopup.style.top = movement.endPosition.y + 10 + "px";
    infoPopup.style.display = "block";
    infoPopup.innerHTML = `
        <b>GML ID:</b> ${gmlId}<br>
        <b>Volume:</b> ${volume} m³<br>
        <b>Energy Demand:</b> ${energyDemand} kWh/year<br>
        <b>Annual Cost:</b> €${annualCost} (Germany avg)<br>
        <b>CO₂ Emissions:</b> ${co2Emissions} kg/year (Germany avg)<br>
    `;
  } else {
    infoPopup.style.display = "none";  //  This hides the popup if not on a building
  }


 // 0.31 kg CO2/kWh

// Then add to innerHTML:

    

  
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);







