import React, { createContext, useState, useContext } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [conversationHistory, setConversationHistory] = useState([]);

  return (
    <ChatContext.Provider value={{ conversationHistory, setConversationHistory }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);