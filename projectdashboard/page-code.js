import wixData from 'wix-data';
import wixLocation from 'wix-location';

// --- CONFIGURATION ---
const COLLECTION_NAME = "ProjectTracker"; 
const MAP_IFRAME = $w('#html1');
const REPEATER = $w('#repeater1'); 
const DATASET = $w('#dataset1');

// --- SINGLE ONREADY BLOCK ---
$w.onReady(async function () {
    
    await setupFilterDropdowns();

    // 1. REPEATER LOGIC
    REPEATER.onItemReady(($item, itemData) => {
        // --- NEW: Format Cost on the Repeater Card ---
        if ($item('#costNum')) {
            $item('#costNum').text = formatCurrency(itemData.estimatedCost);
        }

        // Set visual cue
        /////////////////$item('#boxContainer').style.cursor = "pointer";

        $item('#boxContainer').onClick(() => {
            // A. Highlight this row
            highlightRepeaterItem(itemData._id);

            // B. Send "Zoom" command to Map
            console.log("Requesting zoom for item:", itemData.title);
            MAP_IFRAME.postMessage({
                type: 'zoomTo',
                itemId: itemData._id
            });
        });
    });

    // 2. Initial Data Load
    applyFilters();

    // 3. MAP LISTENER
    MAP_IFRAME.onMessage((event) => {
        const data = event.data;
        
        if (data && data.type === 'mapClick') {
            highlightRepeaterItem(data.itemId);
        }
        
        if (data && data.type === 'navigate' && data.url) {
            console.log("Map requested navigation to:", data.url);
            wixLocation.to(data.url);
        }
    });

    // 4. Filter Triggers
    $w('#dropdownMode').onChange(() => applyFilters());
    $w('#dropdownPriority').onChange(() => applyFilters());
});

// --- CORE FUNCTIONS ---

async function setupFilterDropdowns() {
    // Mode Dropdown
    const modeResults = await wixData.query(COLLECTION_NAME).limit(1000).distinct("modesTag"); 
    let allTags = modeResults.items.flat();
    let uniqueTags = [...new Set(allTags)].sort();
    let modeOptions = uniqueTags.map(tag => { return { label: tag, value: tag }; });
    modeOptions.unshift({ label: "All Modes", value: "All" });
    $w('#dropdownMode').options = modeOptions;
    $w('#dropdownMode').value = "All"; 

    // Priority Dropdown
    const priorityResults = await wixData.query(COLLECTION_NAME).limit(1000).distinct("priority"); 
    let priorityOptions = priorityResults.items.map(p => { return { label: p, value: p }; });
    priorityOptions.unshift({ label: "All Priorities", value: "All" });
    $w('#dropdownPriority').options = priorityOptions;
    $w('#dropdownPriority').value = "All";
}

function applyFilters() {
    const mode = $w('#dropdownMode').value;
    const priority = $w('#dropdownPriority').value;

    let datasetFilter = wixData.filter();
    let mapQuery = wixData.query(COLLECTION_NAME);

    if (mode && mode !== "All") {
        datasetFilter = datasetFilter.hasSome("modesTag", [mode]);
        mapQuery = mapQuery.hasSome("modesTag", [mode]);
    }

    if (priority && priority !== "All") {
        datasetFilter = datasetFilter.eq("priority", priority);
        mapQuery = mapQuery.eq("priority", priority);
    }

    DATASET.setFilter(datasetFilter)
        .then(() => {
            return mapQuery.find();
        })
        .then((results) => {
            sendDataToMap(results.items);
        })
        .catch((err) => {
            console.error("Filter Error:", err);
        });
}

function sendDataToMap(projects) {
    const geoJsonData = projects.map(item => {
        const rawGeoText = item.geoJson || item.geojson; 
        if (!rawGeoText) return null;

        try {
            const rawData = JSON.parse(rawGeoText);
            let geometryData = null;

            if (rawData.type === "FeatureCollection" && rawData.features && rawData.features.length > 0) {
                geometryData = rawData.features[0].geometry;
            } 
            else if (rawData.type === "Feature") {
                geometryData = rawData.geometry;
            }
            else if (rawData.type === "Point" || rawData.type === "LineString") {
                geometryData = rawData;
            }

            if (geometryData) {
                return {
                    type: "Feature", 
                    properties: {
                        id: item._id,       
                        
                        // Pass basic fields
                        title_fld: item.title_fld || item.title, // Fallback to item.title if _fld is empty
                        priority: item.priority,
                        
                        // --- NEW: Format the Cost for the Map Popup ---
                        estimatedCost: formatCurrency(item.estimatedCost), 
                        
                        status: item.status,
                        color: getStatusColor(item.priority),
                        url: item['link-projecttracker-1-projectId'] 
                    },
                    geometry: geometryData 
                };
            }
        } catch (error) {
            return null;
        }
    }).filter(item => item !== null); 

    MAP_IFRAME.postMessage(geoJsonData);
}

function highlightRepeaterItem(id) {
    REPEATER.forEachItem(($item, itemData, index) => {
        if (index % 2 === 0) {
            $item('#boxContainer').style.backgroundColor = "#FFFFFF"; 
        } else {
            $item('#boxContainer').style.backgroundColor = "#F4F5F7"; 
        }
    });

    REPEATER.forItems([id], ($item) => {
        $item('#boxContainer').style.backgroundColor = "#FFF9C4"; 
        setTimeout(() => {
            $item('#boxContainer').scrollTo()
                .catch((err) => console.warn("Scroll interrupted:", err));
        }, 200); 
    });
}

function getStatusColor(priority) {
    if (priority === "Tier 1") return "#D32F2F"; 
    if (priority === "Tier 2") return "#F57C00"; 
    return "#388E3C"; 
}

// --- NEW HELPER FUNCTION ---
function formatCurrency(amount) {
    // If amount is missing or 0, return $0
    if (!amount) return "$0";
    // Formats numbers with commas (e.g. 10000 -> "10,000") and adds $
    return "$" + Number(amount).toLocaleString('en-US');
}
