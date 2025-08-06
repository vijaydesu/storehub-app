Casey Chatbot – React Chat Interface

This project is a responsive React-based chat interface for the Casey AI chatbot. The UI is structured around reusable components and follows a scalable architecture with Redux for global state management and SCSS for styling.

To begin, clone the repository and move into the project folder:

git clone https://github.com/your-username/casey-chatbot.git
cd casey-chatbot

Ensure you have Node.js installed, then install the project dependencies:

npm install

The project uses environment variables for configuration. Create a .env file in the root directory and add any required variables (such as the WebSocket endpoint or static user email).

To run the development server locally:

npm start

If you'd like to build the app for production:

npm run build

This will output a minified version of the app in the build directory, ready to be deployed to any static host or containerized backend.


Deploy to Cloudflare Worker -

