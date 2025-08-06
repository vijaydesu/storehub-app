import React, { useEffect, useState, useRef } from "react";
import {
    RiLayoutLeftLine,
    RiChatNewLine,
    RiSendPlane2Line,
    RiThumbUpLine,
    RiThumbUpFill,
    RiThumbDownLine,
    RiThumbDownFill,
    RiArrowLeftSLine,
    RiArrowRightSLine,
    RiArrowDownSLine,
} from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import WebSocketService from "../../services/websocketService";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import "./ChatWindow.scss";
import ottericon from "../../assets/otter-icon.png";
import loadingVideo from "../../assets/loader-message.gif";
import otterProfileIcon from "../../assets/otter-profile-icon.svg";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const ImageRenderer = ({ src, alt, ...props }) => {
    const [error, setError] = useState(false);

    if (error) {
        return <span className="image-error">Image failed to load: {src}</span>;
    }

    return (
        <img
            src={src}
            alt={alt || "Image"}
            className="response-image"
            onError={() => setError(true)}
            {...props}
        />
    );
};

const ImageWithLoading = ({ src, alt, score, currentIndex, totalImages }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
        <div className="image-container">
            <img
                src={src}
                alt={alt}
                className={`response-image ${isLoading ? "loading" : ""}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                }}
                style={hasError ? { display: "none" } : {}}
            />
            <p className="image-score">
                {totalImages > 1 && (
                    <span className="image-counter">
                        {currentIndex + 1} / {totalImages}
                    </span>
                )}
            </p>
        </div>
    );
};

const ChatWindow = ({
    onToggleSidebar,
    onNewConversation,
    onReceiveHistory,
    selectedConversation,
    onConversationSelect,
    allHealthy,
    shouldReconnectWebSocket,
    setShouldReconnectWebSocket,
    isSidebarVisible,
    setIsBotTyping,
    currentUser,
}) => {
    const TIMER_VALUE = process.env.REACT_APP_TIMER_VALUE;

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [streamingMessage, setStreamingMessage] = useState(null);
    const [feedbackGiven, setFeedbackGiven] = useState({});
    const [localIsBotTyping, setLocalIsBotTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSessionTimeout, setShowSessionTimeout] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(TIMER_VALUE);
    const [errorMessage, setErrorMessage] = useState(null);
    const [currentSlideIndices, setCurrentSlideIndices] = useState({});
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
    const [isNewConversation, setIsNewConversation] = useState(false);
    const [department, setDepartment] = useState("storeops");
    const [role, setRole] = useState(currentUser?.role || "store manager");
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(null);
    const [selectedFeedbackReason, setSelectedFeedbackReason] = useState("");
    const [feedbackComment, setFeedbackComment] = useState("");

    const departments = ["storeops"];
    const roles = {
        storeops: currentUser?.role === "team member" ? ["team member"] : ["store manager", "team member"],
    };
    const feedbackReasons = [
        { value: "irrelevany", label: "The answer provided is incorrect." },
        { value: "incorrect", label: "The answer does not address my question." },
        { value: "other", label: "I need to speak with someone / Raise a Service Ticket." },
    ];

    const getInitials = (name) => {
        if (!name) return 'US';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0][0]?.toUpperCase() || 'US';
        }
        return (words[0][0] + words[1][0]).toUpperCase();
    };

    const userInitials = currentUser?.name
        ? getInitials(currentUser.name)
        : currentUser?.email
        ? getInitials(currentUser.email.split('@')[0])
        : 'US';

    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const timerRef = useRef(null);
    const sendButtonRef = useRef(null);
    const warningPopupRef = useRef(null);
    const feedbackInputRef = useRef(null);

    const IMAGE_BASE_URL = "http://52.87.135.1:3000/";
    useEffect(() => {
        setShowFeedbackForm(null);
        setSelectedFeedbackReason("");
        setFeedbackComment("");
    }, [selectedConversation?.intraction_id]);
    
    useEffect(() => {
        setIsBotTyping(localIsBotTyping);
    }, [localIsBotTyping, setIsBotTyping]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight + 10,
                behavior: "smooth",
            });
            if (inputRef.current && !localIsBotTyping && !showSessionTimeout) {
                inputRef.current.focus();
            }
        }
    };
    const preprocessMarkdown = (text) => {
        let processedText = text
            .replace(/(?<!\n)\n(?!\n)/g, "\n\n")
            .replace(/\n{3,}/g, "\n\n");
        processedText = processedText.replace(/(Source:.*)/, "\n\n$1");
        processedText = processedText.replace(/(Related Images:.*)/, "\n\n$1");
        return processedText;
    };

    useEffect(() => {
        const handleScroll = () => {
            if (messagesContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
                setShowScrollToBottom(!isAtBottom);
            }
        };

        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener("scroll", handleScroll);
        }

        return () => {
            if (container) {
                container.removeEventListener("scroll", handleScroll);
            }
        };
    }, []);

    const startWarningTimer = () => {
        setSecondsLeft(60);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    setShowWarning(false);
                    setShowSessionTimeout(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const clearWarningTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setShowWarning(false);
        setWarningMessage("");
        setSecondsLeft(60);
    };

    const handlePrevSlide = (messageId, totalImages) => {
        if (totalImages <= 1) return;
        setCurrentSlideIndices((prev) => {
            const currentIndex = prev[messageId] || 0;
            const newIndex = (currentIndex - 1 + totalImages) % totalImages;
            return { ...prev, [messageId]: newIndex };
        });
    };

    const handleNextSlide = (messageId, totalImages) => {
        if (totalImages <= 1) return;
        setCurrentSlideIndices((prev) => {
            const currentIndex = prev[messageId] || 0;
            const newIndex = (currentIndex + 1) % totalImages;
            return { ...prev, [messageId]: newIndex };
        });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                showWarning &&
                warningPopupRef.current &&
                !warningPopupRef.current.contains(e.target)
            ) {
                clearWarningTimer();
            }
        };

        if (showWarning) {
            document.addEventListener("click", handleClickOutside);
        }

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [showWarning]);

    const requestConversationHistory = (retryCount = 0) => {
        if (!currentUser?.email) {
            console.error("User email is missing. Cannot request conversation history.");
            setErrorMessage("User email is required. Please log in again.");
            return;
        }

        if (WebSocketService.isSocketOpen()) {
            WebSocketService.sendMessage({
                action: "get_conversation_history",
                token: currentUser?.token || "abc123",
                brand: department || "storeops",
                role: role || "store manager",
                user_email: currentUser.email,
                conversation_id: isNewConversation ? null : selectedConversation?.intraction_id,
            });
        } else if (retryCount < 3) {
            console.warn(`WebSocket not open, retrying... (${retryCount + 1}/3)`);
            setTimeout(() => {
                if (!WebSocketService.isSocketOpen()) {
                    WebSocketService.connect(currentUser, () => {
                        setIsWebSocketConnected(true);
                        requestConversationHistory(retryCount + 1);
                    });
                } else {
                    requestConversationHistory(retryCount + 1);
                }
            }, 1000);
        } else {
            console.error("Failed to request history after 3 retries");
            setErrorMessage("Failed to retrieve conversation history. Please try again.");
        }
    };

    useEffect(() => {
        const handleSessionTimeout = () => {
            clearWarningTimer();
            setShowSessionTimeout(true);
            WebSocketService.disconnect();
            setIsWebSocketConnected(false);
        };

        const handleWarning = (data) => {
            setWarningMessage(data.message || "Your session is about to timeout.");
            setShowWarning(true);
            startWarningTimer();
        };

        const handleMessage = (data) => {
            if (showSessionTimeout) return;
            if (data.action === "chat") {
                if (data.error || data.status === "error") {
                    setLocalIsBotTyping(false);
                    setIsLoading(false);
                    setErrorMessage("Sorry for the inconvenience, something went wrong. Please try again.");
                    setStreamingMessage(null);
                    return;
                }

                const newText = data.response || "";
                const imageUrls = Array.isArray(data.image_urls)
                    ? data.image_urls?.map((item) => ({
                        path: encodeURI(`${IMAGE_BASE_URL}${item.path}`),
                        score: item.score,
                    }))
                    : [];
                const messageId = data.message_id || `temp-${Date.now()}`;
                const timestamp = new Date().toISOString();
                const conversationId = data.conversation_id || selectedConversation?.intraction_id;

                if (data.endOfMessage === true) {
                    setLocalIsBotTyping(false);
                    setIsLoading(false);

                    let accumulatedText = streamingMessage ? streamingMessage.text : "";
                    accumulatedText += newText.trim();

                    const finalizedMsg = {
                        sender: "ai",
                        text: accumulatedText,
                        messageId,
                        timestamp,
                        imageUrls,
                        conversationId,
                    };
                    setMessages((prevMsgs) => [...prevMsgs, finalizedMsg]);
                    setCurrentSlideIndices((prev) => ({ ...prev, [messageId]: 0 }));
                    setStreamingMessage(null);
                    WebSocketService.sendMessage({
                        action: "get_conversation_history",
                        token: currentUser?.token || "abc123",
                        brand: department || "storeops",
                        role: role || "store manager",
                        user_email: currentUser?.email,
                        conversation_id: selectedConversation?.intraction_id,
                    });
                    if (isNewConversation) {
                        setIsNewConversation(false);
                        setTimeout(() => requestConversationHistory(), 500);
                    }
                } else {
                    setLocalIsBotTyping(true);
                    setIsLoading(true);

                    setStreamingMessage((prev) => ({
                        sender: "ai",
                        text: (prev ? prev.text : "") + newText,
                        messageId,
                        timestamp,
                        imageUrls,
                        conversationId,
                    }));
                }
            }

            if (data.action === "get_conversation_history") {
                if (onReceiveHistory && Array.isArray(data.historical_messages)) {
                    onReceiveHistory(data.historical_messages);
                } else {
                    console.warn("No historical messages received or onReceiveHistory not defined");
                }
            }

            if (data.action === "get_historical_messages" && Array.isArray(data.current_messages)) {
                const formattedMessages = data.current_messages?.map((msg) => {
                    let text = msg.msg_text?.trim() || "";
                    const imageUrls = Array.isArray(msg.image_urls)
                        ? msg.image_urls?.map((item) => ({
                            path: encodeURI(`${IMAGE_BASE_URL}${item.path}`),
                            score: item.score,
                        }))
                        : [];

                    return {
                        sender: msg.user_message ? "user" : "ai",
                        text,
                        messageId: msg.message_id || `temp-${Date.now()}`,
                        timestamp: msg.msg_timestamp || new Date().toISOString(),
                        imageUrls,
                        conversationId: msg.conversation_id,
                    };
                });

                setMessages(formattedMessages);
                setCurrentSlideIndices((prev) => {
                    const newIndices = { ...prev };
                    formattedMessages.forEach((msg) => {
                        if (msg.imageUrls && msg.imageUrls.length > 0) {
                            newIndices[msg.messageId] = 0;
                        }
                    });
                    return newIndices;
                });
                setStreamingMessage(null);
                setLocalIsBotTyping(false);
                setIsLoading(false);
                setIsNewConversation(false);
            }
        };

        WebSocketService.onSessionTimeout(handleSessionTimeout);
        WebSocketService.onWarning(handleWarning);
        WebSocketService.onMessage(handleMessage);

        return () => {
            WebSocketService.offSessionTimeout(handleSessionTimeout);
            WebSocketService.offWarning(handleWarning);
            WebSocketService.offMessage(handleMessage);
        };
    }, [onReceiveHistory, department, role, selectedConversation, isNewConversation, currentUser]);

    useEffect(() => {
        const handleWebSocketConnection = () => {
            if (allHealthy && !WebSocketService.isSocketOpen()) {
                WebSocketService.connect(currentUser, () => {
                    setIsWebSocketConnected(true);
                    if (isNewConversation) {
                        requestConversationHistory();
                    }
                });
            } else if (!allHealthy && isWebSocketConnected) {
                WebSocketService.disconnect();
                setIsWebSocketConnected(false);
            }
        };

        handleWebSocketConnection();

        if (shouldReconnectWebSocket) {
            handleWebSocketConnection();
            setShouldReconnectWebSocket(false);
        }

        return () => {
            if (!allHealthy) {
                WebSocketService.disconnect();
                setIsWebSocketConnected(false);
            }
            clearWarningTimer();
        };
    }, [allHealthy, isWebSocketConnected, shouldReconnectWebSocket, isNewConversation, currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage, errorMessage, localIsBotTyping, isLoading]);

    useEffect(() => {
        if (!localIsBotTyping && inputRef.current && !showSessionTimeout) {
            inputRef.current.focus();
            setInputText("");
        }
    }, [localIsBotTyping, showSessionTimeout]);

    const handleSendMessage = () => {
        if (inputText.trim() === "" || showSessionTimeout || !allHealthy) return;
        const timestamp = new Date().toISOString();
        const userMessage = {
            sender: "user",
            text: inputText,
            timestamp,
            conversationId: selectedConversation?.intraction_id,
        };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setStreamingMessage(null);
        setErrorMessage(null);
        setLocalIsBotTyping(true);
        setIsLoading(true);

        const payload = {
            prompt: inputText,
            brand: department,
            role: role,
            user_email: currentUser?.email,
            conversation_id: selectedConversation?.intraction_id,
        };

        WebSocketService.sendMessage(payload);

        if (sendButtonRef.current) {
            sendButtonRef.current?.classList?.add("sending");
            setTimeout(() => {
                sendButtonRef.current?.classList?.remove("sending");
            }, 300);
        }

        clearWarningTimer();
    };

    const handleFeedbackClick = (messageId, type) => {
        if (showSessionTimeout || !allHealthy || localIsBotTyping) return;

        if (type === "up") {
            setFeedbackGiven((prev) => {
                const newFeedback = { ...prev };
                delete newFeedback[messageId];
                setTimeout(() => {
                    setFeedbackGiven((prevState) => ({ ...prevState, [messageId]: "up" }));
                }, 10);
                return newFeedback;
            });

            const feedbackPayload = {
                action: "feedback",
                message_id: messageId,
                feedback: true,
            };

            WebSocketService.sendMessage(feedbackPayload);
            setShowFeedbackForm(null); // Hide feedback form if open
        } else {
            setShowFeedbackForm(messageId);
            setSelectedFeedbackReason("");
            setFeedbackComment("");
        }
    };

    const handleFeedbackSubmit = (messageId) => {
        if (!selectedFeedbackReason) return;

        setFeedbackGiven((prev) => ({
            ...prev,
            [messageId]: "down",
        }));

        const feedbackPayload = {
            action: "feedback",
            message_id: messageId,
            feedback: false,
            reason: selectedFeedbackReason,
            ...(selectedFeedbackReason === "other" && feedbackComment && { comment: feedbackComment }),
        };

        WebSocketService.sendMessage(feedbackPayload);
        setShowFeedbackForm(null);
        setSelectedFeedbackReason("");
        setFeedbackComment("");
    };

    const handleSessionTimeoutConfirm = () => {
        setShowSessionTimeout(false);
        setMessages([]);
        setStreamingMessage(null);
        setErrorMessage(null);
        setInputText("");
        setIsLoading(false);
        setShowFeedbackForm(null); 
        setLocalIsBotTyping(false);
        setIsNewConversation(true);
        onNewConversation && onNewConversation();
        if (allHealthy && !WebSocketService.isSocketOpen()) {
            WebSocketService.connect(currentUser, () => {
                setIsWebSocketConnected(true);
                requestConversationHistory();
            });
        } else if (allHealthy && WebSocketService.isSocketOpen()) {
            requestConversationHistory();
        }
    };

    const handleNewConversation = () => {
        if (!showSessionTimeout && allHealthy) {
            setMessages([]);
            setStreamingMessage(null);
            setErrorMessage(null);
            setInputText("");
            setIsLoading(false);
            setLocalIsBotTyping(false);
            setIsNewConversation(true);
            setShowFeedbackForm(null); 
            onNewConversation && onNewConversation();

            WebSocketService.disconnect();
            WebSocketService.connect(currentUser, () => {
                setIsWebSocketConnected(true);
                requestConversationHistory();
            });
        }
    };

    const lastBotMessageIndex = [...messages].reverse().findIndex((msg) => msg.sender === "ai");
    const actualLastBotIndex = lastBotMessageIndex !== -1 ? messages.length - 1 - lastBotMessageIndex : -1;

    const formatTimestamp = (timestamp) => {
        const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        try {
            let date;

            if (!timestamp) {
                date = new Date();
            } else if (/^\d+$/.test(timestamp)) {
                date = new Date(parseInt(timestamp));
            } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(timestamp)) {
                date = new Date(`${timestamp}Z`);
            } else {
                date = new Date(timestamp);
            }

            if (isNaN(date.getTime())) {
                return "Invalid Date";
            }

            const zonedDate = toZonedTime(date, browserTimeZone);
            const formatted = formatInTimeZone(zonedDate, browserTimeZone, "h:mm:ss a 'on' MMMM d, yyyy");
            return formatted;
        } catch (error) {
            return "Invalid Date";
        }
    };

    return (
        <div className={`chat-window ${showSessionTimeout ? "locked" : ""}`}>
            <div className="chat-window-header">
                <div className="chat-controls">
                    <button
                        className="toggle-sidebar-button"
                        onClick={() => {
                            if (!showSessionTimeout && allHealthy && !localIsBotTyping) onToggleSidebar();
                        }}
                        disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                        title={isSidebarVisible ? "Hide History" : "Show History"}
                    >
                        <RiLayoutLeftLine />
                        {isSidebarVisible ? "Hide History" : "Show History"}
                    </button>
                    <button
                        className="new-chat-button"
                        onClick={handleNewConversation}
                        disabled={showSessionTimeout || !allHealthy}
                        title="New Chat"
                    >
                        <RiChatNewLine />
                        New Chat
                    </button>
                </div>
                <div className="chat-dropdowns">
                    <label>Department:</label>
                    <select
                        value={department}
                        onChange={(e) =>
                            !showSessionTimeout && allHealthy && !localIsBotTyping && setDepartment(e.target.value)
                        }
                        disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                    >
                        {departments?.map((dept, index) => (
                            <option key={index} value={dept}>
                                StoreOps
                            </option>
                        ))}
                    </select>
                    <label>Role:</label>
                    <select
                        value={role}
                        onChange={(e) =>
                            !showSessionTimeout && allHealthy && !localIsBotTyping && setRole(e.target.value)
                        }
                        disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                    >
                        {roles[department]?.map((r, index) => (
                            <option key={index} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="chat-content">
                {showScrollToBottom && (
                    <button
                        className="scroll-to-bottom-button"
                        onClick={scrollToBottom}
                        title="Scroll to latest message"
                        aria-label="Scroll to latest message"
                        disabled={showSessionTimeout || !allHealthy}
                        style={{ opacity: showSessionTimeout || !allHealthy ? 0.5 : 1 }}
                    >
                        <RiArrowDownSLine />
                    </button>
                )}
                <div className="messages-container" ref={messagesContainerRef}>
                    {messages?.map((msg, index) => {
                        return (
                            <div className={`message-container ${msg.sender}`} key={index}>
                                {msg.sender === "ai" && (
                                    <img
                                        src={otterProfileIcon}
                                        alt="Otter Icon"
                                        aria-label="Otter Icon"
                                        className="icon bot-icon"
                                    />
                                )}

                                <div className={`message-bubble ${msg.sender}`}>
                                    {msg.sender === "ai" ? (
                                        <>
                                            <div className="ai-message-header">
                                                Assistant 
                                                <span className="timestamp inline-timestamp">
                                                    at {formatTimestamp(msg.timestamp)}
                                                </span>
                                            </div>
                                            <div className="markdown-response" >
                                                <ReactMarkdown remarkPlugins={[remarkBreaks,remarkGfm]}>{preprocessMarkdown(msg.text)}</ReactMarkdown>
                                                {msg.imageUrls && msg.imageUrls.length > 0 && (
                                                    <div className="related-images">
                                                        <p>
                                                            <strong>Related Images:</strong>
                                                        </p>
                                                        <div className="slider-container">
                                                            {msg.imageUrls.length > 1 &&
                                                                (currentSlideIndices[msg.messageId] || 0) > 0 && (
                                                                    <button
                                                                        className="slider-button prev"
                                                                        onClick={() =>
                                                                            handlePrevSlide(msg.messageId, msg.imageUrls.length)
                                                                        }
                                                                        disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                                                                    >
                                                                        <RiArrowLeftSLine />
                                                                    </button>
                                                                )}
                                                            <div className="slider">
                                                                <div
                                                                    className="slider-images"
                                                                    style={{
                                                                        transform: `translateX(-${(currentSlideIndices[msg.messageId] || 0) * 100
                                                                            }%)`,
                                                                        transition: "transform 0.3s ease-in-out",
                                                                    }}
                                                                >
                                                                    {msg.imageUrls?.map((item, idx) => (
                                                                        <div className="slide" key={idx}>
                                                                            <ImageWithLoading
                                                                                src={item.path}
                                                                                alt={`Related Image ${idx + 1}`}
                                                                                score={item.score}
                                                                                currentIndex={
                                                                                    currentSlideIndices[msg.messageId] || 0
                                                                                }
                                                                                totalImages={msg.imageUrls.length}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {msg.imageUrls.length > 1 &&
                                                                (currentSlideIndices[msg.messageId] || 0) <
                                                                msg.imageUrls.length - 1 && (
                                                                    <button
                                                                        className="slider-button next"
                                                                        onClick={() =>
                                                                            handleNextSlide(msg.messageId, msg.imageUrls.length)
                                                                        }
                                                                        disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                                                                    >
                                                                        <RiArrowRightSLine />
                                                                    </button>
                                                                )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {index === actualLastBotIndex && (
                                                <div className="feedback-icons">
                                                    <span
                                                        className={`icon thumbs-up ${feedbackGiven[msg.messageId] === "up" ? "active" : ""
                                                            }`}
                                                        title="Thumbs Up"
                                                        onClick={() => handleFeedbackClick(msg.messageId, "up")}
                                                        style={{
                                                            pointerEvents:
                                                                showSessionTimeout || !allHealthy || localIsBotTyping
                                                                    ? "none"
                                                                    : "auto",
                                                            opacity:
                                                                showSessionTimeout || !allHealthy || localIsBotTyping ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {feedbackGiven[msg.messageId] === "up" ? (
                                                            <RiThumbUpFill />
                                                        ) : (
                                                            <RiThumbUpLine />
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`icon thumbs-down ${feedbackGiven[msg.messageId] === "down" ? "active" : ""
                                                            }`}
                                                        title="Thumbs Down"
                                                        onClick={() => handleFeedbackClick(msg.messageId, "down")}
                                                        style={{
                                                            pointerEvents:
                                                                showSessionTimeout || !allHealthy || localIsBotTyping
                                                                    ? "none"
                                                                    : "auto",
                                                            opacity:
                                                                showSessionTimeout || !allHealthy || localIsBotTyping ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {feedbackGiven[msg.messageId] === "down" ? (
                                                            <RiThumbDownFill />
                                                        ) : (
                                                            <RiThumbDownLine />
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {showFeedbackForm === msg.messageId && (
                                                <div className="feedback-form">
                                                    <p>Please select a reason for your feedback:</p>
                                                    {feedbackReasons.map((reason) => (
                                                        <div key={reason.value} className="feedback-option">
                                                            <input
                                                                type="radio"
                                                                id={`${msg.messageId}-${reason.value}`}
                                                                name={`feedback-${msg.messageId}`}
                                                                value={reason.value}
                                                                checked={selectedFeedbackReason === reason.value}
                                                                onChange={() => setSelectedFeedbackReason(reason.value)}
                                                            />
                                                            <label htmlFor={`${msg.messageId}-${reason.value}`}>
                                                                {reason.label}
                                                            </label>
                                                        </div>
                                                    ))}
                                                    {selectedFeedbackReason === "other" && (
                                                        <div className="feedback-comment">
                                                            <textarea
                                                                ref={feedbackInputRef}
                                                                value={feedbackComment}
                                                                onChange={(e) => setFeedbackComment(e.target.value)}
                                                                placeholder="Please provide additional details."
                                                                rows="3"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="feedback-buttons">
                                                        <button
                                                            onClick={() => handleFeedbackSubmit(msg.messageId)}
                                                            disabled={!selectedFeedbackReason || (selectedFeedbackReason === "other" && !feedbackComment.trim())}
                                                        >
                                                            Submit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowFeedbackForm(null);
                                                                setSelectedFeedbackReason("");
                                                                setFeedbackComment("");
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="user-message-header">
                                                You 
                                                <span className="timestamp inline-timestamp">
                                                    at {formatTimestamp(msg.timestamp)}
                                                </span>
                                            </div>
                                            <p>{msg.text}</p>
                                        </>
                                    )}
                                </div>

                                {msg.sender === "user" && (
                                    <div className="icon user-icon" aria-label="User Icon">
                                        {userInitials}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {streamingMessage && (
                        <div className="message-container ai">
                            <img
                                src={otterProfileIcon}
                                alt="Otter Icon"
                                aria-label="Otter Icon"
                                className="icon bot-icon"
                            />
                            <div className="message-bubble">
                                <div className="ai-message-header">
                                    Assistant 
                                    <span className="timestamp inline-timestamp">
                                        at {formatTimestamp(streamingMessage.timestamp)}
                                    </span>
                                </div>
                                <div className="markdown-response">
                                <ReactMarkdown remarkPlugins={[remarkBreaks,remarkGfm]}>{preprocessMarkdown(streamingMessage.text)}</ReactMarkdown>
                                    {streamingMessage.imageUrls && streamingMessage.imageUrls.length > 0 && (
                                        <div className="related-images">
                                            <p>
                                                <strong>Related Images:</strong>
                                            </p>
                                            <div className="slider-container">
                                                {streamingMessage.imageUrls.length > 1 &&
                                                    (currentSlideIndices[streamingMessage.messageId] || 0) > 0 && (
                                                        <button
                                                            className="slider-button prev"
                                                            onClick={() =>
                                                                handlePrevSlide(
                                                                    streamingMessage.messageId,
                                                                    streamingMessage.imageUrls.length,
                                                                )
                                                            }
                                                            disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                                                        >
                                                            <RiArrowLeftSLine />
                                                        </button>
                                                    )}
                                                <div className="slider">
                                                    <div
                                                        className="slider-images"
                                                        style={{
                                                            transform: `translateX(-${(currentSlideIndices[streamingMessage.messageId] || 0) *
                                                                100
                                                                }%)`,
                                                            transition: "transform 0.3s ease-in-out",
                                                        }}
                                                    >
                                                        {streamingMessage.imageUrls?.map((item, idx) => (
                                                            <div className="slide" key={idx}>
                                                                <ImageWithLoading
                                                                    src={item.path}
                                                                    alt={`Related Image ${idx + 1}`}
                                                                    score={item.score}
                                                                    currentIndex={
                                                                        currentSlideIndices[streamingMessage.messageId] || 0
                                                                    }
                                                                    totalImages={streamingMessage.imageUrls.length}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {streamingMessage.imageUrls.length > 1 &&
                                                    (currentSlideIndices[streamingMessage.messageId] || 0) <
                                                    streamingMessage.imageUrls.length - 1 && (
                                                        <button
                                                            className="slider-button next"
                                                            onClick={() =>
                                                                handleNextSlide(
                                                                    streamingMessage.messageId,
                                                                    streamingMessage.imageUrls.length,
                                                                )
                                                            }
                                                            disabled={showSessionTimeout || !allHealthy || localIsBotTyping}
                                                        >
                                                            <RiArrowRightSLine />
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {errorMessage && !showSessionTimeout && !streamingMessage && (
                        <div className="message-container ai">
                            <img
                                src={otterProfileIcon}
                                alt="Otter Icon"
                                aria-label="Otter Icon"
                                className="icon bot-icon"
                            />
                            <div className="message-bubble error-bubble">
                                <div className="ai-message-header">
                                    Assistant 
                                    <span className="timestamp inline-timestamp">
                                        at {formatTimestamp(new Date().toISOString())}
                                    </span>
                                </div>
                                <p>{errorMessage}</p>
                            </div>
                        </div>
                    )}
                    {localIsBotTyping && !streamingMessage && messages.length > 0 && !showSessionTimeout && !errorMessage && (
                        <div className="message-container ai">
                            <img
                                src={otterProfileIcon}
                                alt="Otter Icon"
                                aria-label="Otter Icon"
                                className="icon bot-icon"
                            />
                            <div className="message-bubble">
                                <div className="ai-message-header">
                                    Assistant 
                                    <span className="timestamp inline-timestamp">
                                        at {formatTimestamp(new Date().toISOString())}
                                    </span>
                                </div>
                                <div className="bot-loading">
                                    <img
                                        className="bot-loading-image"
                                        src={loadingVideo}
                                        alt="Loading animation"
                                        aria-label="Loading animation"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    {isLoading && !showSessionTimeout && !errorMessage && messages.length === 0 && !streamingMessage && (
                        <div className="loading-overlay">
                            <img
                                className="loading-image"
                                src={loadingVideo}
                                alt="Loading animation"
                                aria-label="Loading animation"
                            />
                        </div>
                    )}
                </div>
            </div>

            {showSessionTimeout && (
                <div className="session-timeout-overlay">
                    <div className="session-timeout-popup">
                        <div className="popup-content">
                            <h3>Session Timed Out</h3>
                            <p>
                                Your session has expired. Please click <b>"OK"</b> to start a new session to continue.
                            </p>
                            <button onClick={handleSessionTimeoutConfirm}>OK</button>
                        </div>
                    </div>
                </div>
            )}

            {showWarning && (
                <div className="warning-overlay">
                    <div className="warning-popup" ref={warningPopupRef}>
                        <div className="popup-content">
                            <h3>Warning</h3>
                            <p>{warningMessage}</p>
                            <p>
                                Session will timeout in <b>{secondsLeft}</b> seconds.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="chat-input">
                <img src={ottericon} alt="Otter Icon" className="input-icon" />
                <input
                    type="text"
                    placeholder={isInputFocused ? "" : "Ask Assistant"}
                    value={inputText}
                    onChange={(e) =>
                        !showSessionTimeout && allHealthy && !localIsBotTyping && setInputText(e.target.value)
                    }
                    onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !showSessionTimeout &&
                        allHealthy &&
                        !localIsBotTyping &&
                        handleSendMessage()
                    }
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    disabled={localIsBotTyping || showSessionTimeout || !allHealthy}
                    ref={inputRef}
                />
                {localIsBotTyping && !showSessionTimeout ? (
                    <button className="send-button typing" disabled>
                        <span className="typing-indicator">...</span>
                    </button>
                ) : (
                    <button
                        className="send-button"
                        ref={sendButtonRef}
                        onClick={handleSendMessage}
                        disabled={localIsBotTyping || showSessionTimeout || !allHealthy}
                        style={{ opacity: showSessionTimeout || !allHealthy ? 0.5 : 1 }}
                    >
                        <RiSendPlane2Line />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;