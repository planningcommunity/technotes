import wixData from "wix-data";
import { session } from "wix-storage";
import wixLocation from "wix-location";
import wixWindow from 'wix-window';
import { getProjectAnalytics, getSubmissionCount } from 'backend/pbData.jsw';


const PERSONAL_BUDGET = 1000000;

$w.onReady(function () {

    // --- INITIALIZE SESSION & DISPLAY ---
    session.setItem("remainingBudget", PERSONAL_BUDGET.toString());
    session.setItem("myAllocations", JSON.stringify({}));

    updateBudgetText();
    displayResults();
    updateSliderStates();

    // --- SET UP THE REPEATER ---
    // --- SET UP THE REPEATER ---
$w("#repeater1").onItemReady(($item, itemData, index) => {
    // --- Get all elements from the repeater item ---
    const slider = $item("#sliderInput");
    const percentageText = $item("#percentageText");
    const infoSectionBudgetGoal = $item("#infoSectionBudgetGoal");
    const customSliderLabel = $item("#customSliderLabel");
    const projectFundingPercentage = $item("#projectFundingPercentage");
    const plusButton = $item("#plusButton");
    const minusButton = $item("#minusButton");
    const textBtnMax = $item("#textBtnMax"); // Your Max button
    const textBtnReset = $item("#textBtnReset"); // Your Reset button

    // --- Helper function to update this specific card's UI ---
    function updateCardUI(newValue) {
        slider.value = newValue;
        customSliderLabel.text = formatCurrency(newValue);
        
        const percentageOfTotal = (newValue / PERSONAL_BUDGET) * 100;
        percentageText.text = `${percentageOfTotal.toFixed(1)}%`;
        
        if (itemData.targetBudget > 0) {
            const fundingPercentage = (newValue / itemData.targetBudget) * 100;
            projectFundingPercentage.text = `${fundingPercentage.toFixed(1)}%`;
        } else {
             projectFundingPercentage.text = 'N/A';
        }
    }

    // --- Configure the card on load ---
    infoSectionBudgetGoal.text = `Budget Goal: ${formatCurrency(itemData.targetBudget)}`;
    slider.max = itemData.targetBudget;
    slider.step = 1000;

    const allocations = JSON.parse(session.getItem("myAllocations"));
    const currentAllocation = allocations[itemData._id] || 0;
    updateCardUI(currentAllocation); // Set initial state using the helper function

    // ================================================================
    // ✨ NEW: MAX and RESET BUTTON LOGIC
    // ================================================================
    textBtnReset.onClick(() => {
        const newValue = 0;
        updateCardUI(newValue); // Update the card's visuals
        handleAllocationChange(slider, itemData._id, newValue); // Update the budget logic
    });

    textBtnMax.onClick(() => {
        const remainingBudget = Number(session.getItem("remainingBudget"));
        const currentAllocation = slider.value;
        const maxPossible = Math.min(itemData.targetBudget, currentAllocation + remainingBudget);
        
        updateCardUI(maxPossible); // Update the card's visuals
        handleAllocationChange(slider, itemData._id, maxPossible); // Update the budget logic
    });
    // ================================================================

    // --- Existing event handlers (now simplified) ---
    slider.onChange((event) => {
        const newValue = event.target.value;
        updateCardUI(newValue);
        handleAllocationChange(slider, itemData._id, newValue);
    });

    plusButton.onClick(() => {
        const newValue = Math.min(slider.value + slider.step, slider.max);
        updateCardUI(newValue);
        handleAllocationChange(slider, itemData._id, newValue);
    });

    minusButton.onClick(() => {
        const newValue = Math.max(slider.value - slider.step, 0);
        updateCardUI(newValue);
        handleAllocationChange(slider, itemData._id, newValue);
    });

    /// Pass data to lightbox for more information ///
    $item("#detailsButton").onClick(() => {
        wixWindow.openLightbox("PBProjectInfo", {
            title: itemData.title,
            description: itemData.description,
            category: itemData.category,
            projectId: itemData.projectId,
            targetBudget: itemData.targetBudget,
            details: itemData.details,
        });
    });
});
        

    // <-- Close onItemReady

    // --- SUBMIT BUTTON LOGIC ---
    $w("#submitButton").onClick(async () => {
        const myAllocations = JSON.parse(session.getItem("myAllocations"));
        const projectIds = Object.keys(myAllocations);
    
        // Get the full project data for the items we've allocated to
        const projectsData = await wixData.query("PBProjects") 
            .hasSome("_id", projectIds)
            .find();
    
        // Create a summary object that now INCLUDES THE ID
        const summaryData = projectsData.items.map(project => {
            return {
                _id: project._id, // ✨ ADD THIS LINE
                title: project.title,
                amount: myAllocations[project._id]
            };
        });
    
        // Open the summary lightbox and pass the new data to it
        wixWindow.openLightbox("SubmissionSummary", {
            summary: summaryData
        });
    });



    getProjectAnalytics()
    .then(analyticsData => {
        if (analyticsData && analyticsData.length > 0) {
            // 👇 **New**: Calculate a dynamic height for the bar charts.
            // We'll use 50 pixels per project plus a 120-pixel buffer for the title and axis.
            const barChartHeight = (analyticsData.length * 50) + 120;

            // 👇 **Changed**: Send both the data and the calculated height to the component.
            $w("#html1").postMessage({
                chartData: analyticsData,
                barChartHeight: barChartHeight
            });
        } else {
            console.log("No chart data to display.");
        }
    })
    .catch(error => {
        console.error("Failed to get chart data:", error);
    });

    getSubmissionCount()
        .then(count => {
            if (count > 0) {
                // Changed the text to be more accurate
                $w("#participantCountText").text = `${count} people participated.`;
            } else {
                $w("#participantCountText").text = "Be the first to participate!";
            }
            $w("#participantCountText").show();
        })
        .catch(error => {
            console.error("Failed to get submission count:", error);
            $w("#participantCountText").text = "Could not load submission count.";
            $w("#participantCountText").show();
        });


});


