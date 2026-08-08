let recognition = null;
let isRecording = false;
let accumulatedTranscript = '';

function toggleSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
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

            accumulatedTranscript = speechText ? speechText.value : '';

            recognition.onstart = () => {
                isRecording = true;
                if (micBtn) micBtn.classList.add('recording');
                if (micCaption) micCaption.innerText = "Listening...";
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let newFinals = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptStr = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        newFinals += transcriptStr + ' ';
                    } else {
                        interimTranscript += transcriptStr;
                    }
                }

                if (newFinals) {
                    accumulatedTranscript += newFinals;
                }

                if (speechText) {
                    speechText.value = accumulatedTranscript + interimTranscript;
                }
            };

            recognition.onerror = (event) => {
                console.warn("Speech recognition error:", event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    alert("Microphone access was denied. Please allow microphone permissions in your browser settings to use voice input.");
                }
                stopSpeech();
            };

            recognition.onend = () => {
                if (isRecording) {
                    stopSpeech();
                }
            };

            recognition.start();

        } catch (e) {
            console.error("Failed to start speech recognition:", e);
            stopSpeech();
        }
    } else {
        stopSpeech();
    }

    function stopSpeech() {
        isRecording = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch(e) {}
            recognition = null;
        }
        if (micBtn) micBtn.classList.remove('recording');
        if (micCaption) micCaption.innerText = "Tap Voice";
    }
}