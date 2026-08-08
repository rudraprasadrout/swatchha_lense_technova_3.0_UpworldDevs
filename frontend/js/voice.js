// SwachhLens Regional Voice Engine - Native Script Speech Recognition
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
        
        // 1. Set Regional ISO Code (or-IN for Odia, hi-IN for Hindi, bn-IN for Bengali, en-IN for English)
        let selectedLang = (langSelect && langSelect.value) ? langSelect.value : 'or-IN';
        recognition.lang = selectedLang;
        
        // 2. Set continuous listening without interim phonetic noise
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            if (micCaption) micCaption.innerText = "Listening...";
        };

        // 3. Append only finalized native regional script segments into speechText
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

        recognition.onerror = (event) => {
            console.warn("SpeechRecognition error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                alert("Microphone access was denied. Please allow microphone permissions in browser settings.");
            }
            stopSpeech();
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
