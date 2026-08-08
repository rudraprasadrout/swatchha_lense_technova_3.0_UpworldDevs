// SwachhLens Client-Side Regional Voice Speech-to-Text (STT) Engine
let recognition = null;
let isRecording = false;

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
        recognition = new SpeechRecognition();
        
        // 1. Language Code Mapping (ISO 639-1 / BCP-47)
        let selectedLang = langSelect ? langSelect.value : 'or-IN';
        recognition.lang = selectedLang;
        
        // 2. Continuous & Interim Streaming Setup
        recognition.continuous = true;
        recognition.interimResults = true;

        let accumulatedFinals = speechText ? speechText.value : '';

        recognition.onstart = () => {
            isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            if (micCaption) micCaption.innerText = "Listening...";
        };

        // 3. Event-Driven Appending (onresult)
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let newFinals = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    newFinals += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (newFinals) {
                accumulatedFinals += newFinals;
            }

            if (speechText) {
                speechText.value = (accumulatedFinals + interimTranscript).trim();
            }
        };

        recognition.onerror = (event) => {
            console.warn("SpeechRecognition error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                alert("Microphone access was denied. Please allow microphone permissions in browser settings.");
            }
            if (event.error !== 'no-speech') {
                stopSpeech();
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                stopSpeech();
            }
        };

        recognition.start();
    } else {
        stopSpeech();
    }

    function stopSpeech() {
        isRecording = false;
        if (recognition) {
            try { recognition.stop(); } catch (e) {}
            recognition = null;
        }
        if (micBtn) micBtn.classList.remove('recording');
        if (micCaption) micCaption.innerText = "Tap Voice";
    }
}
