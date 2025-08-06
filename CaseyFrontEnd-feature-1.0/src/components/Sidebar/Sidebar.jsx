import React from "react";
import "./Sidebar.scss";
import WebSocketService from "../../services/websocketService";

const Sidebar = ({ historicalMessages = [], onConversationSelect, selectedConversation, isBotTyping, currentUser }) => {
    const handleConversationClick = (msg) => {
        if (isBotTyping) return;
        if (!msg || !msg.intraction_id) {
            return;
        }

        if (onConversationSelect) {
            onConversationSelect(msg);
        }

        const payload = {
            action: "get_historical_messages",
            conversation_id: msg.intraction_id,
            user_email: currentUser?.email,        };
        WebSocketService.sendMessage(payload);
    };

    const renderHistory = () => {
        if (!Array.isArray(historicalMessages) || historicalMessages.length === 0) {
            return <li className="no-history">You have no chat history.</li>;
        }

        return historicalMessages
            .map((msg, index) => {
                if (!msg.intraction_id) {
                    return null;
                }
                const title = msg.interaction_title || `Conversation #${index + 1}`;
                return (
                    <li
                        key={msg.intraction_id}
                        onClick={() => handleConversationClick(msg)}
                        className={`${selectedConversation?.intraction_id === msg.intraction_id ? "active" : ""} ${
                            isBotTyping ? "disabled" : ""
                        }`}
                    >
                        <span className="conversation-title">{title}</span>
                    </li>
                );
            })
            .filter(Boolean);
    };

    return (
        <div className={`sidebar ${isBotTyping ? "disabled" : ""}`}>
            <h2>Chat History</h2>
            <span className="heading-underline"></span>
            <ul>{renderHistory()}</ul>
        </div>
    );
};

export default Sidebar;