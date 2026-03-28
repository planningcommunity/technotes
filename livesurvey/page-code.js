import wixData from 'wix-data';

// We use a timer variable for the search to prevent "lag" 
// if the user types very fast.
let debounceTimer;

$w.onReady(function () {

// --- INITIAL SETUP: Disable Share button by default ---
    // Since the input starts empty, the button should start disabled.
    $w("#shareBtn").disable();


// ===========================
    // 0. INPUT VALIDATION LOGIC
    // ===========================
    $w("#input").onInput(() => {
        const val = $w("#input").value;
        
        // If value exists and isn't just empty spaces, enable button.
        // Otherwise, disable it.
        if (val && val.trim().length > 0) {
            $w("#shareBtn").enable();
        } else {
            $w("#shareBtn").disable();
        }
    });



    // ===========================
    // --- PART 1: VOTING LOGIC  ---
    // ===========================

    $w("#Repeater").onItemReady(($item, itemData) => {

        // 1. Set the initial vote count from the database
        // If the database is empty/undefined, we treat it as 0
        let currentVotes = itemData.votes || 0;
        $item("#voteCount").text = String(currentVotes);

        // 2. Define the click action
        $item("#voteBtn").onClick(async () => {
            
            // CHECK: Is the user liking or unliking?
            // We check if the button currently says "I like it"
            const isLiking = $item("#voteBtn").label === "I like it";
            
            // Get the current number shown on screen
            let currentDisplay = Number($item("#voteCount").text);

            if (isLiking) {
                // --- USER WANTS TO LIKE ---
                $item("#voteBtn").label = "Unlike"; // Change label
                currentDisplay = currentDisplay + 1; // Add 1
            } else {
                // --- USER WANTS TO UNLIKE ---
                $item("#voteBtn").label = "I like it"; // Change label back
                
                // Prevent negative numbers on screen just in case
                if(currentDisplay > 0) {
                    currentDisplay = currentDisplay - 1; 
                }
            }

            // Update the text on screen immediately
            $item("#voteCount").text = String(currentDisplay);

            // --- SAVE TO DATABASE ---
            try {
                // Get the fresh item from the database
                const freshItem = await wixData.get("LiveSurvey", itemData._id);
                
                // Calculate the new database value
                if (isLiking) {
                    freshItem.votes = (freshItem.votes || 0) + 1;
                } else {
                    // Prevent database from going below 0
                    let newVote = (freshItem.votes || 0) - 1;
                    freshItem.votes = newVote < 0 ? 0 : newVote; 
                }

                // Save it
                await wixData.update("LiveSurvey", freshItem);
                console.log("Vote updated successfully");

            } catch (error) {
                console.error("Error saving vote:", error);
            }
        });
    });

    // ===========================
    // --- PART 2: SORTING LOGIC ---
    // ===========================


    $w("#sortDropdown").onChange(() => {
        
        // 1. Get the value user selected (pop, new, or old)
        let sortValue = $w("#sortDropdown").value;
        
        // 2. Initialize a sort object
        let sortQuery = wixData.sort();

        // 3. Apply the correct rule
        if (sortValue === "pop") {
            // Sort by votes, highest number first
            sortQuery = sortQuery.descending("votes");
        } 
        else if (sortValue === "new") {
            // Sort by Date Created, newest date first
            sortQuery = sortQuery.descending("_createdDate");
        } 
        else if (sortValue === "old") {
            // Sort by Date Created, oldest date first
            sortQuery = sortQuery.ascending("_createdDate");
        }

        // 4. Apply this sort to the Dataset
        // This automatically rearranges the Repeater
        $w("#dataset1").setSort(sortQuery);
    });

    // ===========================
    // 3. SEARCH LOGIC (Wide Search)
    // ===========================
    $w("#searchInput").onInput(() => {
        
        // Clear any previous timer (this makes the search smoother)
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = undefined;
        }

        // Wait 200 milliseconds after the user stops typing to filter
        // This prevents the code from running 10 times if they type 10 letters fast
        debounceTimer = setTimeout(() => {
            
            const searchValue = $w("#searchInput").value;

            // Define the Filter
            // This checks if Title OR Description contains the text (Case insensitive)
            // CHANGE "title" and "description" to your actual Field Keys
            const filter = wixData.filter()
                .contains("feature", searchValue);

            $w("#dataset1").setFilter(filter);
            
        }, 200); 
    });

    // ===========================
    // 4. SUBMIT FORM LOGIC
    // ===========================
    $w("#shareBtn").onClick(async () => {
        
        const userThought = $w("#input").value;

        // Simple validation: Don't submit if empty
        if (!userThought || userThought.trim() === "") {
            return; // Stop here
        }

        // Disable button strictly to prevent double-clicking
        $w("#shareBtn").disable();
        $w("#shareBtn").label = "Sharing...";

        const newItem = {
            "feature": userThought,  // The text from the input
            "votes": 0               // Default start value
        };

        try {
            await wixData.insert("LiveSurvey", newItem);
            
            // Success! Clear the input
            $w("#input").value = "";
            $w("#shareBtn").label = "Shared!";
            
            // Refresh the dataset so the new card appears in the Repeater instantly
            await $w("#dataset1").refresh();

        } catch (error) {
            console.error("Error adding item:", error);
            $w("#shareBtn").label = "Error";
        }

        // Re-enable button
        setTimeout(() => {
            $w("#shareBtn").enable();
            $w("#shareBtn").label = "Share"; // Reset text
        }, 2000);
    });







});
