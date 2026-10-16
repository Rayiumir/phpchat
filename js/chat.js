let currentUsername = '';
let lastMessageId = 0;
let messageCheckInterval;
let messagesLoaded = false;
let isSending = false; // Flag for sending messages
let userScrolledUp = false; // True when user has manually scrolled away from the bottom
let recentEmojis = JSON.parse(localStorage.getItem('chat_recent_emojis') || '["😊", "👍", "❤️", "😂", "🎉"]');
let replyingTo = null; // Message being replied to {id, username, message}
let knownUsers = new Set(); // Usernames seen in chat (for @mention autocomplete)
let mentionState = { visible: false, matches: [], activeIndex: 0, atIndex: 0 };
let unreadMentions = 0;

const emojis = [
    "😊", "😂", "❤️", "👍", "🎉", "🔥", "🙏", "🎮", "🤔", "👏",
    "😍", "😎", "🤣", "🥳", "😁", "💯", "✨", "🌟", "💪", "😉"
];

// Event when DOM is loaded 
document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    // Initialize theme from localStorage or system preference
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }
    
    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }
    
    themeToggle.addEventListener('click', toggleTheme);
    initTheme();
    initLanguage();

    // --- Font size / readability toggle ---
    const fontSizeToggle = document.getElementById('fontSizeToggle');
    const fontSizeLabel  = document.getElementById('fontSizeLabel');
    const fontSizes = ['normal', 'large', 'larger'];

    function initFontSize() {
        const saved = localStorage.getItem('fontSize') || 'normal';
        applyFontSize(saved);
    }

    function applyFontSize(size) {
        document.documentElement.setAttribute('data-font-size', size);
        // Update tooltip
        const labels = { normal: 'A', large: 'A+', larger: 'A++' };
        fontSizeLabel.textContent = labels[size] || 'A';
        localStorage.setItem('fontSize', size);
    }

    function cycleFontSize() {
        const current = document.documentElement.getAttribute('data-font-size') || 'normal';
        const nextIndex = (fontSizes.indexOf(current) + 1) % fontSizes.length;
        applyFontSize(fontSizes[nextIndex]);
    }

    fontSizeToggle.addEventListener('click', cycleFontSize);
    initFontSize();
    // --- end font size ---

    const usernameForm = document.getElementById('usernameForm');
    const usernameInput = document.getElementById('usernameInput');
    const usernameSection = document.getElementById('usernameSection');
    const chatSection = document.getElementById('chatSection');
    const currentUsernameSpan = document.getElementById('currentUsername');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('messagesContainer');
    const loadingStatus = document.getElementById('loadingStatus');
    const replyPreview = document.getElementById('replyPreview');
    const replyPreviewUser = document.getElementById('replyPreviewUser');
    const replyPreviewText = document.getElementById('replyPreviewText');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');
    const mentionAutocomplete = document.getElementById('mentionAutocomplete');
    const notificationContainer = document.getElementById('notificationContainer');

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
        if (!mentionAutocomplete.contains(event.target) && event.target !== messageInput) {
            hideMentionAutocomplete();
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
            alert(t('username.min_length'));
            return;
        }

        if (username.length > 50) {
            alert(t('username.max_length'));
            return;
        }

        currentUsername = username;
        currentUsernameSpan.textContent = currentUsername;

        usernameSection.style.display = 'none';
        chatSection.style.display = 'flex';

        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();

        // Ask for browser notification permission (user gesture required)
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(function () {});
        }

        startMessageChecker();
    });

    // Send message
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', function (e) {
        if (mentionState.visible) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                mentionState.activeIndex = (mentionState.activeIndex + 1) % mentionState.matches.length;
                renderMentionAutocomplete();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                mentionState.activeIndex = (mentionState.activeIndex - 1 + mentionState.matches.length) % mentionState.matches.length;
                renderMentionAutocomplete();
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(mentionState.matches[mentionState.activeIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                hideMentionAutocomplete();
                return;
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Mention autocomplete on typing
    messageInput.addEventListener('input', handleMentionInput);

    // Cancel reply
    cancelReplyBtn.addEventListener('click', cancelReply);

    // Track whether the user has scrolled up so we don't hijack their position.
    messagesContainer.addEventListener('scroll', function () {
        // Always update based on actual position, regardless of programmatic scrolls
        // This prevents stale state when programmatic scrolls interfere
        const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
        userScrolledUp = distanceFromBottom > 60;
    }, { passive: true });

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

// Function to send message
    function sendMessage() {
        if (isSending) return;

        const message = messageInput.value.trim();

        if (message.length === 0) {
            showAlert(t('message.empty'), 'warning');
            return;
        }

        if (message.length > 500) {
            showAlert(t('message.max_length'), 'warning');
            return;
        }

        isSending = true;

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-duotone fa-spinner fa-spin"></i> ' + t('message.sending');

        addTemporaryMessage(message, replyingTo);

        // Send message to server
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'chat.php', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = function () {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-duotone fa-paper-plane"></i> ' + t('message.send');
            isSending = false;

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);

                    if (response.success) {
                        messageInput.value = '';

                        cancelReply();

                        removeTemporaryMessage();

                        loadMessages(true); // true means force reload
                    } else {
                        showAlert(t('alert.error.send', {message: response.message}), 'error');
                        removeTemporaryMessage();
                    }
                } catch (e) {
                    showAlert(t('alert.error.parse'), 'error');
                    console.error('Parse error:', e, 'Response:', xhr.responseText);
                    removeTemporaryMessage();
                }
            } else {
                showAlert(t('alert.error.server', {code: xhr.status}), 'error');
                removeTemporaryMessage();
            }
        };

        xhr.onerror = function () {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-duotone fa-paper-plane"></i> ' + t('message.send');
            isSending = false;
            showAlert(t('alert.error.connection'), 'error');
            removeTemporaryMessage();
        };

        xhr.ontimeout = function () {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-duotone fa-paper-plane"></i> ' + t('message.send');
            isSending = false;
            showAlert(t('alert.error.timeout'), 'error');
            removeTemporaryMessage();
        };

        const params = 'action=send&username=' + encodeURIComponent(currentUsername) +
            '&message=' + encodeURIComponent(message) +
            (replyingTo ? '&reply_to=' + encodeURIComponent(replyingTo.id) : '');
        xhr.send(params);
    }

    // Function to add Temporary Message
    function addTemporaryMessage(message, replyTo = null) {
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
                    <span class="sender">${currentUsername} ${t('message.sending_prefix')}</span>
                    <span class="time">${time}</span>
                </div>
                ${replyTo ? renderReplyQuote(replyTo) : ''}
                <div class="message-content">${wrapEmojis(highlightMentions(escapeHtml(message)))}</div>
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

        // Scroll to bottom only if user was already there
        if (!userScrolledUp) {
            scrollToBottom();
        }

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

        // Abort any in-flight incremental request before starting a force reload
        if (forceReload && window.currentLoadXhr) {
            window.currentLoadXhr.abort();
            window.currentLoadXhr = null;
        }

        window.isLoadingMessages = true;

        const xhr = new XMLHttpRequest();
        window.currentLoadXhr = xhr;
        xhr.open('GET', `chat.php?action=get&last_id=${forceReload ? 0 : lastMessageId}&t=${Date.now()}`, true);

        xhr.onload = function () {
            window.isLoadingMessages = false;
            window.currentLoadXhr = null;

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);

                    if (response.success) {
                        const firstLoad = !messagesLoaded;
                        if (!messagesLoaded) {
                            loadingStatus.style.display = 'none';
                            messagesLoaded = true;
                        }

                        if (response.messages.length > 0) {
                            // Only notify on incremental polls, not on initial load or forced reloads
                            const shouldNotify = !firstLoad && !forceReload;
                            displayMessages(response.messages, forceReload, shouldNotify, lastMessageId);
                            lastMessageId = parseInt(response.last_id);
                        } else if (forceReload) {
                            // Even if no messages returned, we still need to update display
                            displayMessages([], true, false, lastMessageId);
                        }

                        // Scroll to bottom only if user was already there
                        if (!userScrolledUp) {
                            scrollToBottom();
                        }
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
            window.currentLoadXhr = null;
        };

        xhr.onabort = function () {
            window.isLoadingMessages = false;
            window.currentLoadXhr = null;
        };

        xhr.send();
    }

    // Function to display messages
    // notifySinceId: only trigger mention notifications for messages newer than this id
    function displayMessages(messages, clearExisting = false, notify = true, notifySinceId = 0) {
        let scrollTopBefore = 0;
        let heightBefore = 0;
        const wasScrolledUp = userScrolledUp;

        if (clearExisting) {
            scrollTopBefore = messagesContainer.scrollTop;
            heightBefore = messagesContainer.scrollHeight;
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
                knownUsers.add(msg.username);

                const mentioned = notify && parseInt(msg.id) > notifySinceId && isMentioned(msg);

                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.username === currentUsername ? 'user' : 'other'}${mentioned ? ' mentioned' : ''}`;
                messageDiv.dataset.messageId = msg.id;

                const time = new Date(msg.created_at).toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const replyQuote = (msg.reply_to && msg.reply_to_username)
                    ? renderReplyQuote({ username: msg.reply_to_username, message: msg.reply_to_message })
                    : '';

                messageDiv.innerHTML = `
                        <div class="message-header">
                            <div class="message-header-start">
                                <span class="sender">${escapeHtml(msg.username)}</span>
                                <button class="reply-btn" title="${escapeHtml(t('reply.reply'))}">
                                    <i class="fa-duotone fa-reply"></i>
                                </button>
                            </div>
                            <span class="time">${time}</span>
                        </div>
                        ${replyQuote}
                        <div class="message-content">${wrapEmojis(highlightMentions(escapeHtml(msg.message)))}</div>
                    `;

                const replyBtn = messageDiv.querySelector('.reply-btn');
                replyBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    startReply({ id: msg.id, username: msg.username, message: msg.message });
                });

                messagesContainer.appendChild(messageDiv);

                if (mentioned) {
                    notifyMention(msg);
                }
            }
        });

        // Prune oldest messages when over the cap.
        // Preserve scroll position: removing nodes above the viewport shifts scrollTop,
        // so we compensate by measuring the height delta before/after removal.
        const allMessages = messagesContainer.querySelectorAll('.message:not(.temporary)');
        if (allMessages.length > 100) {
            const toRemove = allMessages.length - 100;
            const scrollTopBefore = messagesContainer.scrollTop;
            const heightBefore = messagesContainer.scrollHeight;
            for (let i = 0; i < toRemove; i++) {
                allMessages[i].remove();
            }
            // Restore the viewer's position by offsetting the height that was removed
            const removedHeight = heightBefore - messagesContainer.scrollHeight;
            messagesContainer.scrollTop = scrollTopBefore - removedHeight;
        } else if (clearExisting && wasScrolledUp) {
            // If we cleared and re-added messages but user was scrolled up, restore position
            const heightAfter = messagesContainer.scrollHeight;
            const heightDelta = heightAfter - heightBefore;
            messagesContainer.scrollTop = scrollTopBefore + heightDelta;
        }
    }

    // Function to start replying to a message
    function startReply(reply) {
        replyingTo = { id: reply.id, username: reply.username, message: reply.message };
        replyPreviewUser.textContent = reply.username;
        replyPreviewText.textContent = truncateText(reply.message, 80);
        replyPreview.style.display = 'flex';
        messageInput.focus();
    }

    // Function to cancel reply
    function cancelReply() {
        replyingTo = null;
        replyPreview.style.display = 'none';
        replyPreviewUser.textContent = '';
        replyPreviewText.textContent = '';
    }

    // Function to render a quoted reply block
    function renderReplyQuote(reply) {
        if (!reply || !reply.username) return '';
        const snippet = escapeHtml(truncateText(reply.message, 60));
        return '<div class="reply-quote">' +
            '<i class="fa-duotone fa-reply reply-quote-icon"></i>' +
            '<span class="reply-quote-user">' + escapeHtml(reply.username) + '</span>' +
            '<span class="reply-quote-text">' + snippet + '</span>' +
            '</div>';
    }

    // Function to truncate text
    function truncateText(text, max) {
        if (!text) return '';
        text = String(text);
        return text.length > max ? text.substring(0, max - 1) + '…' : text;
    }

    // Function to decode HTML entities (messages are stored HTML-escaped)
    function decodeHtmlEntities(text) {
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || '';
    }

    // Function to extract @mentions from message text
    function extractMentions(text) {
        const decoded = decodeHtmlEntities(text || '');
        const mentions = [];
        const regex = /@(\S+)/g;
        let match;
        while ((match = regex.exec(decoded)) !== null) {
            const name = match[1].replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '');
            if (name.length >= 2 && name.length <= 50) {
                mentions.push(name);
            }
        }
        return mentions;
    }

    // Function to check if a message mentions or replies to the current user
    function isMentioned(msg) {
        if (!currentUsername) return false;
        if (msg.username === currentUsername) return false;
        // Direct @mention in the message body
        if (extractMentions(msg.message).some(
            name => name.toLowerCase() === currentUsername.toLowerCase()
        )) return true;
        // Reply directed at the current user
        if (msg.reply_to_username &&
            msg.reply_to_username.toLowerCase() === currentUsername.toLowerCase()) return true;
        return false;
    }

    // Regex that matches a single emoji (covers most common Unicode emoji ranges)
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

    // Wraps every emoji character in a span so it can be animated independently
    function wrapEmojis(html) {
        // We need to replace emojis that are outside of HTML tags
        return html.replace(/>([^<]*)</g, function (match, text) {
            return '>' + text.replace(emojiRegex, function (emoji) {
                return '<span class="emoji-in-message">' + emoji + '</span>';
            }) + '<';
        });
    }

    // Function to highlight @mentions in escaped message text
    function highlightMentions(escapedText) {
        return escapedText.replace(/@(\S{1,50})/g, function (full, name) {
            const leadMatch = name.match(/^[^\p{L}\p{N}_]+/u);
            const lead = leadMatch ? leadMatch[0] : '';
            const rest = name.substring(lead.length);
            const trailMatch = rest.match(/[^\p{L}\p{N}_]+$/u);
            const trail = trailMatch ? trailMatch[0] : '';
            const core = rest.substring(0, rest.length - trail.length);
            if (core.length < 2) return full;
            return '@' + lead + '<span class="mention">' + core + '</span>' + trail;
        });
    }

    // Function to show a notification when the user is mentioned or replied to
    function notifyMention(msg) {
        const isReply = msg.reply_to_username &&
            msg.reply_to_username.toLowerCase() === currentUsername.toLowerCase();
        const notifLabel = isReply
            ? t('notification.replied_to_you')
            : t('notification.mentioned_you');

        unreadMentions++;
        document.title = '(' + unreadMentions + ') ' + t('notification.mention_title');

        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.innerHTML = `
                <div class="notification-icon"><i class="fa-duotone fa-${isReply ? 'reply' : 'at'}"></i></div>
                <div class="notification-body">
                    <strong>${escapeHtml(msg.username)}</strong> ${escapeHtml(notifLabel)}
                    <div class="notification-text">${escapeHtml(truncateText(decodeHtmlEntities(msg.message), 60))}</div>
                </div>
                <button class="notification-close" title="${escapeHtml(t('notification.close'))}">&times;</button>
            `;

        notif.querySelector('.notification-close').addEventListener('click', function (e) {
            e.stopPropagation();
            notif.remove();
        });

        notif.addEventListener('click', function () {
            const target = messagesContainer.querySelector('.message[data-message-id="' + msg.id + '"]');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.classList.add('mention-flash');
                setTimeout(function () { target.classList.remove('mention-flash'); }, 2000);
            }
            notif.remove();
        });

        notificationContainer.appendChild(notif);
        setTimeout(function () {
            if (notif.parentElement) notif.remove();
        }, 7000);

        // Browser notification
        if ('Notification' in window) {
            const browserTitle = isReply
                ? msg.username + ' ' + t('notification.replied_to_you')
                : t('notification.mention_title');
            if (Notification.permission === 'granted') {
                try {
                    const browserNotif = new Notification(browserTitle, {
                        body: msg.username + ': ' + truncateText(decodeHtmlEntities(msg.message), 100),
                        tag: 'mention-' + msg.id,
                        requireInteraction: true
                    });
                    browserNotif.onclick = function () { window.focus(); };
                } catch (e) {
                    console.error('Notification error:', e);
                }
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(function (permission) {
                    if (permission === 'granted') {
                        try {
                            const browserNotif = new Notification(browserTitle, {
                                body: msg.username + ': ' + truncateText(decodeHtmlEntities(msg.message), 100),
                                tag: 'mention-' + msg.id,
                                requireInteraction: true
                            });
                            browserNotif.onclick = function () { window.focus(); };
                        } catch (e) {
                            console.error('Notification error:', e);
                        }
                    }
                }).catch(function () {});
            }
        }
    }

    // Function to handle @mention autocomplete while typing
    function handleMentionInput() {
        const val = messageInput.value;
        const caret = messageInput.selectionStart;
        const textBefore = val.slice(0, caret);
        const atIndex = textBefore.lastIndexOf('@');

        if (atIndex === -1) {
            hideMentionAutocomplete();
            return;
        }

        const prefix = textBefore.slice(atIndex + 1);
        if (/\s/.test(prefix)) {
            hideMentionAutocomplete();
            return;
        }

        const matches = Array.from(knownUsers)
            .filter(u => u.toLowerCase().startsWith(prefix.toLowerCase()))
            .filter(u => u.toLowerCase() !== currentUsername.toLowerCase())
            .slice(0, 6);

        if (matches.length === 0) {
            hideMentionAutocomplete();
            return;
        }

        mentionState = { visible: true, matches: matches, activeIndex: 0, atIndex: atIndex };
        renderMentionAutocomplete();
    }

    // Function to render the mention autocomplete list
    function renderMentionAutocomplete() {
        mentionAutocomplete.innerHTML = '';
        mentionState.matches.forEach(function (user, index) {
            const item = document.createElement('div');
            item.className = 'mention-item' + (index === mentionState.activeIndex ? ' active' : '');
            item.textContent = user;
            item.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectMention(user);
            });
            mentionAutocomplete.appendChild(item);
        });
        mentionAutocomplete.style.display = 'block';
    }

    // Function to insert the selected mention into the input
    function selectMention(user) {
        const val = messageInput.value;
        const caret = messageInput.selectionStart;
        const before = val.slice(0, mentionState.atIndex);
        const after = val.slice(caret);
        messageInput.value = before + '@' + user + ' ' + after;
        messageInput.selectionStart = messageInput.selectionEnd = (before + '@' + user + ' ').length;
        hideMentionAutocomplete();
        messageInput.focus();
    }

    // Function to hide the mention autocomplete
    function hideMentionAutocomplete() {
        mentionState.visible = false;
        mentionAutocomplete.style.display = 'none';
    }

    // Clicking a highlighted mention inserts it into the input
    messagesContainer.addEventListener('click', function (e) {
        const mentionEl = e.target.closest('.mention');
        if (mentionEl) {
            const val = messageInput.value;
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            const text = '@' + mentionEl.textContent + ' ';
            messageInput.value = val.substring(0, start) + text + val.substring(end);
            messageInput.selectionStart = messageInput.selectionEnd = start + text.length;
            messageInput.focus();
        }
    });

    // Restore the document title when the window regains focus
    window.addEventListener('focus', function () {
        unreadMentions = 0;
        document.title = t('chat.title');
    });

    // Function to check for new messages
    function startMessageChecker() {
        // Initial load — no notifications (catches up on existing history)
        loadMessages();

        messageCheckInterval = setInterval(() => {
            // Only poll if not currently sending; lastMessageId is set after
            // the initial load so only truly new messages will notify.
            if (!isSending) {
                loadMessages();
            }
        }, 2000);

        // Background tabs have their intervals throttled by the browser,
        // so catch up immediately when the tab becomes visible again
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && messagesLoaded && !isSending) {
                loadMessages();
            }
        });
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


