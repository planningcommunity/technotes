import wixLocation from "wix-location";
import wixWindow from "wix-window";

$w.onReady(function () {

  $w('#btnLinkedIn').onClick(() => {
    const currentPageUrl = wixLocation.url;
    const encodedUrl = encodeURIComponent(currentPageUrl);
    const linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}`;
    wixLocation.to(linkedInShareUrl, "_blank");
});

// --- FACEBOOK SHARE BUTTON ---
$w('#btnFacebook').onClick(() => {
    const currentPageUrl = wixLocation.url;
    const encodedUrl = encodeURIComponent(currentPageUrl);
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    wixLocation.to(facebookShareUrl, "_blank");
});

// --- X (TWITTER) SHARE BUTTON ---
$w('#btnX').onClick(() => {
    const currentPageUrl = wixLocation.url;
    const encodedUrl = encodeURIComponent(currentPageUrl);
    
    // Optional: Customize the default text that appears in the tweet
    const shareText = "Check out this community project:"; 
    const encodedText = encodeURIComponent(shareText);

    const xShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    wixLocation.to(xShareUrl, "_blank");
});


  // Replace "dataset1" with the actual ID of your connected dataset
  $w("#dynamicDataset").onReady(() => {
    // Get the current item from the dataset
    let item = $w("#dynamicDataset").getCurrentItem();
    
    // Make sure the field exists
    if (item.estimatedCost !== undefined && item.estimatedCost !== null) {
      // Format as $100,000 style
      let formattedCost = `$${item.estimatedCost.toLocaleString("en-US")}`;
      
      // Set the text on your element
      $w("#estCost").text = formattedCost;
    } else {
      // Optional: fallback if no value
      $w("#estCost").text = "N/A";
    }
  });
});
