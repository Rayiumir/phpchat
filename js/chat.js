let currentUsername = '';
let lastMessageId = 0;
let messageCheckInterval;
let messagesLoaded = false;
let isSending = false; // Flag for sending messages
let recentEmojis = JSON.parse(localStorage.getItem('chat_recent_emojis') || '["😊", "👍", "❤️", "😂", "🎉"]');

const emojis = [
    "😊", "😂", "❤️", "👍", "🎉", "🔥", "🙏", "🎮", "🤔", "👏",
    "😍", "😎", "🤣", "🥳", "😁", "💯", "✨", "🌟", "💪", "😉"
];

// Event when DOM is loaded 
document.addEventListener('DOMContentLoaded', function () {
    const usernameForm = document.getElementById('usernameForm');
    const usernameInput = document.getElementById('usernameInput');
    const usernameSection = document.getElementById('usernameSection');
    const chatSection = document.getElementById('chatSection');
    const currentUsernameSpan = document.getElementById('currentUsername');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('messagesContainer');
    const loadingStatus = document.getElementById('loadingStatus');

    // Emoji picker
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiTrigger = document.getElementById('emojiTrigger');
    const closeEmojiPicker = document.getElementById('closeEmojiPicker');
    const emojiContainer = document.getElementById('emojiContainer');
    const recentEmojisContainer = document.getElementById('recentEmojis');

    // Function Display Emoji Picker
    function showEmojiPicker() {
        emojiPicker.style.display = 'block';
        loadRecentEmojis();
        loadAllEmojis();
    }

    // Function Hide Emoji Picker
    function hideEmojiPicker() {
        emojiPicker.style.display = 'none';
    }

    // Function Load Recent Emojis
    function loadRecentEmojis() {
        recentEmojisContainer.innerHTML = '';
        
        recentEmojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-btn-small';
            button.textContent = emoji;
            button.addEventListener('click', () => insertEmoji(emoji));
            recentEmojisContainer.appendChild(button);
        });
    }

    // Function to load All emojis
    function loadAllEmojis() {
        emojiContainer.innerHTML = '';
        
        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-btn-small';
            button.textContent = emoji;
            button.addEventListener('click', () => {
                insertEmoji(emoji);
                addToRecentEmojis(emoji);
            });
            emojiContainer.appendChild(button);
        });
    }

    // Function to insert emoji
    function insertEmoji(emoji) {
        const input = messageInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        
        input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
        hideEmojiPicker();
    }

    // Function to add recent emojis
    function addToRecentEmojis(emoji) {
        recentEmojis = recentEmojis.filter(e => e !== emoji);
        
        recentEmojis.unshift(emoji);
        
        if (recentEmojis.length > 10) {
            recentEmojis = recentEmojis.slice(0, 10);
        }
        
        localStorage.setItem('chat_recent_emojis', JSON.stringify(recentEmojis));
    }

    // Event listener for emoji trigger
    emojiTrigger.addEventListener('click', function(e) {
        e.preventDefault();
        emojiPicker.style.display = emojiPicker.style.display === 'block' ? 'none' : 'block';
        if (emojiPicker.style.display === 'block') {
            loadRecentEmojis();
            loadAllEmojis();
        }
    });

    closeEmojiPicker.addEventListener('click', hideEmojiPicker);

    // Close emoji picker when clicking outside
    document.addEventListener('click', function(event) {
        if (!emojiPicker.contains(event.target) && !emojiTrigger.contains(event.target)) {
            hideEmojiPicker();
        }
    });

    // Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideEmojiPicker();
        }
    });

    usernameForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const username = usernameInput.value.trim();

        if (username.length < 2) {
            alert('نام باید حداقل ۲ کاراکتر باشد');
            return;
        }

        if (username.length > 50) {
            alert('نام نمی‌تواند بیش از ۵۰ کاراکتر باشد');
            return;
        }

        currentUsername = username;
        currentUsernameSpan.textContent = currentUsername;

        usernameSection.style.display = 'none';
        chatSection.style.display = 'flex';

        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();

        loadMessages();

        startMessageChecker();
    });

    // Send message
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Function to send message
    function sendMessage() {
        if (isSending) return; 

        const message = messageInput.value.trim();

        if (message.length === 0) {
            showAlert('لطفاً پیام خود را وارد کنید', 'warning');
            return;
        }

        if (message.length > 500) {
            showAlert('پیام نمی‌تواند بیش از ۵۰۰ کاراکتر باشد', 'warning');
            return;
        }

        isSending = true;

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-duotone fa-spinner fa-spin"></i> در حال ارسال...';

        addTemporaryMessage(message);

        // Send message to server
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'chat.php', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = function () {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-duotone fa-paper-plane"></i> ارسال';
            isSending = false;

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);

                    if (response.success) {
                        messageInput.value = '';

                        removeTemporaryMessage();

                        loadMessages(true); // true یعنی force reload
                    } else {
                        showAlert('خطا در ارسال پیام: ' + response.message, 'error');
                        removeTemporaryMessage();
                    }
                } catch (e) {
                    showAlert('خطا در پردازش پاسخ سرور', 'error');
                    console.error('Parse error:', e, 'Response:', xhr.responseText);
                    removeTemporaryMessage();
                }
            } else {
                showAlert('خطا در ارتباط با سرور (کد: ' + xhr.status + ')', 'error');
                removeTemporaryMessage();
            }
        };

        xhr.onerror = function () {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-duotone fa-paper-plane"></i> ارسال';
            isSending = false;
            showAlert('خطا در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کنید.', 'error');
            removeTemporaryMessage();
        };

        xhr.ontimeout = function () {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-duotone fa-paper-plane"></i> ارسال';
            isSending = false;
            showAlert('Timeout! سرور پاسخ نمی‌دهد.', 'error');
            removeTemporaryMessage();
        };

        const params = 'action=send&username=' + encodeURIComponent(currentUsername) +
            '&message=' + encodeURIComponent(message);
        xhr.send(params);
    }

    // Function to add Temporary Message
    function addTemporaryMessage(message) {
        const tempId = 'temp-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = tempId;
        messageDiv.className = 'message user temporary';
        messageDiv.dataset.tempId = tempId;

        const time = new Date().toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="sender">${currentUsername} (در حال ارسال...)</span>
                    <span class="time">${time}</span>
                </div>
                <div class="message-content">${escapeHtml(message)}</div>
            `;

        messagesContainer.appendChild(messageDiv);

        // Style the add Temporary Message
        const style = document.createElement('style');
        style.id = 'temp-message-style';
        if (!document.getElementById('temp-message-style')) {
            style.textContent = `
                    .message.temporary {
                        opacity: 0.7;
                        border-left: 3px solid #ff9800;
                    }
                `;
            document.head.appendChild(style);
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        window.currentTempMessageId = tempId;
    }

    // Function to remove temporary message
    function removeTemporaryMessage() {
        if (window.currentTempMessageId) {
            const tempMsg = document.getElementById(window.currentTempMessageId);
            if (tempMsg) {
                tempMsg.remove();
            }
            window.currentTempMessageId = null;
        }
    }

    // Function Load messages
    function loadMessages(forceReload = false) {
        if (window.isLoadingMessages && !forceReload) return;

        window.isLoadingMessages = true;

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `chat.php?action=get&last_id=${forceReload ? 0 : lastMessageId}&t=${Date.now()}`, true);

        xhr.onload = function () {
            window.isLoadingMessages = false;

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);

                    if (response.success) {
                        if (!messagesLoaded) {
                            loadingStatus.style.display = 'none';
                            messagesLoaded = true;
                        }

                        if (response.messages.length > 0) {
                            displayMessages(response.messages, forceReload);
                            lastMessageId = response.last_id;
                        }

                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    } else {
                        loadingStatus.textContent = 'خطا در بارگذاری پیام‌ها';
                    }
                } catch (e) {
                    console.error('Error parsing messages:', e);
                }
            }
        };

        xhr.onerror = function () {
            window.isLoadingMessages = false;
        };

        xhr.send();
    }

    // Function to display messages
    function displayMessages(messages, clearExisting = false) {
        if (clearExisting) {
            const existingMessages = messagesContainer.querySelectorAll('.message:not(.temporary)');
            existingMessages.forEach(msg => msg.remove());
        }

        const displayedMessageIds = new Set();
        const existingMessages = messagesContainer.querySelectorAll('.message[data-message-id]');
        existingMessages.forEach(msg => {
            displayedMessageIds.add(parseInt(msg.dataset.messageId));
        });

        messages.forEach(msg => {
            if (!displayedMessageIds.has(msg.id)) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.username === currentUsername ? 'user' : 'other'}`;
                messageDiv.dataset.messageId = msg.id;

                const time = new Date(msg.created_at).toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                messageDiv.innerHTML = `
                        <div class="message-header">
                            <span class="sender">${escapeHtml(msg.username)}</span>
                            <span class="time">${time}</span>
                        </div>
                        <div class="message-content">${escapeHtml(msg.message)}</div>
                    `;

                messagesContainer.appendChild(messageDiv);
            }
        });

        // If the number of messages increases, delete some
        const allMessages = messagesContainer.querySelectorAll('.message:not(.temporary)');
        if (allMessages.length > 100) {
            const toRemove = allMessages.length - 100;
            for (let i = 0; i < toRemove; i++) {
                allMessages[i].remove();
            }
        }
    }

    // Function to check for new messages
    function startMessageChecker() {
        loadMessages();

        messageCheckInterval = setInterval(() => {
            if (!isSending) {
                loadMessages();
            }
        }, 2000);
    }

    // Function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Function to show alert
    function showAlert(message, type = 'info') {
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `custom-alert ${type}`;
        alert.innerHTML = `
                <span>${message}</span>
                <button onclick="this.parentElement.remove()">&times;</button>
            `;

        document.body.appendChild(alert);

        // Remove the alert after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // Style the alert
    const alertStyle = document.createElement('style');
    alertStyle.textContent = `
            .custom-alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-width: 300px;
                max-width: 500px;
                z-index: 10000;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease-out;
            }
            
            .custom-alert.info {
                background: linear-gradient(to right, #4b6cb7, #182848);
            }
            
            .custom-alert.warning {
                background: linear-gradient(to right, #f0ad4e, #d9534f);
            }
            
            .custom-alert.error {
                background: linear-gradient(to right, #d9534f, #c9302c);
            }
            
            .custom-alert.success {
                background: linear-gradient(to right, #5cb85c, #449d44);
            }
            
            .custom-alert button {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                margin-left: 15px;
                padding: 0;
                line-height: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
    document.head.appendChild(alertStyle);

    // Manage the alert
    window.addEventListener('beforeunload', function () {
        clearInterval(messageCheckInterval);
    });
});