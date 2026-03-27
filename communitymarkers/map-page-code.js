import { getMarkers, addMarker, deleteMarker, voteMarker } from 'backend/markers.web';
import wixUsers from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(async function () {

  const query = wixLocation.query;

  if (query.lat && query.lng) {
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);

    // Send target coords into the iframe
    $w('#mapMain').postMessage({
      type: "focusLocation",
      data: { lat, lng }
    });
  }

  ////////////////////////////////////////////////////////

  const iframe = $w("#mapMain");
  const user = wixUsers.currentUser;

  // Reload the page after user logs in
  wixUsers.onLogin(() => {
    wixLocation.to(wixLocation.url);
  });

  // Send login status and userId to iframe
  async function sendUserInfo() {
    const isLoggedIn = user.loggedIn;
    const userId = user.id;
    iframe.postMessage({ type: "userInfo", data: { isLoggedIn, userId } });
  }

  await sendUserInfo(); // Initial load

  // Listen for messages from iframe via iframe.onMessage
  iframe.onMessage(async (event) => {
    const { type, data } = event.data;

    if (type === "loadMarkers") {
      const res = await getMarkers();
      iframe.postMessage({ type: "markersLoaded", data: res });
    }

    if (type === "saveMarker") {
      if (!user.loggedIn) return;
      const res = await addMarker(data);
      iframe.postMessage({ type: "markerSaved", data: res });
    }

    if (type === "deleteMarker") {
      try {
        await deleteMarker(data);
        iframe.postMessage({ type: "markerDeleted", data });
      } catch (err) {
        console.error(err.message);
      }
    }

    if (type === "requestLogin") {
      wixUsers.promptLogin()
        .then(() => {
          sendUserInfo();
          iframe.postMessage({ type: "reloadMarkers" }); // optional
        })
        .catch((err) => {
          console.log("Login cancelled or failed", err);
        });
    }

    if (type === "voteMarker") {
      try {
        const res = await voteMarker(data);
        iframe.postMessage({ type: "voteUpdated", data: res });
      } catch (err) {
        console.error("Vote failed:", err.message);
      }
    }


  });

  // ✅ NEW: Listen for postMessage from iframe to add marker with category
  window.addEventListener('message', async event => {
    if (event.data.type === 'new-marker') {
      const marker = event.data.data;

      if (!user.loggedIn) return;

      await wixData.insert('Markers', {
        tit: marker.tit,
        des: marker.des,
        lat: marker.lat,
        lng: marker.lng,
        category: marker.category, // store category
        _owner: user.id
      });

      // Optionally notify iframe or reload markers
      iframe.postMessage({ type: "reloadMarkers" });
    }
  });

});
