// Humne URL ko seedha fetch mein daal diya hai taaki koi confusion na rahe
async function generateImage() {
    const promptValue = document.getElementById('userPrompt').value;
    const container = document.getElementById('imageResult');

    if (!promptValue) {
        alert("Please enter a description first!");
        return;
    }

    container.innerHTML = "Generating Image... 🎨 (Checking Server)";
    console.log("Sending prompt to server:", promptValue);

    try {
        // Direct URL use kar rahe hain testing ke liye
        const response = await fetch("http://localhost:5000/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptValue })
        });

        console.log("Server Response Status:", response.status);

        if (!response.ok) {
            throw new Error("Server ne mana kar diya (Error " + response.status + ")");
        }

        const data = await response.json();
        console.log("Data received from server:", data);

        if (data.imageUrl) {
            container.innerHTML = `<img src="${data.imageUrl}" alt="AI Image" style="width:100%; border-radius:8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">`;
        } else {
            container.innerHTML = "Error: Image link missing in server response.";
        }
    } catch (error) {
        console.error("FULL ERROR DETAILS:", error);
        container.innerHTML = "❌ Connection Failed! Make sure terminal says 'Server chalu hai'.";
    }
}

// Audio function (Browser voice - works without server)
function generateAudio() {
    const text = document.getElementById('userPrompt').value;
    if (!text) return alert("Enter text!");
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
}