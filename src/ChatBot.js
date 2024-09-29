import React, { useState, useEffect } from 'react';
import { getResponse, getConversationTitle } from './aiChat/Chat.js'
import './ChatBot.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { GraphQLClient, gql } from 'graphql-request';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { uploadToIrys } from './aiChat/irys.js';
import { Link } from 'react-router-dom';
import { embellishText } from './aiChat/embellishtext.js';
import { encryptText, decryptText } from './aiChat/encryption.js';

const ChatBot = () => {
  const [conversations, setConversations] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const wallet = useWallet();
  const [publicKeyString, setPublicKeyString] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    if (wallet.publicKey) {
      setPublicKeyString(wallet.publicKey.toString());
      fetchConversations(wallet.publicKey.toString());
    }
  }, [wallet.publicKey]);

  const fetchConversations = async (publicKey) => {
    const endpoint = 'https://uploader.irys.xyz/graphql';
    const graphQLClient = new GraphQLClient(endpoint);

    const query = gql`
      query($owners: [String!], $tags: [TagFilter!]) {
        transactions(owners: $owners, tags: $tags) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    try {
      const variables = {
        owners: [publicKey],
        tags: [{ name: "address", values: ["DJi9qeHDT5vpu1iKApVvPxfBa7UYdSkuMPPsZ97zxvSc"] }]
      };
      const data = await graphQLClient.request(query, variables);
      const transactionIds = data.transactions.edges.map(edge => edge.node.id);
      
      const fetchedConversations = await fetchConversationData(transactionIds);
      
      setConversations(fetchedConversations);
      setChatHistory(
        Object.keys(fetchedConversations)
          .map((id) => ({
            id,
            title: fetchedConversations[id].title,
            date: fetchedConversations[id].date,
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort chat history by date
      );

      if (Object.keys(fetchedConversations).length > 0) {
        setActiveConversationId(Object.keys(fetchedConversations)[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchConversationData = async (transactionIds) => {
    const fetchedConversations = {};

    for (const id of transactionIds) {
      try {
        const response = await fetch(`https://gateway.irys.xyz/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        const conversationDate = new Date(data.date).toISOString();

        if (!fetchedConversations[data.idConversation]) {
          fetchedConversations[data.idConversation] = {
            title: data.title || `Conversation ${data.idConversation}`, // Retrieve stored title
            messages: [],
            date: conversationDate,
          };
        }

        // Decrypt the prompt before storing it
        const decryptedPrompt = embellishText(decryptText(data.prompt));

        fetchedConversations[data.idConversation].messages.push({
          id: data.idMessage,
          content: decryptedPrompt, // Use decrypted prompt
          role: data.role,
          date: data.date,
        });

        // Sort messages by date (ascending)
        fetchedConversations[data.idConversation].messages.sort((a, b) => new Date(a.date) - new Date(b.date));

      } catch (error) {
        console.error(`Error fetching data for transaction ${id}:`, error);
      }
    }

    // Convert to array for sorting
    const sortedConversationsArray = Object.entries(fetchedConversations).map(([id, convo]) => ({
      id,
      ...convo,
    }));

    // Sort conversations by date (latest first)
    sortedConversationsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Convert back to object if needed
    const sortedConversations = {};
    sortedConversationsArray.forEach((convo) => {
      sortedConversations[convo.id] = {
        title: convo.title,
        messages: convo.messages,
        date: convo.date,
        // Add any other relevant data you stored
      };
    });

    return sortedConversations;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);

    let conversationId = activeConversationId;
    let conversationTitle = `Conversation ${generateUniqueId()}`;

    if (!conversationId) {
      // Start a new conversation
      conversationId = generateUniqueId();
      setActiveConversationId(conversationId);

      try {
        // Generate conversation title using the first user input
        conversationTitle = await getConversationTitle(input);
      } catch (error) {
        console.error('Error generating conversation title:', error);
        // Fallback to default title if title generation fails
        conversationTitle = `Conversation ${conversationId}`;
      }
    }

    const messageId = generateUniqueId();
    const currentDate = new Date().toISOString();

    // Encrypt the user input before storing it
    const encryptedInput = encryptText(input);

    const userMetadata = {
      date: currentDate,
      model: "Meta-Llama-3-1-8B-Instruct-FP8",
      prompt: encryptedInput, // Encrypt prompt
      role: 'user',
      idConversation: conversationId,
      idMessage: messageId,
      address: publicKeyString,
      title: conversationTitle, // Use generated title
    };

    console.log('User Metadata:', userMetadata);

    // Add user message to the conversation immediately
    const userMessage = { role: 'user', content: input, id: messageId, date: currentDate };
    setConversations((prevConversations) => ({
      ...prevConversations,
      [conversationId]: {
        ...prevConversations[conversationId],
        messages: [...(prevConversations[conversationId]?.messages || []), userMessage].sort((a, b) => new Date(a.date) - new Date(b.date)),
        title: conversationTitle, // Set the generated title
        date: new Date(userMessage.date).toISOString(), // Update conversation date
      },
    }));

    setChatHistory((prevHistory) => {
      const exists = prevHistory.find(item => item.id === conversationId);
      if (!exists) {
        return [...prevHistory, { id: conversationId, title: conversationTitle || 'Untitled Conversation', date: userMessage.date }];
      }
      return prevHistory;
    });

    setInput('');

    try {
      // Upload user message metadata
      await uploadMetadata(userMetadata);

      const response = await getResponse(input);
      if (response !== undefined) {
        const embellishedResponse = embellishText(response);
        const encryptedResponse = encryptText(embellishedResponse);

        const botMessageId = generateUniqueId();
        const botMetadata = {
          date: new Date().toISOString(),
          model: "Meta-Llama-3-1-8B-Instruct-FP8",
          prompt: encryptedResponse, // Encrypt prompt
          role: 'assistant',
          idConversation: conversationId,
          idMessage: botMessageId,
          address: publicKeyString,
          title: conversationTitle, // Use generated title
        };

        console.log('AI Metadata:', botMetadata);

        // Upload AI response metadata
        await uploadMetadata(botMetadata);

        // Decrypt the response before displaying
        const decryptedResponse = decryptText(encryptedResponse);

        const botMessage = { role: 'assistant', content: decryptedResponse, id: botMessageId, date: new Date().toISOString() };
        setConversations((prevConversations) => ({
          ...prevConversations,
          [conversationId]: {
            ...prevConversations[conversationId],
            messages: [...(prevConversations[conversationId]?.messages || []), botMessage].sort((a, b) => new Date(a.date) - new Date(b.date)),
            date: new Date(botMessage.date).toISOString(), // Update conversation date
          },
        }));

        setChatHistory((prevHistory) => {
          return prevHistory.map(item => 
            item.id === conversationId
              ? { ...item, date: botMessage.date }
              : item
          ).sort((a, b) => new Date(b.date) - new Date(a.date));
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your request.', id: generateUniqueId(), date: new Date().toISOString() };
      setConversations((prevConversations) => ({
        ...prevConversations,
        [conversationId]: {
          ...prevConversations[conversationId],
          messages: [...(prevConversations[conversationId]?.messages || []), errorMessage].sort((a, b) => new Date(a.date) - new Date(b.date)),
          date: new Date(errorMessage.date).toISOString(), // Update conversation date
        },
      }));

      setChatHistory((prevHistory) => {
        return prevHistory.map(item => 
          item.id === conversationId
            ? { ...item, date: errorMessage.date }
            : item
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setInput('');
  };

  const selectConversation = (id) => {
    setActiveConversationId(id);
  };

  const generateUniqueId = () => {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const uploadMetadata = async (metadata) => {
    try {
      const result = await uploadToIrys(metadata, wallet);

      if (result.url) {
        console.log('Metadata stored at:', result.url);
      } else {
        console.error('Failed to store metadata:', result.error);
      }
    } catch (error) {
      console.error('Error storing metadata:', error);
    }
  };

  return (
    <div className="chat-container">
       <div className="chat-header">
          <a href="https://trophe.net/" target="_blank" rel="noopener noreferrer">
            <img src="/logo_dark.png" alt="Logo" className="header-logo" />
          </a>
          Meta-Llama-3-1-8B-Instruct-FP8 - Chatbot
          <Link to="/about" className="about-link">About</Link>
        </div>
      <div className="chat-body">
        <div className="chat-history">
          <button onClick={startNewConversation} className="new-conversation-btn">New Conversation</button>
          <div className="conversation-date-border"></div>
          <div className="conversation-history">
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className={`chat-history-item ${item.id === activeConversationId ? 'active' : ''}`}
                onClick={() => selectConversation(item.id)}
              >
                <div className="conversation-title">{item.title}</div>
              </div>
            ))}
            {chatHistory.length === 0 && (
              <div className="no-conversations">
                No conversations found. Start a new conversation!
              </div>
            )}
          </div>

          {/* Powered By Section */}
          <div className="powered-by">
            <div>
              <span>Powered By</span>
              <img src="/akash.png" alt="Akash Logo" className="powered-logo" />
              <img src="/irys.svg" alt="Irys Logo" className="powered-logo" />
            </div>
            <WalletMultiButton />
          </div>
        </div>
        <div className="chat-main">
          <div className="chat-messages">
            {activeConversationId && conversations[activeConversationId]?.messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div 
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />
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