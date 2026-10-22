const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// SQLite Database Setup
const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table with unique username and email
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Messages table to store chat history
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      receiver TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// JWT Secret Key - IMPORTANT: Change this in production
const JWT_SECRET = 'your-secret-key-change-this-in-production';

// Authentication Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register User endpoint
app.post('/api/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
      if (err) {
        console.error('Database error on registration:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        return res.status(400).json({ error: 'User with this email or username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hashedPassword], function(err) {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign({ username, email }, JWT_SECRET);

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: {
            username,
            email
          }
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User endpoint
app.post('/api/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error on login:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET);

      res.json({
        message: 'Login successful',
        token,
        user: {
          username: user.username,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (for chat list) endpoint
app.get('/api/users', authenticateToken, (req, res) => {
  const currentUsername = req.user.username;
  db.all('SELECT username FROM users WHERE username != ?', [currentUsername], (err, rows) => {
    if (err) {
      console.error('Database error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get chat history between two users endpoint
app.get('/api/messages/:receiver', authenticateToken, (req, res) => {
  const { receiver } = req.params;
  const sender = req.user.username;

  db.all(`SELECT * FROM messages 
          WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
          ORDER BY timestamp ASC`, 
    [sender, receiver, receiver, sender], (err, rows) => {
    if (err) {
      console.error('Database error fetching messages:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their username
  socket.on('join', (username) => {
    connectedUsers.set(socket.id, username);
    socket.username = username;
    console.log(`${username} joined the chat`);
    io.emit('user list update', Array.from(connectedUsers.values()));
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { receiver } = data;
    const sender = socket.username;
    
    if (!sender) return;
    
    const receiverSocketId = Array.from(connectedUsers.entries())
      .find(([id, username]) => username === receiver)?.[0];
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user typing', { sender });
    }
  });

  socket.on('stop typing', (data) => {
    const { receiver } = data;
    const sender = socket.username;
    
    if (!sender) return;
    
    const receiverSocketId = Array.from(connectedUsers.entries())
      .find(([id, username]) => username === receiver)?.[0];
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user stop typing', { sender });
    }
  });

  // Handle private messages
  socket.on('private message', (data) => {
    const { receiver, content } = data;
    const sender = socket.username;
    
    if (!sender) {
      socket.emit('error', 'User not authenticated');
      return;
    }
    
    if (!content || !content.trim()) {
      socket.emit('error', 'Message content cannot be empty');
      return;
    }
    
    db.run('INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)', 
      [sender, receiver, content.trim()], function(err) {
      if (err) {
        console.error('Error saving message:', err);
        socket.emit('error', 'Failed to save message');
        return;
      }
      
      const message = {
        id: this.lastID,
        sender,
        receiver,
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
      
      // Find receiver's socket if they are online
      const receiverSocketId = Array.from(connectedUsers.entries())
        .find(([id, username]) => username === receiver)?.[0];
      
      // Always emit to receiver if online (they will see it immediately)
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('private message received', message);
      }
      
      // Confirm message was saved to sender
      socket.emit('message sent', message);
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(`${socket.username} disconnected`);
      connectedUsers.delete(socket.id);
      io.emit('user list update', Array.from(connectedUsers.values()));
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1, () => {
      console.log(`Server running on port ${PORT + 1}`);
      console.log(`Open http://localhost:${PORT + 1} in your browser`);
    });
  } else {
    console.error('Server error:', err);
  }
});