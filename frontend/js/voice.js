// frontend/js/voice.js — Sarvam AI Speech-to-Text via MediaRecorder
// Records audio from mic, sends to backend /api/v1/sarvam-stt, displays native transcript

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function toggleSpeech() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone access is not supported in this browser. Please use Chrome, Edge, or Firefox.");
        return;
    }

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    const micBtn = document.getElementById('micBtn');
    const micCaption = document.getElementById('micCaption');
    const speechText = document.getElementById('speechText');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });

        audioChunks = [];

        // Prefer webm (Chrome/Edge), fallback to ogg (Firefox), then wav
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/ogg;codecs=opus';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose default
        }

        const options = mimeType ? { mimeType } : {};
        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Stop all mic tracks
            stream.getTracks().forEach(track => track.stop());

            if (audioChunks.length === 0) {
                resetMicUI();
                return;
            }

            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            audioChunks = [];

            // Show processing state
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.classList.add('processing');
                micBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
            if (micCaption) micCaption.innerText = "Processing...";

            // Send audio to backend Sarvam STT endpoint
            await sendAudioToSarvam(audioBlob);
        };

        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            resetMicUI();
        };

        // Start recording — collect data every 500ms
        mediaRecorder.start(500);
        isRecording = true;

        if (micBtn) {
            micBtn.classList.add('recording');
            micBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        }
        if (micCaption) micCaption.innerText = "Listening... Tap to stop";

    } catch (err) {
        console.error("Mic access error:", err);
        if (err.name === 'NotAllowedError') {
            alert("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else if (err.name === 'NotFoundError') {
            alert("No microphone found. Please connect a microphone and try again.");
        } else {
            alert("Could not access microphone: " + err.message);
        }
        resetMicUI();
    }
}

function stopRecording() {
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
            mediaRecorder.stop();
        } catch (e) {
            console.warn("MediaRecorder stop error:", e);
            resetMicUI();
        }
    } else {
        resetMicUI();
    }
}

async function sendAudioToSarvam(audioBlob) {
    const speechText = document.getElementById('speechText');
    const langSelect = document.getElementById('langSelect');
    const selectedLang = langSelect ? langSelect.value : 'or-IN';

    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
        ? CONFIG.API_BASE_URL 
        : "http://127.0.0.1:5000";

    // Determine file extension from mime type
    let ext = 'webm';
    const mime = audioBlob.type || '';
    if (mime.includes('ogg')) ext = 'ogg';
    else if (mime.includes('wav')) ext = 'wav';
    else if (mime.includes('mp3')) ext = 'mp3';

    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${ext}`);
    formData.append('lang', selectedLang);

    try {
        const response = await fetch(`${baseUrl}/api/v1/sarvam-stt`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.status === 'success' && result.transcript) {
            if (speechText) {
                // Append to existing text (don't overwrite)
                const existing = speechText.value.trim();
                if (existing) {
                    speechText.value = existing + ' ' + result.transcript;
                } else {
                    speechText.value = result.transcript;
                }
            }
        } else if (result.status === 'error') {
            console.warn("Sarvam STT error:", result.message);
            // If Sarvam key not configured, show helpful message
            if (response.status === 503) {
                alert("Voice transcription service not configured. Please add your Sarvam AI API key to the server environment.");
            } else {
                alert("Voice transcription failed: " + (result.message || "Unknown error"));
            }
        }

    } catch (err) {
        console.error("Failed to send audio to backend:", err);
        alert("Could not reach voice transcription server. Please check your internet connection.");
    } finally {
        resetMicUI();
    }
}

function resetMicUI() {
    const micBtn = document.getElementById('micBtn');
    const micCaption = document.getElementById('micCaption');

    isRecording = false;
    mediaRecorder = null;

    if (micBtn) {
        micBtn.classList.remove('recording', 'processing');
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    }
    if (micCaption) micCaption.innerText = "Tap Voice";
}
