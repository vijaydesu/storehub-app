import React, { useState } from 'react';
import './Chatbot.scss';

const Chatbot = () => {
    const [messages, setMessages] = useState([
        { sender: 'You', text: 'Tell me about PTO' },
        { sender: 'AI Bot', text: 'PTO is used for vacation, sick time, and personal leave.' },
    ]);
    const [input, setInput] = useState('');

    const sendMessage = () => {
        if (input.trim() !== '') {
            setMessages([...messages, { sender: 'You', text: input }]);
            setTimeout(() => {
                setMessages((prev) => [...prev, { sender: 'AI Bot', text: 'This is a dummy response.' }]);
            }, 1000);
            setInput('');
        }
    };

    return (
        <div className="chatbot">
            <h2>Agentic AI</h2>
            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender.toLowerCase()}`}>
                        <strong>{msg.sender}: </strong> {msg.text}
                    </div>
                ))}
            </div>
            <div className="chat-input">
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="Type a message..." 
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
};

export default Chatbot;
