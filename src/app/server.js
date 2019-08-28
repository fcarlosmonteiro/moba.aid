const express = require('express')
const mongoose = require('mongoose')
const routes = require('./routes')
const cron = require('node-cron')
const cors = require('cors')

const server = express();

mongoose.connect('mongodb+srv://omnistack:omnistack@cluster0-yzrrb.mongodb.net/mobator?retryWrites=true&w=majority', {useNewUrlParser: true});

server.use(cors());
server.use(express.json())
server.use(routes)

cron.schedule("0 0 0 * * *", () => console.log("Executando a tarefa a cada 1 minuto"));

server.listen(3333)