// server.js
// where your node app starts

// init project
const express = require('express');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
const fbTemplate = require('fb-message-builder');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const Map = require('es6-map');
const prettyjson = require('prettyjson');
const toSentence = require('underscore.string/toSentence');

app.use(bodyParser.json({type: 'application/json'}));

// This boilerplate uses Express, but feel free to use whatever libs or frameworks
// you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// Uncomment the below function to check the authenticity of the API.AI requests.
// See https://docs.api.ai/docs/webhook#section-authentication
/*app.post('/', function(req, res, next) {
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});
  
  // Throw an error if the request is not valid.
  if(assistant.isRequestFromApiAi(process.env.API_AI_SECRET_HEADER_KEY, 
                                  process.env.API_AI_SECRET_HEADER_VALUE)) {
    next();
  } else {
    console.log('Request failed validation - req.headers:', JSON.stringify(req.headers, null, 2));
    
    res.status(400).send('Invalid request');
  }
});*/

// Handle webhook requests
app.post('/', function(req, res, next) {
  // Log the request headers and body, to aide in debugging. You'll be able to view the
  // webhook requests coming from API.AI by clicking the Logs button the sidebar.
  logObject('Request headers: ', req.headers);
  logObject('Request body: ', req.body);
    
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});

  // Declare constants for your action and parameter names
  const FIND_ARTICLES_ACTION = 'findArticles';  // the action name from the API.AI intent
  const PUBLICATION_PARAMETER = 'publication';

  // Create functions to handle intents here
  function findArticles(assistant) {
    console.log('Handling action: ' + FIND_ARTICLES_ACTION);
    let publication = assistant.getArgument(PUBLICATION_PARAMETER);
    
    // Make an API call to fetch the current weather in the requested city.
    // See https://developer.yahoo.com/weather/
    let articlesRequestURL = "https://newsapi.org/v1/articles?source=" + encodeURIComponent(publication) +
        "&sortBy=top&apiKey=78eb75ef84b4424d9b549c16570553e3"
    console.log("URL: " + articlesRequestURL)
    request(articlesRequestURL, function(error, response) {
      if(error) {
        next(error);
      } else {        
        let body = JSON.parse(response.body);
        logObject('News API call response: ', body);
        
        // let units = body.query.results.channel.units.temperature == 'F' ? 'Fahrenheit' : 'Celsius';
        // let temperature = body.query.results.channel.item.condition.temp;
        let article = body.articles[0];
        let urlToImage = article.urlToImage;
        let description = article.description;
        let title = article.title;
        let url = article.url;
        
        let carousel = new fbTemplate.Generic();
        carousel.addBubble(formatText(title), formatText(description));
        carousel.addImage(urlToImage);
        //carousel.addButton("Read Article", url);
        // Respond to the user with the current temperature.
        console.log("Response returned: " + JSON.stringify(carousel.get()));
        assistant.tell(carousel.get());
        //assistant.tell("Read article here: " + url);
      }
    });
  }
  
  // Add handler functions to the action router
  let actionRouter = new Map();
  
  // The ASK_WEATHER_INTENT (findArticles) should map to the findArticles method
  actionRouter.set(FIND_ARTICLES_ACTION, findArticles);
  
  // Route requests to the proper handler functions via the action router
  assistant.handleRequest(actionRouter);
});

// Handle errors
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Pretty print objects for logging
function logObject(message, object, options) {
  console.log(message);
  console.log(prettyjson.render(object, options));
}

// Listen for requests
let server = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + server.address().port);
});

/**
 * Format text for Facebook messenger card
 * @param rawDescription: unformatted text, usually description
 * @returns text formatted without html entities and truncated to 80 characters
 */
function formatText(descriptionText) {
    if (descriptionText === undefined || descriptionText.length <= 0) {
        return undefined;
    }
    if (descriptionText.length > 80) {
        descriptionText = descriptionText.substring(0, 77) + "...";
    }
    //console.log("descriptionText: " + descriptionText);
    return descriptionText;
}

