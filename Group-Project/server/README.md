# Real-Time Chat Application

A modern real-time chat application built with HTML, CSS, JavaScript, Node.js, Socket.IO, and SQLite. Users can register with email, login with username, and chat with other users in real-time.

## 🎉 **Status: WORKING!**

✅ **Backend**: Node.js + Express + Socket.IO  
✅ **Database**: SQLite (local, no external dependencies)  
✅ **Frontend**: HTML + CSS + JavaScript  
✅ **Real-time messaging**: Socket.IO  
✅ **Authentication**: JWT + bcrypt  

## 🚀 **Quick Start**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open in browser:**
   ```
   http://localhost:5000
   ```

## ✨ **Features**

- 🔐 **User Authentication**
  - Register with email and username
  - Login with username and password
  - JWT token-based authentication
  - Secure password hashing with bcrypt

- 💬 **Real-time Chat**
  - User-to-user private messaging
  - Real-time message delivery
  - Message history persistence
  - Online user status

- 🎨 **Modern UI**
  - Beautiful gradient design
  - Responsive layout
  - Smooth animations
  - Mobile-friendly

- 💾 **Data Persistence**
  - SQLite database (local file)
  - User accounts and messages stored
  - No external database required

## 🛠 **Tech Stack**

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **SQLite3** - Local database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern design
- **JavaScript (ES6+)** - Interactivity
- **Socket.IO Client** - Real-time communication

## 📁 **Project Structure**

```
chat-app/
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styles
│   └── script.js       # JavaScript logic
├── server.js           # Node.js server
├── package.json        # Dependencies
├── chat.db            # SQLite database (created automatically)
└── README.md          # This file
```

## 🔧 **How to Use**

1. **Register a new account:**
   - Go to `http://localhost:5000`
   - Click "Register"
   - Enter username, email, and password
   - Click "Register"

2. **Login:**
   - Use your username and password
   - You'll be redirected to the chat interface

3. **Start chatting:**
   - Select a user from the sidebar
   - Type messages and press Enter or click Send
   - Messages are delivered in real-time!

## 🌐 **API Endpoints**

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user

### Users
- `GET /api/users` - Get all users (requires authentication)

### Messages
- `GET /api/messages/:receiver` - Get chat history (requires authentication)

### Socket.IO Events
- `join` - Join chat with username
- `private message` - Send private message
- `message sent` - Message sent confirmation

## 🗄 **Database Schema**

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 **Security Features**

- Password hashing with bcryptjs
- JWT token authentication
- Input validation and sanitization
- CORS configuration
- SQL injection prevention

## 📱 **Responsive Design**

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🚀 **Deployment**

This application can be easily deployed to:
- Heroku
- Vercel
- Railway
- Any Node.js hosting platform

## 🐛 **Troubleshooting**

If you encounter issues:

1. **Port already in use:**
   ```bash
   # Kill existing processes on port 5000
   taskkill /f /im node.exe
   ```

2. **Database issues:**
   - Delete `chat.db` file and restart server
   - Database will be recreated automatically

3. **Socket.IO connection issues:**
   - Check if server is running on port 5000
   - Ensure no firewall blocking the connection

## 📄 **License**

This project is licensed under the MIT License.

## 🤝 **Contributing**

Feel free to contribute by:
1. Forking the repository
2. Creating a feature branch
3. Making your changes
4. Submitting a pull request

---

**Enjoy chatting! 🎉**
