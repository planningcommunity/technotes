import wixData from 'wix-data';
import { local } from 'wix-storage';
import wixLocation from 'wix-location-frontend';

// --- CONFIGURATION: CONTAINER COLORS ---
// Active states (when clicked) - Match these to your screenshot!
const COLOR_AGREE_ACTIVE = "#6BA24B";    // Green
const COLOR_DISAGREE_ACTIVE = "#DB6B5B"; // Red/Orange

// Default states (when page loads / not clicked)
// Muted versions of your colors so the white text still shows up well
const COLOR_AGREE_DEFAULT = "#A8CFA0";    // Dim Green
const COLOR_DISAGREE_DEFAULT = "#E8A39A"; // Dim Orange

$w.onReady(function () {
    
    $w("#dynamicDataset").onReady(() => {
        const item = $w("#dynamicDataset").getCurrentItem();
        if (!item) return;

        // --- 1. Social Sharing ---
        const pageUrl = item['link-commentscollection-title']; 
        if (pageUrl) {
            setupSocialSharing(pageUrl, item.title);
        }

        // --- 2. Staff Comments Logic ---
        const staffComment = item.staffComment; 
        if (staffComment && staffComment.length > 2) {
            $w("#staffCommentsBox").expand();
            $w("#noCommentsBox").collapse();
        } else {
            $w("#staffCommentsBox").collapse();
            $w("#noCommentsBox").expand();
        }
        
        // --- 3. Category Pill Logic ---
        const category = item.category || ""; 
        const pillBox = $w("#categoryPillBox");

        switch (category) {
            case "Transportation & Mobility": pillBox.style.backgroundColor = "#D7CCC8"; break;
            case "Land Use & Development": pillBox.style.backgroundColor = "#90CAF9"; break;
            case "Community Services & Well-Being": pillBox.style.backgroundColor = "#FFCC80"; break;
            case "Economy & Local Business": pillBox.style.backgroundColor = "#FFF59D"; break;
            case "Environment & Public Spaces": pillBox.style.backgroundColor = "#A5D6A7"; break;
            default: pillBox.style.backgroundColor = "#EEEEEE"; break;
        }

        // --- 4. Initialize Vote Bar & Numbers ---
        let initialLikes = item.likes || 0;
        let initialDislikes = item.dislikes || 0;
        
        $w("#likesCountText").text = initialLikes.toString();
        $w("#dislikesCountText").text = initialDislikes.toString();
        updateVoteBar(initialLikes, initialDislikes);

        // --- 5. Check Storage & Set Initial Container State ---
        const storageKey = "vote_" + item._id;
        const savedVote = local.getItem(storageKey);

        if (savedVote === 'liked') {
            setButtonState('agree');
        } else if (savedVote === 'disliked') {
            setButtonState('disagree');
        } else {
            setButtonState('reset');
        }

        // --- 6. Click Handlers (Attached to Containers!) ---
        $w("#containerBtnAgree").onClick(() => handleVote('likes'));
        $w("#containerBtnDisagree").onClick(() => handleVote('dislikes'));
    });
});

function setupSocialSharing(pageUrl, title) {
    const fullUrl = wixLocation.baseUrl + pageUrl;
    const tweetText = encodeURIComponent(`${title} on Community Post`);
    
    $w("#btnX").link = `https://twitter.com/intent/tweet?text=${tweetText}&url=${fullUrl}`;
    $w("#btnX").target = "_blank";

    $w("#btnFacebook").link = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    $w("#btnFacebook").target = "_blank";

    $w("#btnLinkedIn").link = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;
    $w("#btnLinkedIn").target = "_blank";
}

async function handleVote(voteType) {
    const dataset = $w("#dynamicDataset");
    let item = dataset.getCurrentItem();
    const storageKey = "vote_" + item._id;
    const currentVote = local.getItem(storageKey);

    item.likes = item.likes || 0;
    item.dislikes = item.dislikes || 0;

    // Logic Guards (This does the job of "disabling" the opposing button)
    if (voteType === 'likes' && currentVote === 'disliked') return;
    if (voteType === 'dislikes' && currentVote === 'liked') return;

    // Calculate New Values
    if (voteType === 'likes') {
        if (currentVote === 'liked') {
            item.likes = Math.max(0, item.likes - 1);
            local.removeItem(storageKey);
            setButtonState('reset');
        } else {
            item.likes += 1;
            local.setItem(storageKey, 'liked');
            setButtonState('agree');
        }
    } 
    else if (voteType === 'dislikes') {
        if (currentVote === 'disliked') {
            item.dislikes = Math.max(0, item.dislikes - 1);
            local.removeItem(storageKey);
            setButtonState('reset');
        } else {
            item.dislikes += 1;
            local.setItem(storageKey, 'disliked');
            setButtonState('disagree');
        }
    }

    // --- INSTANT VISUAL UPDATES ---
    // Update the numbers in the UI immediately
    $w("#likesCountText").text = item.likes.toString();
    $w("#dislikesCountText").text = item.dislikes.toString();
    
    // Update the bar
    updateVoteBar(item.likes, item.dislikes);

    // Save to Database
    try {
        await wixData.update("CommentsCollection", item);
        await dataset.refresh(); 
        console.log("Vote saved successfully");
    } catch (err) {
        console.error("Vote failed:", err);
    }
}

function updateVoteBar(likes, dislikes) {
    let total = likes + dislikes;
    let agreePercent = (total === 0) ? 50 : (likes / total) * 100;
    let disagreePercent = (total === 0) ? 50 : (dislikes / total) * 100;

    $w("#htmlVoteBar").postMessage({
        "agreePercent": agreePercent,
        "disagreePercent": disagreePercent
    });
}

function setButtonState(state) {
    const containerAgree = $w("#containerBtnAgree");
    const containerDisagree = $w("#containerBtnDisagree");

    if (state === 'agree') {
        containerAgree.style.backgroundColor = COLOR_AGREE_ACTIVE;
        containerDisagree.style.backgroundColor = COLOR_DISAGREE_DEFAULT;
    } 
    else if (state === 'disagree') {
        containerDisagree.style.backgroundColor = COLOR_DISAGREE_ACTIVE;
        containerAgree.style.backgroundColor = COLOR_AGREE_DEFAULT;
    } 
    else {
        // Reset Everything to Default Dim Colors
        containerAgree.style.backgroundColor = COLOR_AGREE_DEFAULT;
        containerDisagree.style.backgroundColor = COLOR_DISAGREE_DEFAULT;
    }
}
