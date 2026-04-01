import wixWindow from 'wix-window';

$w.onReady(function () {
    // 1. Get the data passed from the map page
    let passedData = wixWindow.lightbox.getContext();

    if (passedData && passedData.geoid) {
        // 2. Listen for the HTML component to announce it is ready
        $w("#html1").onMessage((event) => {
            if (event.data === "ready") {
                // 3. Send the GEOID directly into the iframe
                $w("#html1").postMessage(passedData.geoid);
            }
        });
    }
});
