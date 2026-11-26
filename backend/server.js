const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

connectDB();
const app = express();

app.use(cors());              // la extensión hace fetch desde otro origen
app.use(express.json());

app.use('/api/users', require('./routes/usersRoutes'));
app.use('/api/sites', require('./routes/sitesRoutes'));
app.use('/api/usage', require('./routes/usageRoutes'));

app.use(errorHandler);
app.listen(process.env.PORT || 5000, () => console.log('Servidor iniciado'));