const express = require('express')
const mongoose = require('mongoose')
const routes = require('./routes')
const cron = require('node-cron')
const cors = require('cors')
const puppeteer = require('puppeteer');
const $ = require('cheerio');

const server = express();
const crawlerURL = "https://u.gg/lol/tier-list";

mongoose.connect('mongodb+srv://omnistack:omnistack@cluster0-yzrrb.mongodb.net/mobator?retryWrites=true&w=majority', {useNewUrlParser: true});

server.use(cors());
server.use(express.json())
server.use(routes)

puppeteer
  .launch()
  .then(function(browser) {
    return browser.newPage();
  })
  .then(function(page) {
    return page.goto(crawlerURL).then(function() {
      return page.content();
    });
  })
  .then(function(html) {
    // $('.rt-tbody .rt-tr -odd', html).each(function() {
      
      let champion = $('.champion-played .champion-name', html).text();
      let winrate = $('.winrate span b', html).text();

      console.log(champion);
      console.log(winrate);
    // });
  })
  .catch(function(err) {
    console.log(err);
  });

cron.schedule("0 0 0 * * *", () => console.log("Executou!"));

server.listen(3030)