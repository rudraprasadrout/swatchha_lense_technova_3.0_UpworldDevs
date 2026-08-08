let recognition = null;
let isRecording = false;
let _voiceDebounceTimer = null;

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
        let selectedLang = langSelect ? langSelect.value : 'or-IN';

        // Normalize any legacy 'ori-IN' values that might be cached
        if (selectedLang === 'ori-IN') selectedLang = 'or-IN';

        recognition.lang = selectedLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        // Accumulate all final transcript segments
        let finalTranscript = '';

        recognition.onstart = () => {
            isRecording = true;
            finalTranscript = '';
            if (micBtn) micBtn.classList.add('recording');
            if (micCaption) micCaption.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Show live preview (final + interim combined)
            const displayText = (finalTranscript + interimTranscript).trim();
            if (speechText && displayText) {
                speechText.value = displayText;
            }

            // Debounced backend normalization — only fires after speech settles
            if (finalTranscript.trim()) {
                clearTimeout(_voiceDebounceTimer);
                _voiceDebounceTimer = setTimeout(() => {
                    normalizeWithBackend(finalTranscript.trim(), selectedLang, speechText, micCaption);
                }, 800);
            }
        };

        recognition.onerror = (event) => {
            console.warn("SpeechRecognition error:", event.error);
            // 'no-speech' is common — don't kill the session for it
            if (event.error !== 'no-speech') {
                stopSpeech();
            }
        };

        recognition.onend = () => {
            // If still in recording mode (user didn't stop), send final text for normalization
            if (isRecording && finalTranscript.trim() && speechText) {
                clearTimeout(_voiceDebounceTimer);
                normalizeWithBackend(finalTranscript.trim(), selectedLang, speechText, micCaption);
            }
            stopSpeech();
        };

        recognition.start();
    } else {
        stopSpeech();
    }

    function stopSpeech() {
        isRecording = false;
        clearTimeout(_voiceDebounceTimer);
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
            recognition = null;
        }
        if (micBtn) micBtn.classList.remove('recording');
        if (micCaption) micCaption.innerText = "Tap Voice";
    }
}

/**
 * Send captured text to backend Mistral API for native script normalization.
 * This converts phonetic/English transliterations into authentic Odia/Hindi/Bengali script.
 */
async function normalizeWithBackend(text, lang, speechTextEl, micCaptionEl) {
    if (!text) return;

    if (micCaptionEl) micCaptionEl.innerText = "Converting to native script...";

    try {
        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
            ? CONFIG.API_BASE_URL
            : "https://swachhlens-backend-upworlddev.onrender.com";

        const res = await fetch(`${baseUrl}/api/v1/transcribe-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, lang: lang })
        });

        const result = await res.json();
        if (result && result.status === 'success' && result.native_text) {
            if (speechTextEl) speechTextEl.value = result.native_text;
        }
    } catch(e) {
        console.warn("Backend native script conversion error:", e);
    } finally {
        if (micCaptionEl) micCaptionEl.innerText = "Tap Voice";
    }
}
