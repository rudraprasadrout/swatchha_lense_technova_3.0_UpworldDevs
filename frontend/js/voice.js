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
        let selectedLang = langSelect ? langSelect.value : 'or';
        if (selectedLang === 'or-IN') selectedLang = 'or'; // BCP-47 tag for Chrome Odia Script recognizer
        
        recognition.lang = selectedLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('recording');
            micCaption.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            if (finalTranscript) speechText.value += finalTranscript;
        };

        recognition.onerror = () => stopSpeech();
        recognition.onend = () => { if (isRecording) stopSpeech(); };
        recognition.start();
    } else {
        stopSpeech();
    }

    function stopSpeech() {
        isRecording = false;
        if (recognition) recognition.stop();
        micBtn.classList.remove('recording');
        micCaption.innerText = "Tap Voice";
    }
}
