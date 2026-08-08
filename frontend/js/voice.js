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
        let selectedLang = langSelect ? langSelect.value : 'or-IN';

        // Safety: normalize any legacy 'ori-IN' values
        if (selectedLang === 'ori-IN') selectedLang = 'or-IN';

        recognition.lang = selectedLang;
        recognition.continuous = true;
        recognition.interimResults = true;

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

            // Show live text in the box (final + interim combined)
            const displayText = (finalTranscript + interimTranscript).trim();
            if (speechText && displayText) {
                speechText.value = displayText;
            }
        };

        recognition.onerror = (event) => {
            console.warn("SpeechRecognition error:", event.error);
            if (event.error !== 'no-speech') {
                stopSpeech();
            }
        };

        recognition.onend = () => {
            // Write the final transcript into the box
            if (finalTranscript.trim() && speechText) {
                speechText.value = finalTranscript.trim();
            }
            stopSpeech();
        };

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
