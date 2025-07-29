const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();



const app = express();
app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);

const focusRoutes = require('./routes/focus');
app.use('/api/focus', focusRoutes);

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

const journalRoutes = require('./routes/journal');
app.use('/api/journal', journalRoutes);



mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
