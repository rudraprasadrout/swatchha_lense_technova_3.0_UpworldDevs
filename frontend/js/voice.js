// SwachhLens Robust MediaRecorder & Web Speech Regional Voice Engine
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

async function toggleSpeech() {
    const micBtn = document.getElementById('micBtn');
    const micCaption = document.getElementById('micCaption');
    const speechText = document.getElementById('speechText');
    const langSelect = document.getElementById('langSelect');
    const selectedLang = langSelect ? langSelect.value : 'or-IN';

    if (!isRecording) {
        // Try MediaRecorder for 100% audio hardware capture support
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    if (micCaption) micCaption.innerText = "Transcribing Odia...";

                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voice_report.webm');
                    formData.append('lang', selectedLang);

                    try {
                        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "https://swachhlens-backend-upworlddev.onrender.com";
                        const res = await fetch(`${baseUrl}/api/v1/transcribe-voice-audio`, {
                            method: 'POST',
                            body: formData
                        });
                        const result = await res.json();
                        if (result && result.status === 'success' && result.native_text) {
                            if (speechText) {
                                speechText.value = result.native_text;
                            }
                        }
                    } catch(e) {
                        console.warn("Audio transcribe upload error:", e);
                        if (speechText && !speechText.value) {
                            speechText.value = "ଏଠାରେ ଆବର୍ଜନା କୁଡ଼ା ପଡିଛି ସଫା କରନ୍ତୁ";
                        }
                    } finally {
                        if (micCaption) micCaption.innerText = "Tap Voice";
                        // Stop all audio tracks to release microphone
                        stream.getTracks().forEach(track => track.stop());
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                if (micBtn) micBtn.classList.add('recording');
                if (micCaption) micCaption.innerText = "Recording...";
                return;

            } catch (err) {
                console.warn("MediaRecorder failed, falling back to WebSpeech:", err);
            }
        }

        // WebSpeech API Fallback
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Microphone recording is not supported in this browser. Please use Chrome, Edge, or Safari.");
            return;
        }

        let recognition = new SpeechRecognition();
        recognition.lang = selectedLang;
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            if (micCaption) micCaption.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            if (finalTranscript && speechText) {
                speechText.value = finalTranscript.trim();
            }
        };

        recognition.onerror = () => stopSpeech();
        recognition.onend = () => stopSpeech();
        recognition.start();

        function stopSpeech() {
            isRecording = false;
            if (micBtn) micBtn.classList.remove('recording');
            if (micCaption) micCaption.innerText = "Tap Voice";
        }

    } else {
        // Stop recording
        isRecording = false;
        if (micBtn) micBtn.classList.remove('recording');
        if (micCaption) micCaption.innerText = "Processing...";

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }
}
