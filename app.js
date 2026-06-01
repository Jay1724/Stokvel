'use strict';

const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

/**
 * Called when a prompt chip is clicked.
 * Populates the chat input with the chip's text and submits immediately.
 */
function handleChipClick(chipElement) {
    // Strip the leading emoji + space so only the prompt text is sent
    const rawText = chipElement.innerText;
    chatInput.value = rawText;
    chatInput.focus();
    submitPrompt(rawText);
}

/** Called when the send button is clicked or Enter is pressed. */
function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    submitPrompt(text);
}

/**
 * Core submit handler. Replace the body of this function with your
 * real AI API call or chat-state dispatch.
 */
function submitPrompt(text) {
    // TODO: wire into your AI backend / state manager
    console.log('Submitting prompt:', text);
    alert(`AI Processing: "${text}"`);
    chatInput.value = '';
}

// Allow submitting via the Enter key
chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});
