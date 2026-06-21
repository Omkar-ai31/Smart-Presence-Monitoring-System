// main.js - basic frontend helper functions

// Simple GET request
async function apiGet(url) {
    try {
        let res = await fetch(url);
        return await res.json();
    } catch (e) {
        console.error("GET error:", e);
    }
}

// Simple POST request
async function apiPost(url, data) {
    try {
        let res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) {
        console.error("POST error:", e);
    }
}

// Notification popup (simple)
function notify(msg) {
    alert(msg);
}