/**
 * All helper functions below this line remain the same.
 */
async function handleAllocationChange(slider, projectId, newAllocationAmount) {
    // 1. Get the current allocations object from the session
    let myAllocations = JSON.parse(session.getItem("myAllocations"));

    // 2. Get the slider's previous value for a potential revert
    const previousAllocation = myAllocations[projectId] || 0;

    // 3. Temporarily update the allocations object with the new amount
    myAllocations[projectId] = newAllocationAmount;

    // 4. Calculate the NEW total spent by adding up all current allocations
    const newTotalSpent = Object.values(myAllocations).reduce((sum, current) => sum + current, 0);

    // 5. Check if the new total is over budget
    if (newTotalSpent > PERSONAL_BUDGET) {
        // If it is, revert the change
        myAllocations[projectId] = previousAllocation;
        slider.value = previousAllocation;

        // Flash an error message and stop
        $w("#remainingBudgetText").style.color = "red";
        setTimeout(() => {
            $w("#remainingBudgetText").style.color = "#000000";
        }, 500);
        return;
    }

    // 6. If the new total is valid, calculate the remaining budget
    const newRemainingBudget = PERSONAL_BUDGET - newTotalSpent;

    // 7. Save the updated values back to the session
    session.setItem("remainingBudget", newRemainingBudget.toString());
    session.setItem("myAllocations", JSON.stringify(myAllocations));

    // 8. Update the text and buttons on the screen
    updateBudgetText();
    updateSliderStates();
}

async function displayResults() {}

function updateBudgetText() {
    const budget = Number(session.getItem("remainingBudget"));
    
    // Check if the budget is full and update the label text accordingly.
    if (budget === PERSONAL_BUDGET) {
        $w("#textTellBudget").text = "Total Budget";
    } else {
        $w("#textTellBudget").text = "Budget Left";
    }

    const formattedBudget = formatCurrency(budget);
    $w("#remainingBudgetText").text = `${formattedBudget}`;
}

function formatCurrency(num) {
    const formattedValue = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(num || 0);
    return formattedValue;
}

function updateSliderStates() {
    const remainingBudget = Number(session.getItem("remainingBudget"));

    $w("#repeater1").forEachItem(($item, itemData, index) => {
        const slider = $item("#sliderInput");
        const plusButton = $item("#plusButton");
        const minusButton = $item("#minusButton");
        if (slider.value === 0) {
            minusButton.disable();
        } else {
            minusButton.enable();
        }
        if (remainingBudget <= 0) {
            plusButton.disable();
        } else {
            plusButton.enable();
        }
        if (remainingBudget <= 0 && slider.value === 0) {
            slider.disable();
        } else {
            slider.enable();
        }
    });

    if (remainingBudget <= 0) {
        $w("#submitButton").enable();
        // Hide the tooltip cover when the button is active
    } else {
        $w("#submitButton").disable();
        // Show the tooltip cover when the button is disabled
    }

    const buttonLabel = (remainingBudget <= 0) ? "Review before Submit" : "Allocate Full Budget to Submit";
    $w("#submitButton").label = buttonLabel;
}

