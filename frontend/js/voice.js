let recognition = null;
let isRecording = false;

function toggleSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
        return;
    }

    const micBtn = document.getElementById('micBtn');
    const micCaption = document.getElementById('micCaption');
    const speechText = document.getElementById('speechText');
    const langSelect = document.getElementById('langSelect');

    if (!isRecording) {
        try {
            recognition = new SpeechRecognition();
            recognition.lang = (langSelect && langSelect.value) ? langSelect.value : 'or-IN';
            recognition.continuous = true;
            recognition.interimResults = true;

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
                    speechText.value += finalTranscript;
                }
            };

            recognition.onerror = (e) => {
                console.warn("Speech recognition error:", e.error);
                stopSpeech();
            };

            recognition.onend = () => {
                if (isRecording) {
                    stopSpeech();
                }
            };

            recognition.start();
        } catch (e) {
            console.error("Speech start error:", e);
            stopSpeech();
        }
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