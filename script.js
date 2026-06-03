const API_BASE = "http://localhost:5000";
const IMAGE_ENDPOINTS = [
  `${API_BASE}/api/generate-image`,
  `${API_BASE}/generate-image`
];

document.getElementById('btnImage')?.addEventListener('click', generateImage);
document.getElementById('btnAudio')?.addEventListener('click', generateAudio);
document.getElementById('btnVideo')?.addEventListener('click', generateVideo);

async function postToFirstWorkingEndpoint(endpoints, body) {
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        lastErr = new Error(`Endpoint ${ep} returned ${res.status}`);
        continue;
      }
      return { res, endpoint: ep };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function generateImage() {
  const promptValue = document.getElementById('userPrompt').value.trim();
  const container = document.getElementById('imageResult');

  if (!promptValue) {
    alert("Please enter a description first!");
    return;
  }

  container.innerHTML = "Generating Image... 🎨";
  console.log("Sending prompt to server:", promptValue);

  try {
    const { res, endpoint } = await postToFirstWorkingEndpoint(IMAGE_ENDPOINTS, { prompt: promptValue });
    console.log("Used endpoint:", endpoint, "Status:", res.status);

    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (contentType.startsWith('image/')) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      showImage(url, container);
      return;
    }

    const data = await res.json();
    console.log("Data received from server:", data);

    let src = data.imageUrl || data.url || data.image || data.base64 || data.imageBase64;
    if (!src) {
      console.error('No image found in response:', data);
      container.innerHTML = "Error: Image link missing in server response.";
      return;
    }

    if (!src.startsWith('http') && !src.startsWith('data:')) {
      src = 'data:image/png;base64,' + src;
    }

    showImage(src, container);
  } catch (error) {
    console.error("FULL ERROR DETAILS:", error);
    container.innerHTML = "❌ Connection Failed! Make sure backend is running and check console.";
  }
}

function showImage(src, container) {
  container.innerHTML = "";
  const img = new Image();
  img.style.width = "100%";
  img.style.maxWidth = "340px";
  img.style.borderRadius = "8px";
  img.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  img.alt = "AI Image";

  img.onload = () => container.appendChild(img);
  img.onerror = () => {
    console.error("Image failed to load src=", src);
    container.innerHTML = `Image failed to load. See console for the URL.`;
    const pre = document.createElement('pre');
    pre.textContent = src;
    pre.style.whiteSpace = 'normal';
    pre.style.wordBreak = 'break-all';
    container.appendChild(pre);
  };

  img.src = src;
}

function generateAudio() {
  const text = document.getElementById('userPrompt').value.trim();
  if (!text) return alert("Enter text!");
  const speech = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(speech);
}

async function generateVideo() {
  const prompt = document.getElementById('userPrompt').value.trim();
  const container = document.getElementById('videoResult');
  if (!prompt) return alert("Please enter a description first!");
  container.textContent = "Generating video...";

  try {
    const res = await fetch(`${API_BASE}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Video endpoint error:', res.status, txt);
      container.textContent = `Video error: ${res.status}`;
      return;
    }

    const data = await res.json();
    const url = data.videoUrl || data.url;
    if (!url) {
      console.error('No videoUrl in response:', data);
      container.textContent = 'No video returned';
      return;
    }

    container.innerHTML = '';
    const video = document.createElement('video');
    video.controls = true;
    video.style.maxWidth = '100%';
    video.style.display = 'block';
    video.src = url;

    video.onloadeddata = () => container.appendChild(video);
    video.onerror = () => {
      console.error('Video failed to load:', url);
      container.textContent = 'Video failed to load. See console for URL.';
      const pre = document.createElement('pre');
      pre.textContent = url;
      pre.style.whiteSpace = 'normal';
      pre.style.wordBreak = 'break-all';
      container.appendChild(pre);
    };
  } catch (err) {
    console.error(err);
    container.textContent = 'Video request failed';
  }
}