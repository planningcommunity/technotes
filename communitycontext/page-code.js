import wixWindow from 'wix-window';

$w.onReady(function () {
    // Replace "#html1" with the actual ID of your HTML map element
    $w("#myMapIframe").onMessage((event) => {
        // Check if the message is the one we sent from Leaflet
        if (event.data.type === 'openCensusPopup') {
            
            // Open the Lightbox named "censusData" and pass the ID to it
            wixWindow.openLightbox("censusData", {
                "geoid": event.data.geoid
            });
            
        }
    });
});
