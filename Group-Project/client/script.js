// Front-end logic for the chat application
document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const chatSection = document.getElementById('chat-section');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authButton = document.getElementById('auth-button');
    const authToggle = document.getElementById('auth-toggle');
    const authToggleText = document.getElementById('auth-toggle-text');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const welcomeText = document.getElementById('welcome-text');
    const logoutBtn = document.getElementById('logout-btn');
    const usersContainer = document.getElementById('users-container');
    const chatInterface = document.getElementById('chat-interface');
    const noChatSelected = document.getElementById('no-chat-selected');
    const chatTitle = document.getElementById('chat-title');
    const selectedUserSpan = document.getElementById('selected-user');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');

    let isRegistering = false;
    let currentUser = null;
    let selectedChatUser = null;
    let socket = null;
    const newMessages = {}; // To store unread message counts for each user
    let onlineUsers = []; // To track online users

    function toggleAuthForm() {
        isRegistering = !isRegistering;
        if (isRegistering) {
            authTitle.textContent = 'Register';
            authButton.textContent = 'Register';
            authToggleText.textContent = 'Already have an account?';
            authToggle.textContent = 'Login';
            emailInput.style.display = 'block';
            emailInput.required = true;
        } else {
            authTitle.textContent = 'Login';
            authButton.textContent = 'Login';
            authToggleText.textContent = 'Don\'t have an account?';
            authToggle.textContent = 'Register';
            emailInput.style.display = 'none';
            emailInput.required = false;
            emailInput.value = ''; // Clear email when switching to login
        }
    }

    authToggle.addEventListener('click', toggleAuthForm);

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear any previous error messages
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const email = emailInput.value.trim();
        
        // Validate required fields
        if (!username || !password) {
            alert('Username and password are required');
            return;
        }
        
        if (isRegistering && !email) {
            alert('Email is required for registration');
            return;
        }
        
        let url = isRegistering ? '/api/register' : '/api/login';
        let body = isRegistering ? { username, email, password } : { username, password };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user.username);
                setupChat(data.user);
            } else {
                // Handle validation errors
                if (data.errors && Array.isArray(data.errors)) {
                    const errorMessages = data.errors.map(err => err.msg).join('\n');
                    alert(errorMessages);
                } else {
                    alert(data.error || 'Authentication failed');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.reload();
    });

    function setupChat(user) {
        currentUser = user;
        authSection.style.display = 'none';
        chatSection.style.display = 'flex';
        welcomeText.textContent = `Welcome, ${currentUser.username}!`;

        socket = io();

        socket.on('connect', () => {
            socket.emit('join', currentUser.username);
            console.log('Connected to WebSocket server.');
            fetchUsers();
        });

        socket.on('user list update', (users) => {
            onlineUsers = users.filter(u => u !== currentUser.username);
            fetchUsers(); // Refresh the full user list with online status
        });

        // Event for messages sent by the current user (remove duplicate UI update)
        socket.on('message sent', (message) => {
            // Message already added optimistically, just confirm it was saved
            console.log('Message saved to database');
        });

        // Event for messages received from another user
        socket.on('private message received', (message) => {
            if (message.sender === selectedChatUser) {
                addMessageToUI(message, 'received');
            } else {
                // Handle unread message notification for other users
                newMessages[message.sender] = (newMessages[message.sender] || 0) + 1;
                updateUserListItem(message.sender);
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        socket.on('reconnect', () => {
            console.log('Reconnected to server');
            socket.emit('join', currentUser.username);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Handle typing indicators
        socket.on('user typing', (data) => {
            if (data.sender === selectedChatUser) {
                showTypingIndicator(data.sender);
            }
        });

        socket.on('user stop typing', (data) => {
            if (data.sender === selectedChatUser) {
                hideTypingIndicator();
            }
        });
    }

    async function fetchUsers() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const users = await res.json();
            displayUsers(users.map(u => u.username));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }

    function displayUsers(users) {
        usersContainer.innerHTML = '';
        users.forEach(username => {
            const userItem = document.createElement('div');
            userItem.classList.add('user-item');
            userItem.setAttribute('data-username', username);
            
            const userInfo = document.createElement('div');
            userInfo.classList.add('user-info');
            
            const userName = document.createElement('span');
            userName.classList.add('user-name');
            userName.textContent = username;
            
            const statusDot = document.createElement('span');
            statusDot.classList.add('status-dot');
            statusDot.classList.add(onlineUsers.includes(username) ? 'online' : 'offline');
            
            userInfo.appendChild(userName);
            userInfo.appendChild(statusDot);
            userItem.appendChild(userInfo);
            
            if (username === selectedChatUser) {
                userItem.classList.add('active');
            }
            if (newMessages[username]) {
                userItem.classList.add('has-new-message');
            }
            userItem.addEventListener('click', () => {
                selectChatUser(username);
            });
            usersContainer.appendChild(userItem);
        });
    }

    function updateUserListItem(username) {
        const userItem = document.querySelector(`.user-item[data-username="${username}"]`);
        if (userItem) {
            userItem.classList.add('has-new-message');
        }
    }

    async function selectChatUser(username) {
        selectedChatUser = username;
        selectedUserSpan.textContent = username;
        chatInterface.style.display = 'flex';
        noChatSelected.style.display = 'none';
        messagesContainer.innerHTML = '';
        
        // Clear new message indicator and count
        const userItem = document.querySelector(`.user-item[data-username="${username}"]`);
        if (userItem) {
            userItem.classList.remove('has-new-message');
            delete newMessages[username];
        }

        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
            if (item.textContent === username) {
                item.classList.add('active');
            }
        });
        
        await fetchMessages(username);
    }

    async function fetchMessages(receiver) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/messages/${receiver}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const messages = await res.json();
            messages.forEach(message => {
                addMessageToUI(message, message.sender === currentUser.username ? 'sent' : 'received');
            });
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    }

    function sendMessage() {
        const content = messageInput.value.trim();
        if (content && selectedChatUser) {
            // Add message to UI immediately for better UX
            const tempMessage = {
                sender: currentUser.username,
                receiver: selectedChatUser,
                content,
                timestamp: new Date().toISOString()
            };
            addMessageToUI(tempMessage, 'sent');
            messageInput.value = '';
            socket.emit('private message', { receiver: selectedChatUser, content });
        }
    }

    sendBtn.addEventListener('click', sendMessage);

    let typingTimer;
    let isTyping = false;

    // Add typing indicators and Enter key support
    messageInput.addEventListener('input', () => {
        if (selectedChatUser && !isTyping) {
            isTyping = true;
            socket.emit('typing', { receiver: selectedChatUser });
        }
        
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                socket.emit('stop typing', { receiver: selectedChatUser });
            }
        }, 1000);
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isTyping) {
                isTyping = false;
                socket.emit('stop typing', { receiver: selectedChatUser });
            }
            sendMessage();
        }
    });

    // Emoji picker functionality
    emojiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
    });

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.style.display = 'none';
        }
    });

    // Handle emoji selection
    emojiPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-item')) {
            const emoji = e.target.textContent;
            const currentValue = messageInput.value;
            const cursorPos = messageInput.selectionStart;
            const newValue = currentValue.slice(0, cursorPos) + emoji + currentValue.slice(cursorPos);
            messageInput.value = newValue;
            messageInput.focus();
            messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
            emojiPicker.style.display = 'none';
        }
    });

    function showTypingIndicator(username) {
        hideTypingIndicator(); // Remove any existing indicator
        
        const typingEl = document.createElement('div');
        typingEl.classList.add('typing-indicator');
        typingEl.id = 'typing-indicator';
        
        const typingText = document.createElement('span');
        typingText.textContent = `${username} is typing`;
        
        const dotsEl = document.createElement('div');
        dotsEl.classList.add('typing-dots');
        dotsEl.innerHTML = '<span></span><span></span><span></span>';
        
        typingEl.appendChild(typingText);
        typingEl.appendChild(dotsEl);
        
        messagesContainer.appendChild(typingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) {
            typingEl.remove();
        }
    }

    function addMessageToUI(message, type) {
        hideTypingIndicator(); // Hide typing indicator when message arrives
        
        const messageEl = document.createElement('div');
        messageEl.classList.add('message', type);
        
        const contentEl = document.createElement('div');
        contentEl.classList.add('message-content');
        contentEl.textContent = message.content;
        
        const timeEl = document.createElement('span');
        timeEl.classList.add('message-time');
        timeEl.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageEl.appendChild(contentEl);
        messageEl.appendChild(timeEl);
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Check for existing token on load
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
        setupChat({ username });
    } else {
        authSection.style.display = 'flex';
    }
});