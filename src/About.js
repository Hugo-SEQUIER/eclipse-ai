import React from 'react';
import { Link } from 'react-router-dom';
import './About.css'; // Optional: For styling the About page

const About = () => {
  return (
    <div className="about-container">
      <h1>About This ChatBot</h1>
      <p>
        Welcome to the Meta-Llama-3-1-8B-Instruct-FP8 Chatbot! This application leverages advanced AI models to provide intelligent and responsive conversations.
      </p>
      
      <h2>What We Did</h2>
      <ul>
        <li>Integrated the Meta-Llama-3 AI model for robust conversational abilities.</li>
        <li>Implemented secure data encryption using CryptoJS to protect your conversations.</li>
        <li>Facilitated data storage and retrieval through the Irys platform.</li>
        <li>Enabled wallet connectivity using Eclipse's wallet adapter for secure transactions.</li>
        <li>Utilized Akash Network's API for chat completions.</li>
      </ul>
      
      <h2>How We Store and Retrieve Data</h2>
      <p>
        Your conversation data is securely stored and can be retrieved as follows:
      </p>
      <ol>
        <li>Connect your Eclipse wallet using the wallet button in the header.</li>
        <li>Your public key will be used to fetch all related conversations.</li>
        <li>We use GraphQL to retrieve data from the Irys network. Each storage item is associated with:
          <ul>
            <li>Owner: Your public wallet address</li>
            <li>Tag: A specific value (e.g., "address")</li>
          </ul>
        </li>
        <li>Conversations are encrypted using CryptoJS and decrypted automatically for your privacy.</li>
        <li>We use Irys to store data, with uploads less than 100 KiB being free.</li>
        <li>Metadata for each conversation is stored at: https://gateway.irys.xyz/transaction.id</li>
      </ol>

      <h3>GraphQL Query for Data Retrieval</h3>
      <pre><code className="language-javascript">
        {`const query = gql\`
        query($owners: [String!], $tags: [TagFilter!]) {
            transactions(owners: $owners, tags: $tags) {
            edges {
                node {
                id
                }
            }
            }
        }
        \`;

        const variables = {
            owners: [publicKey],
            tags: [{ name: "address", values: ["DJi9qeHDT5vpuLiKApVvPxfBa7UYdSkuMPPsZ97zxvSc"] }]
        };`}
      </code></pre>
      
      <h2>Technical Details</h2>
      <ul>
        <li>Chat API: We use the Akash Network API for chat completions at @https://chatapi.akash.network/api/v1/chat/completions</li>
        <li>Data Encryption: All data is encrypted using CryptoJS before storage.</li>
        <li>Storage: Irys platform is used for decentralized data storage.</li>
      </ul>
      
      <h2>Additional Information</h2>
      <p>
        For more detailed information, visit our <a href="https://trophe.net/" target="_blank" rel="noopener noreferrer">official website</a>.
      </p>

      {/* Link to go back to the chatbot */}
      <Link to="/" className="back-to-chat">Back to Chat</Link>
    </div>
  );
};

export default About;