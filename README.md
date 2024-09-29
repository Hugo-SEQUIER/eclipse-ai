# Eclipse AI Chatbot

## Overview

Eclipse AI is an advanced chatbot application leveraging the Meta-Llama-3-1-8B-Instruct-FP8 model to provide intelligent and responsive conversations. This project combines cutting-edge AI technology with secure data storage and blockchain integration for a unique user experience.

## Features

- **Advanced AI Model**: Utilizes Meta-Llama-3 for robust conversational abilities.
- **Secure Data Encryption**: Implements CryptoJS for protecting user conversations.
- **Decentralized Storage**: Uses Irys platform for secure and decentralized data storage.
- **Blockchain Integration**: Enables wallet connectivity using Eclipse's wallet adapter.
- **Efficient API**: Leverages Akash Network's API for chat completions.

## Technical Stack

- **Frontend**: React.js
- **AI Model**: Meta-Llama-3-1-8B-Instruct-FP8
- **Blockchain**: Eclipse
- **Data Storage**: Irys
- **API**: Akash Network
- **Data Encryption**: CryptoJS
- **Data Retrieval**: GraphQL

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Eclipse wallet

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/eclipse-ai.git
   ```

2. Navigate to the project directory:
   ```
   cd eclipse-ai
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm start
   ```

## Usage

1. Connect your Eclipse wallet using the wallet button in the header.
2. Start a conversation with the AI chatbot.
3. Your conversations will be securely encrypted and stored on the Irys network.

## Data Storage and Retrieval

- Conversations are stored on the Irys network.
- Data is retrieved using GraphQL queries.
- Each storage item is associated with the user's public wallet address and tagged for easy retrieval.
- Uploads less than 100 KiB are free on the Irys network.

## Security

- All conversation data is encrypted using CryptoJS before storage.
- Decryption happens automatically when retrieving conversations.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

## Additional Information

For more detailed information, visit our [official website](https://trophe.net/).