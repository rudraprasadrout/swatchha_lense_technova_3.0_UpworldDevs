let recognition = null;
let isRecording = false;

function toggleSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Web Speech API is not supported in this browser. Please use Chrome or Edge.");
        return;
    }

    const micBtn = document.getElementById('micBtn');
    const micCaption = document.getElementById('micCaption');
    const speechText = document.getElementById('speechText');
    const langSelect = document.getElementById('langSelect');

    if (!isRecording) {
        recognition = new SpeechRecognition();
        let selectedLang = langSelect ? langSelect.value : 'or-IN';
        
        recognition.lang = selectedLang;
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

        recognition.onerror = (event) => {
            console.warn("SpeechRecognition error:", event.error);
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
