let recognition = null;
let isRecording = false;
let finalSpeech = '';

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

            finalSpeech = speechText ? speechText.value : '';

            recognition.onstart = () => {
                isRecording = true;
                if (micBtn) micBtn.classList.add('recording');
                if (micCaption) micCaption.innerText = "Listening...";
            };

            recognition.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const trans = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalSpeech += trans + ' ';
                    } else {
                        interim += trans;
                    }
                }
                if (speechText) {
                    speechText.value = finalSpeech + interim;
                }
            };

            recognition.onerror = (e) => {
                console.warn("Speech error:", e.error);
                if (e.error === 'not-allowed') {
                    alert("Microphone access blocked. Please allow microphone access in your browser site settings.");
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