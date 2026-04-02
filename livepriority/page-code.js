import wixData from 'wix-data';

// --- GLOBAL VARIABLES ---
let firstChoiceId = null;
let secondChoiceId = null;
let isSubmitted = false; 

$w.onReady(function () {

    loadChart();
    updateParticipantCount(); // ADDED: Load count on page start

    $w("#submitBtn").disable();
    $w("#submitBtn").label = "Select 2 Options";

    $w("#repeater1").onItemReady(($item, itemData) => {

        $item("#choiceOne").onClick(() => {
            if (isSubmitted) return; 
            if (firstChoiceId === itemData._id) {
                firstChoiceId = null; 
            } else {
                firstChoiceId = itemData._id; 
            }
            refreshRepeaterState();
            checkSubmitStatus();
        });

        $item("#choiceTwo").onClick(() => {
            if (isSubmitted) return;
            if (secondChoiceId === itemData._id) {
                secondChoiceId = null; 
            } else {
                secondChoiceId = itemData._id; 
            }
            refreshRepeaterState();
            checkSubmitStatus();
        });
    });

    $w("#submitBtn").onClick(async () => {
        
        if (isSubmitted) {
            resetPoll();
            return; 
        }

        if (!firstChoiceId || !secondChoiceId) return;

        $w("#submitBtn").disable();
        $w("#submitBtn").label = "Submitting...";

        try {
            await Promise.all([
                submitVoteToDB(firstChoiceId, "votesFirst"),
                submitVoteToDB(secondChoiceId, "votesSecond")
            ]);

            isSubmitted = true;
            $w("#submitBtn").label = "Vote Again"; 
            $w("#submitBtn").enable(); 

            $w("#repeater1").forEachItem(($item) => {
                $item("#choiceOne").disable();
                $item("#choiceTwo").disable();
            });

            // UPDATED: Refresh both the chart and the total count
            loadChart();
            updateParticipantCount(); 

        } catch (error) {
            console.error("Submission Failed", error);
            $w("#submitBtn").label = "Error. Try Again";
            $w("#submitBtn").enable();
        }
    });

    // --- COMMENTS SUBMISSION LOGIC ---
$w("#btnComments").onClick(async () => {
    const commentText = $w("#inputComments").value;

    // Check if the input is empty
    if (!commentText || commentText.trim() === "") {
        $w("#inputComments").placeholder = "Please enter a comment first!";
        return;
    }

    $w("#btnComments").disable();
    $w("#btnComments").label = "Sending...";

    try {
        // 1. Insert the data into your collection
        // Note: I am assuming your field key is 'comment'. 
        // If you are using the default field, change "comment" to "title".
        await wixData.insert("LivePriorityCommnets", {
            "comments": commentText 
        });

        // 2. Clear the input field
        $w("#inputComments").value = "";
        
        // 3. Refresh the dataset connected to your repeater
        // This will automatically update the repeater UI
        await $w("#dataset2").refresh();

        // --- NEW: Show the success message ---
        $w("#txtCommentSubmitted").expand(); 

        // Optional: Hide the message again after 4 seconds
        setTimeout(() => {
            $w("#txtCommentSubmitted").collapse();
        }, 8000);

        $w("#btnComments").label = "Submit";
        $w("#btnComments").enable();

    } catch (err) {
        console.error("Failed to save comment:", err);
        $w("#btnComments").label = "Error!";
        $w("#btnComments").enable();
    }
});




});

// --- NEW FUNCTION: Calculate and display total participants ---
async function updateParticipantCount() {
    try {
        // We sum the "votesFirst" column because every person makes one 1st choice
        const results = await wixData.aggregate("ParkPoll")
            .sum("votesFirst", "total")
            .run();

        if (results.items.length > 0) {
            const count = results.items[0].total || 0;
            $w("#countNumText").text = count.toString() + " People Participated";
        }
    } catch (err) {
        console.error("Failed to update count:", err);
    }
}

// --- HELPER: Resets the entire board ---
function resetPoll() {
    firstChoiceId = null;
    secondChoiceId = null;
    isSubmitted = false;
    $w("#submitBtn").label = "Select 2 Options";
    $w("#submitBtn").disable();
    refreshRepeaterState();
}

// --- HELPER: Control Visuals ---
function refreshRepeaterState() {
    $w("#repeater1").forEachItem(($item, itemData) => {
        if (firstChoiceId === itemData._id) {
            $item("#choiceOne").label = "Selected (1st)";
            $item("#choiceOne").enable();
        } else if (firstChoiceId !== null) {
            $item("#choiceOne").label = "1st Choice";
            $item("#choiceOne").disable();
        } else {
            if (secondChoiceId === itemData._id) {
                $item("#choiceOne").disable();
            } else {
                $item("#choiceOne").label = "1st Choice";
                $item("#choiceOne").enable();
            }
        }

        if (secondChoiceId === itemData._id) {
            $item("#choiceTwo").label = "Selected (2nd)";
            $item("#choiceTwo").enable();
        } else if (secondChoiceId !== null) {
            $item("#choiceTwo").label = "2nd Choice";
            $item("#choiceTwo").disable();
        } else {
            if (firstChoiceId === itemData._id) {
                $item("#choiceTwo").disable();
            } else {
                $item("#choiceTwo").label = "2nd Choice";
                $item("#choiceTwo").enable();
            }
        }
    });
}

function checkSubmitStatus() {
    if (firstChoiceId && secondChoiceId) {
        $w("#submitBtn").enable();
        $w("#submitBtn").label = "Submit Vote";
    } else {
        $w("#submitBtn").disable();
        $w("#submitBtn").label = "Select 2 Options";
    }
}

async function submitVoteToDB(itemId, fieldToIncrement) {
    const item = await wixData.get("ParkPoll", itemId);
    let currentCount = item[fieldToIncrement] || 0;
    item[fieldToIncrement] = currentCount + 1;
    return wixData.update("ParkPoll", item);
}

async function loadChart() {
    const results = await wixData.query("ParkPoll").find();
    let labels = [];
    let dataFirst = [];
    let dataSecond = [];

    results.items.forEach(item => {
        labels.push(item.title);
        dataFirst.push(item.votesFirst || 0);
        dataSecond.push(item.votesSecond || 0);
    });

    const payload = {
        labels: labels,
        firstChoice: dataFirst,
        secondChoice: dataSecond
    };

    $w("#chartHtml").postMessage(payload);
}
