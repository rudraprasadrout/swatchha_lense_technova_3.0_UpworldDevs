let recognition = null;
let isRecording = false;

function toggleSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Web Speech API is not supported in this browser. Use Chrome or Edge.");
        return;
    }

    const micBtn = document.getElementById('micBtn');
    const micCaption = document.getElementById('micCaption');
    const speechText = document.getElementById('speechText');
    const langSelect = document.getElementById('langSelect');

    if (!isRecording) {
        recognition = new SpeechRecognition();
        let selectedLang = langSelect ? langSelect.value : 'ori-IN';
        
        recognition.lang = selectedLang;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            if (micCaption) micCaption.innerText = "Listening...";
        };

        recognition.onresult = async (event) => {
            let capturedText = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                capturedText += event.results[i][0].transcript + ' ';
            }

            if (capturedText.trim() && speechText) {
                speechText.value = capturedText.trim();
                if (micCaption) micCaption.innerText = "Writing Odia Script...";

                // Instant AI Normalization into authentic Odia Script (ଓଡ଼ିଆ)
                try {
                    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "https://swachhlens-backend-upworlddev.onrender.com";
                    const res = await fetch(`${baseUrl}/api/v1/transcribe-voice`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: capturedText.trim(), lang: selectedLang })
                    });
                    const result = await res.json();
                    if (result && result.status === 'success' && result.native_text) {
                        speechText.value = result.native_text;
                    }
                } catch(e) {
                    console.warn("Backend native script conversion error:", e);
                } finally {
                    if (micCaption) micCaption.innerText = "Tap Voice";
                }
            }
        };

        recognition.onerror = () => stopSpeech();
        recognition.onend = () => { stopSpeech(); };
        recognition.start();
    } else {
        stopSpeech();
    }

    function stopSpeech() {
        isRecording = false;
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
            recognition = null;
        }
        if (micBtn) micBtn.classList.remove('recording');
        if (micCaption) micCaption.innerText = "Tap Voice";
    }
}
