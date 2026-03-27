import wixLocation from 'wix-location';
import wixdata from 'wix-data';
import { voteMarker } from 'backend/markers.web';
import wixUsers from 'wix-users';

$w.onReady(() => {

  $w("#repeater").onItemReady(($item, itemData, index) => {
        
    // Define your color map (Muted/Cozy Palette)
    const categoryColors = {
        "Walking & Biking": "#E8F5E9", // Soft Green
        "Transit": "#E3F2FD", // Soft Blue
        "Road & Traffic": "#fcd7b1", // Soft Sand (Muted Brown)
    };

    const category = itemData.category; // Ensure 'category' matches your Database field key
    
    // Apply the color dynamically
    if (categoryColors[category]) {
        $item("#categoryPill").style.backgroundColor = categoryColors[category];
    } else {
        $item("#categoryPill").style.backgroundColor = "#F0F0F0"; // Default Gray
    }
});




  $w("#sortDropdown").onChange((event) => {
        let sortOption = event.target.value;
        let sort;

        switch (sortOption) {
            case "newest":
                sort = wixdata.sort().descending("_createdDate");
                break;
            case "oldest":
                sort = wixdata.sort().ascending("_createdDate");
                break;
            case "UpvotedMost":
                sort = wixdata.sort().descending("upVotes");
                break;
            case "UpvotedLeast":
                sort = wixdata.sort().ascending("upVotes");
                break;
            default:
                sort = wixdata.sort().descending("_createdDate"); // fallback
        }

        // Apply sort to dataset
        $w("#dataset1").setSort(sort);
    });





  // View Map //
  // For each card in repeater
  $w("#repeater").onItemReady(($item, itemData) => {
    $item("#viewMap").onClick(() => {
      const lat = itemData.lat;
      const lng = itemData.lng;

      wixLocation.to(`/communitymarkers/map?lat=${lat}&lng=${lng}`);
    });
  });


  //////////////////////
  /////////vote/////////
  //////////////////////
  $w("#repeater").onItemReady(($item, itemData) => {

    const showMessage = (direction) => {
      const msgText = $item("#msgText");

      // Set HTML content
      msgText.html = `
        <span style="font-size: 14px; line-height: 1.4;">
          Please 
          <a href="#" 
            style="text-decoration: underline; font-weight: bold; color: #0077cc;" 
            onclick="parent.postMessage({ type: 'requestLogin' }, '*'); return false;">
            log in
          </a> 
          to ${direction === 'up' ? 'upvote' : 'downvote'}.
        </span>
      `;

      // Show the message
      msgText.show();

      // Hide after 5 seconds
      setTimeout(() => {
        msgText.hide();
      }, 5000);
    };

    // Thumb up click
    $item("#thumbUp").onClick(async () => {
      if (!wixUsers.currentUser.loggedIn) {
        showMessage("up");
        return;
      }
      try {
        const result = await voteMarker({ id: itemData._id, direction: "up" });
        $item("#upVoteCount").text = result.upVotes.toString();
      } catch (err) {
        console.error(err);
      }
    });

    // Thumb down click
    $item("#thumbDown").onClick(async () => {
      if (!wixUsers.currentUser.loggedIn) {
        showMessage("down");
        return;
      }
      try {
        const result = await voteMarker({ id: itemData._id, direction: "down" });
        $item("#downVoteCount").text = result.downVotes.toString();
      } catch (err) {
        console.error(err);
      }
    });

  });
  
  
  
});
