import { Permissions, webMethod } from "wix-web-module";
import wixData from "wix-data";
import wixUsers from "wix-users-backend";

// Add a marker with user ownership
export const addMarker = webMethod(Permissions.SiteMember, async (markerData) => {
    const user = wixUsers.currentUser;
    const ownerId = user.id;

    const toInsert = {
        ...markerData,
        ownerId
    };

    return await wixData.insert("Import1", {
        ...toInsert,
        upVotes: 0,
        downVotes: 0
    });
});

// Get all markers – anyone can access
export const getMarkers = webMethod(Permissions.Anyone, async () => {
    const result = await wixData.query("Import1").limit(1000).find();
    return result.items.map(item => ({
        _id: item._id,
    tit: item.tit,
    des: item.des,
    lat: item.lat,
    lng: item.lng,
    category: item.category,
    ownerId: item.ownerId,
    upVotes: item.upVotes || 0, 
    downVotes: item.downVotes || 0
    }));
});

// Delete a marker – only if the current user is the owner
export const deleteMarker = webMethod(Permissions.SiteMember, async (markerId) => {
    const user = wixUsers.currentUser;
    const item = await wixData.get("Import1", markerId);

    if (item.ownerId === user.id) {
        await wixData.remove("Import1", markerId);
        return { success: true };
    } else {
        throw new Error("Unauthorized: Not your marker.");
    }
});

export const voteMarker = webMethod(Permissions.SiteMember, async ({ id, direction }) => {
    const user = wixUsers.currentUser;
    if (!user.loggedIn) throw new Error("Not logged in");

    const item = await wixData.get("Import1", id);
    if (!item) throw new Error("Marker not found");

    // Initialize counts if missing
    if (typeof item.upVotes !== "number") item.upVotes = 0;
    if (typeof item.downVotes !== "number") item.downVotes = 0;

    if (direction === "up") {
        item.upVotes += 1;
    } else if (direction === "down") {
        item.downVotes += 1;
    }

    const updated = await wixData.update("Import1", item);

    return {
        markerId: id,
        upVotes: updated.upVotes,
        downVotes: updated.downVotes
      };
});
