const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const path = require('path');
const cors = require('cors')
const app = express();
const PORT = process.env.PORT || 9091
const routes = require('./routes/api')
mongoose.connect('mongodb+srv://CW2B2:MegaMindy@cluster0.q0h5f.mongodb.net/personeelsinfo?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);
mongoose.connection.on('connected',()=>{
  console.log('Mongoose is connected')
});
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors({origin: true, credentials: true}));
app.use(morgan('tiny'));
app.use('/api',routes);
app.listen(PORT, console.log(`Server is starting at ${PORT}`));