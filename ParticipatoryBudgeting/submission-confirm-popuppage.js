import wixWindow from 'wix-window';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(function () {
    // 1. Get the data passed from the main page
    const context = wixWindow.lightbox.getContext();
    const summaryData = context.summary || [];
    let totalAllocated = 0;

    // 2. Build the summary text string
    let summaryText = "You have allocated funds to the following projects:\n\n";
    summaryData.forEach(item => {
        summaryText += `• ${item.title}: ${formatCurrency(item.amount)}\n`;
        totalAllocated += item.amount;
    });

    // 3. Display the summary and total
    $w('#summaryText').text = summaryText;
    $w('#totalAllocatedText').text = `Total Allocation: ${formatCurrency(totalAllocated)}`;

    // 4. Set up the button clicks
    $w('#cancelButton').onClick(() => {
        wixWindow.lightbox.close(); // Just close the lightbox
    });

    $w('#confirmSubmitButton').onClick(async () => {
        $w('#confirmSubmitButton').disable();
        $w('#confirmSubmitButton').label = "Submitting...";
    
        const summaryData = wixWindow.lightbox.getContext().summary || [];
        const itemsToInsert = summaryData.map(item => ({
            projectId: item._id,
            allocationAmount: item.amount
        }));
    
        try {
            // ✨ NEW: Add one row to the log collection BEFORE the main submission.
            await wixData.insert("BPSubmissionLog", {});
    
            // This is your existing code to insert the allocation details
            await wixData.bulkInsert("PBProjectResult", itemsToInsert);
            
            $w('#confirmSubmitButton').label = "Thank You!";
            setTimeout(() => {
                wixWindow.lightbox.close();
                wixLocation.to(wixLocation.url);
            }, 2000);
    
        } catch (error) {
            console.error("Failed to process submission:", error);
            $w('#confirmSubmitButton').label = "Submission Failed";
            // Re-enable the button if something goes wrong
            $w('#confirmSubmitButton').enable();
        }
    });
});

// Helper function to format currency
function formatCurrency(num) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(num || 0);
}
