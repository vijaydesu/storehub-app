let socket = null;
let onMessageCallback = null;
let onSessionTimeoutCallback = null;
let onWarningCallback = null;
let isConnected = false;
let reconnectAttempts = 0;
let handshakeInterval = null;
let intentionalDisconnect = false;
let currentUser = null; // Store currentUser at module level

const WS_HOST = process.env.REACT_APP_API_HOST;
const WS_PORT = process.env.REACT_APP_API_PORT;
const WS_URL = `ws://${WS_HOST}:${WS_PORT}`;

const WebSocketService = {
    connect(user, onHandshakeSuccess) {
        currentUser = user; // Store the user object
        // Check if already connected and socket is open
        if (isConnected && socket?.readyState === WebSocket.OPEN) {
            if (onHandshakeSuccess) onHandshakeSuccess();
            return;
        }

        // Clean up existing socket and interval
        if (socket) {
            socket.close();
            socket = null;
        }
        if (handshakeInterval) {
            clearInterval(handshakeInterval);
            handshakeInterval = null;
        }

        // Create dynamic handshake payload
        const handshakePayload = {
            action: "handshake",
            token: currentUser?.token || "default_token",
            brand: currentUser?.brand || "storeops",
            role: currentUser?.role || "store manager",
            user_email: currentUser?.email,
        };

        // Create new WebSocket connection
        socket = new WebSocket(WS_URL + "/socket_chat_json");

        socket.onopen = () => {
            isConnected = true;
            handshakeInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    clearInterval(handshakeInterval);
                    handshakeInterval = null;
                    socket.send(JSON.stringify(handshakePayload));
                }
            }, 100);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.action === "handshake" && data.status === "success") {
                isConnected = true;
                reconnectAttempts = 0;
                if (onHandshakeSuccess) onHandshakeSuccess();
            }

            if (data.action === "error" && data.error_message === "Session timed out.") {
                isConnected = false;
                if (onSessionTimeoutCallback) {
                    onSessionTimeoutCallback();
                }
                return;
            }

            if (data.action === "warning" && data.warning_message) {
                if (onWarningCallback) {
                    onWarningCallback(data.warning_message);
                }
                return;
            }

            if (onMessageCallback) {
                onMessageCallback(data);
            }
        };

        socket.onclose = () => {
            isConnected = false;
            if (handshakeInterval) {
                clearInterval(handshakeInterval);
                handshakeInterval = null;
            }
            if (!intentionalDisconnect) {
                WebSocketService.reconnect();
            }
            intentionalDisconnect = false; // Reset flag after handling
        };

        socket.onerror = (error) => {
            isConnected = false;
            if (handshakeInterval) {
                clearInterval(handshakeInterval);
                handshakeInterval = null;
            }
            if (!intentionalDisconnect) {
                WebSocketService.reconnect();
            }
            intentionalDisconnect = false; // Reset flag after handling
        };
    },

    reconnect() {
        if (reconnectAttempts >= 3) {
            console.error("Max reconnect attempts reached.");
            return;
        }

        reconnectAttempts++;
        setTimeout(() => {
            WebSocketService.connect(currentUser); // Use stored currentUser
        }, 1000 * reconnectAttempts);
    },

    sendMessage(payload) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        } else {
            console.warn("Socket not connected. Attempting to reconnect...");
            WebSocketService.connect(currentUser, () => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(payload));
                }
            });
        }
    },

    isSocketOpen() {
        return socket && socket.readyState === WebSocket.OPEN;
    },

    onMessage(callback) {
        onMessageCallback = callback;
    },

    offMessage(callback) {
        if (onMessageCallback === callback) {
            onMessageCallback = null;
        }
    },

    onSessionTimeout(callback) {
        onSessionTimeoutCallback = callback;
    },

    offSessionTimeout(callback) {
        if (onSessionTimeoutCallback === callback) {
            onSessionTimeoutCallback = null;
        }
    },

    onWarning(callback) {
        onWarningCallback = callback;
    },

    offWarning(callback) {
        if (onWarningCallback === callback) {
            onWarningCallback = null;
        }
    },

    disconnect() {
        if (socket) {
            intentionalDisconnect = true; // Set flag to prevent reconnect
            socket.close();
            socket = null;
            isConnected = false;
            if (handshakeInterval) {
                clearInterval(handshakeInterval);
                handshakeInterval = null;
            }
            currentUser = null; // Clear currentUser on disconnect
        }
    }
};

export default WebSocketService;