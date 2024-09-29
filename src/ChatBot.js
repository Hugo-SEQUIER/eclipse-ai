import React, { useState, useEffect } from 'react';
import { getResponse, getConversationTitle } from './aiChat/Chat.js'
import './ChatBot.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { GraphQLClient, gql } from 'graphql-request';
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption/decryption
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// Add these new functions for text embellishment
const formatDays = (text) => {
  return text.replace(/\*\*Day \d+:.*?\*\*/g, match => `\n\n## ${match}\n`);
};

const formatExercises = (text) => {
  return text.replace(/(\d+\.\s*[\w\s-]+:)/g, match => `\n**${match}**\n`);
};

const formatExerciseDetails = (text) => {
  return text.replace(/\*\s*([\w-]+):\s*(\d+(?:\s*sets?\s*of)?\s*\d+(?:\s*reps?)?)/g, 
    (_, exercise, details) => `  - *${exercise}:* ${details}`);
};

const addLineBreaks = (text) => {
  return text.replace(/(\d+\.\s*[\w\s-]+:.*?)(?=\d+\.|$)/gs, '$1\n');
};

// Add this new function for Markdown-to-HTML conversion
const convertMarkdownToHtml = (text) => {
  // Convert headers
  text = text.replace(/^## (.*$)/gim, '<h4>$1</h4>');
  text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');
  
  // Convert bold text
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic text
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert bullet points
  text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert line breaks
  text = text.replace(/\n/g, '<br>');
  
  return text;
};

const ChatBot = () => {
  const [conversations, setConversations] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const wallet = useWallet();
  const [publicKeyString, setPublicKeyString] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Define your secret key for encryption/decryption
  const SECRET_KEY = process.env.REACT_APP_SECRET_KEY;

  useEffect(() => {
    if (wallet.publicKey) {
      setPublicKeyString(wallet.publicKey.toString());
      fetchConversations(wallet.publicKey.toString());
    }
  }, [wallet.publicKey]);

  // Encryption helper function
  const encryptText = (text) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  };

  // Decryption helper function
  const decryptText = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return 'Decryption Error';
    }
  };

  const embellishText = (text) => {
    let embellishedText = text;
    embellishedText = formatDays(embellishedText);
    embellishedText = formatExercises(embellishedText);
    embellishedText = formatExerciseDetails(embellishedText);
    embellishedText = addLineBreaks(embellishedText);
    embellishedText = convertMarkdownToHtml(embellishedText);
    return embellishedText;
  };

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
        owners: [process.env.REACT_APP_PUBLIC_KEY],
        tags: [{ name: "address", values: [publicKey] }]
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
        console.log(data);

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

        console.log(fetchedConversations[data.idConversation]);
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
    // Removed modal opening as title is now auto-generated
  };

  const selectConversation = (id) => {
    setActiveConversationId(id);
  };

  const generateUniqueId = () => {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const uploadMetadata = async (metadata) => {
    try {
      console.log('Sending metadata:', metadata);
      const uploadResponse = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: metadata, 
          address: publicKeyString
        }),
      });

      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json();
        console.log('Metadata stored at:', url);
      } else {
        const errorData = await uploadResponse.json();
        console.error('Failed to store metadata:', errorData);
      }
    } catch (error) {
      console.error('Error storing metadata:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">Meta-Llama-3-1-8B-Instruct-FP8 - Chatbot</div>
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