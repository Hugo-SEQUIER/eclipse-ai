import React, { useState, useEffect } from 'react';
import { getResponse, getConversationTitle } from './aiChat/Chat.js'
import './ChatBot.css';
import { useWallet } from '@solana/wallet-adapter-react';

const ChatBot = () => {
  const [conversations, setConversations] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const wallet = useWallet();
  const [publicKeyString, setPublicKeyString] = useState('');

  useEffect(() => {
    if (wallet.publicKey) {
      setPublicKeyString(wallet.publicKey.toString());
    }
  }, [wallet.publicKey]);

  console.log("Public Key:", publicKeyString);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);

    let conversationId = activeConversationId;
    let isNewConversation = false;

    // If no active conversation, create a new one
    if (!conversationId) {
      conversationId = generateUniqueId();
      isNewConversation = true;
      setActiveConversationId(conversationId);
      setConversations((prevConversations) => ({
        ...prevConversations,
        [conversationId]: {
          id: conversationId,
          title: 'New Conversation',
          messages: [],
        },
      }));
    }

    const userMessage = { role: 'user', content: input };
    setConversations((prevConversations) => ({
      ...prevConversations,
      [conversationId]: {
        ...prevConversations[conversationId],
        messages: [...(prevConversations[conversationId]?.messages || []), userMessage],
      },
    }));

    setInput('');

    try {
      const response = await getResponse(input);
      if (response !== undefined) {
        const botMessage = { role: 'assistant', content: response };
        setConversations((prevConversations) => {
          const updatedConversation = {
            ...prevConversations[conversationId],
            messages: [...(prevConversations[conversationId]?.messages || []), botMessage],
          };

          // Generate title only for new conversations
          if (isNewConversation) {
            const titlePrompt = `Generate a concise title for the following conversation:\n\nUser: ${input}\nAssistant: ${response}`;
            getConversationTitle(titlePrompt).then(async (generatedTitle) => {
              const metadata = {
                id: conversationId,
                title: generatedTitle || 'New Conversation',
                messages: updatedConversation.messages,
              };

              try {
                const uploadResponse = await fetch('http://localhost:3001/upload', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ data: JSON.stringify(metadata) }),
                });

                if (uploadResponse.ok) {
                  const { url } = await uploadResponse.json();
                  console.log('Metadata stored at:', url);
                } else {
                  console.error('Failed to store metadata');
                }
              } catch (error) {
                console.error('Error storing metadata:', error);
              }

              setConversations(prevConvs => ({
                ...prevConvs,
                [conversationId]: {
                  ...updatedConversation,
                  title: generatedTitle || 'New Conversation',
                },
              }));

              setChatHistory(prevHistory => [
                ...prevHistory.filter(item => item.id !== conversationId),
                { id: conversationId, title: generatedTitle || 'New Conversation' },
              ]);
            });
          }

          return {
            ...prevConversations,
            [conversationId]: updatedConversation,
          };
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your request.' };
      setConversations((prevConversations) => ({
        ...prevConversations,
        [conversationId]: {
          ...prevConversations[conversationId],
          messages: [...(prevConversations[conversationId]?.messages || []), errorMessage],
        },
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    // Optionally, you can clear the input or keep it as is
  };

  const selectConversation = (id) => {
    setActiveConversationId(id);
  };

  const generateUniqueId = () => {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const [chatHistory, setChatHistory] = useState([]);

  return (
    <div className="chat-container">
      <div className="chat-header">AI Chat</div>
      <div className="chat-body">
        <div className="chat-history">
          <button onClick={startNewConversation} className="new-conversation-btn">New Conversation</button>
          {chatHistory.map((item) => (
            <div
              key={item.id}
              className={`chat-history-item ${item.id === activeConversationId ? 'active' : ''}`}
              onClick={() => selectConversation(item.id)}
            >
              {item.title}
            </div>
          ))}
        </div>
        <div className="chat-main">
          <div className="chat-messages">
            {activeConversationId && conversations[activeConversationId]?.messages.map((message, index) => (
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