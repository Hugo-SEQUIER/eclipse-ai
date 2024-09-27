import React, { useState } from 'react';
import { getResponse } from './aiChat/Chat.js'
import './ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentConversationTitle, setCurrentConversationTitle] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // If this is the first message, use it as the conversation title
    if (messages.length === 0) {
      setCurrentConversationTitle(input.slice(0, 30));
    }
    
    setInput('');
    setIsLoading(true);

    try {
      const response = await getResponse(input);
      if (response !== undefined) {
        const botMessage = { role: 'assistant', content: response };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
        
        // Add to chat history only if it's the first message
        if (messages.length === 0) {
          setChatHistory((prevHistory) => [...prevHistory, { id: Date.now(), title: currentConversationTitle }]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your request.' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationTitle('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">AI Chat</div>
      <div className="chat-body">
        <div className="chat-history">
          <button onClick={startNewConversation} className="new-conversation-btn">New Conversation</button>
          {chatHistory.map((item) => (
            <div key={item.id} className="chat-history-item">
              {item.title}
            </div>
          ))}
        </div>
        <div className="chat-main">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                {message.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;