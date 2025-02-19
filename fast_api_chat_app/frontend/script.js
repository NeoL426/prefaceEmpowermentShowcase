let websocket = null;
let username = null;
let roomId = 1; // default room id im lazy
let widgetCounter = 0;
const priceHistory = {};

function login() {
    username = document.getElementById("username-input").value;
    if (username) {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("chat-section").style.display = "block";
        document.getElementById("room-name").innerText = "Room " + roomId; 
        connectWebSocket();
    } else {
        alert("Please enter a username.");
    }
}

function connectWebSocket() {
    websocket = new WebSocket(`ws://localhost:8000/ws/${roomId}`); // adjust url when need

    websocket.onopen = function() {
        console.log('WebSocket connection opened');
    };

    websocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
            appendChatMessage(data.username, data.content);
        } else if (data.type === 'widget_data') {
            if (data.widget_type === 'price_widget') {       // handle price stuff
                updatePriceWidget(data.ticker, data.price);
            } else if (data.widget_type === 'weather_widget') { // handle weather stuff
                updateWeatherWidget(data.city, data.weather);
            } else if (data.widget_type === 'ai_chat_widget') { // handle chat stuff
                updateAIChatWidget(data.response);
            }
        } else if (data.type === 'widget_error') {
            if (data.widget_type === 'price_widget') {
                displayWidgetError(data.ticker, data.error);
            }
        }
    };

    websocket.onclose = function() {
        console.log('WebSocket connection closed');
    };

    websocket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

function sendMessage() {
    const messageInput = document.getElementById("message-input");
    const content = messageInput.value.trim();

    if (content) {
        const message = {
            type: 'chat_message',
            username: username,
            content: content
        };
        websocket.send(JSON.stringify(message));


        if (content.startsWith("T@")) {
            const ticker = content.substring(2).toUpperCase();
            requestPriceWidget(ticker);
        } else if (content.startsWith("W@")) { 
            const city = content.substring(2).trim(); 
            requestWeatherWidget(city);
        } else if (content.startsWith("AI@")) { 
            const aiPrompt = content.substring(3).trim(); 
            requestAIChatWidget(aiPrompt);
        }

        messageInput.value = ''; 
    }
}

function requestPriceWidget(ticker) {
    const widgetRequest = {
        type: 'widget_request',
        widget_type: 'price_widget',
        widget_params: { ticker: ticker }
    };
    websocket.send(JSON.stringify(widgetRequest));
    createPriceWidgetContainer(ticker); 
}

function createPriceWidgetContainer(ticker) {
    const widgetArea = document.getElementById('widget-area');
    const widgetId = `price-widget-${widgetCounter++}`;
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'widget-container price-widget';
    widgetContainer.id = widgetId;
    widgetContainer.innerHTML = `
        <div class="widget-header">Price of ${ticker}</div>
        <div class="price-widget-value" id="${widgetId}-value">Loading...</div>
        <div class="widget-error" id="${widgetId}-error" style="color: red; display: none;"></div>
    `;
    widgetArea.appendChild(widgetContainer);
}


function updatePriceWidget(ticker, price) {
    const widgetId = `price-widget-${widgetCounter - 1}`;
    const priceValueElement = document.getElementById(`${widgetId}-value`);
    if (priceValueElement) {
        const currentPrice = parseFloat(price);
        let color = 'black';
        if (priceHistory[ticker] !== undefined) {
            const prevPrice = priceHistory[ticker];
            if (currentPrice > prevPrice) {
                color = 'green';
            } else if (currentPrice < prevPrice) {
                color = 'red';
            }
        }
        priceHistory[ticker] = currentPrice;
        priceValueElement.innerText = `$${currentPrice.toFixed(2)}`;
        priceValueElement.style.color = color;
        hideWidgetError(ticker); 
    }
}

function displayWidgetError(ticker, errorMessage) {
    const widgetId = `price-widget-${widgetCounter - 1}`;
    const errorElement = document.getElementById(`${widgetId}-error`);
    if (errorElement) {
        errorElement.innerText = errorMessage;
        errorElement.style.display = 'block';
    }
}

function hideWidgetError(ticker) {
    const widgetId = `price-widget-${widgetCounter - 1}`;
    const errorElement = document.getElementById(`${widgetId}-error`);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}


function requestWeatherWidget(city) {
    const widgetRequest = {
        type: 'widget_request',
        widget_type: 'weather_widget',
        widget_params: { city: city }
    };
    websocket.send(JSON.stringify(widgetRequest));
    createWeatherWidgetContainer(city); 
}


function createWeatherWidgetContainer(city) {
    const widgetArea = document.getElementById('widget-area');
    const widgetId = `weather-widget-${widgetCounter++}`;
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'widget-container weather-widget';
    widgetContainer.id = widgetId;
    widgetContainer.innerHTML = `
        <div class="widget-header">Weather in ${city}</div>
        <div id="${widgetId}-info">Loading...</div>
    `;
    widgetArea.appendChild(widgetContainer);
}

function updateWeatherWidget(city, weatherInfo) {
    const widgetId = `weather-widget-${widgetCounter - 1}`;
    const weatherInfoElement = document.getElementById(`${widgetId}-info`);
    if (weatherInfoElement) {
        const tempMatch = weatherInfo.match(/Temperature: ([\d.]+)°C/);
        if (tempMatch) {
            const temp = parseFloat(tempMatch[1]);
            if (temp > 20) {
                weatherInfoElement.style.color = 'orange';
            } else if (temp < 10) {
                weatherInfoElement.style.color = 'skyblue';
            } else {
                weatherInfoElement.style.color = 'black';
            }
        }
        weatherInfoElement.innerText = weatherInfo;
    }
}


function requestAIChatWidget(prompt) {
    const widgetRequest = {
        type: 'widget_request',
        widget_type: 'ai_chat_widget',
        widget_params: { prompt: prompt }
    };
    websocket.send(JSON.stringify(widgetRequest));
    createAIChatWidgetContainer(); 
}

function createAIChatWidgetContainer() {
    const widgetArea = document.getElementById('widget-area');
    const widgetId = `ai-chat-widget-${widgetCounter++}`;
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'widget-container ai-chat-widget';
    widgetContainer.id = widgetId;
    widgetContainer.innerHTML = `
        <div class="widget-header">AI Chat</div>
        <div id="${widgetId}-chat-log" class="h-32 overflow-y-scroll border p-2 mb-2 rounded bg-gray-50"></div>
        <input type="text" id="${widgetId}-input" placeholder="Type your message to AI" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
        <button onclick="sendAIChatMessage('${widgetId}')" class="mt-2 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Send to AI</button>
    `;
    widgetArea.appendChild(widgetContainer);
}

function sendAIChatMessage(widgetId) {
    const inputElement = document.getElementById(`${widgetId}-input`);
    const message = inputElement.value.trim();
    if (message) {
        const aiPrompt = message;
        requestAIChatWidgetResponse(aiPrompt, widgetId);
        inputElement.value = ''; 
        appendAIChatMessage(widgetId, "You", message);
    }
}

function requestAIChatWidgetResponse(prompt, widgetId) {
    const widgetRequest = {
        type: 'widget_request',
        widget_type: 'ai_chat_widget',
        widget_params: { prompt: prompt }
    };
    websocket.send(JSON.stringify(widgetRequest));
}


function updateAIChatWidget(response) {
    const widgetId = `ai-chat-widget-${widgetCounter - 1}`; 
    appendAIChatMessage(widgetId, "AI", response);
}

function appendChatMessage(sender, message) {
    const chatLog = document.getElementById('chat-log');
    const messageElement = document.createElement('p');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function appendAIChatMessage(widgetId, sender, message) {
    const chatLogElement = document.getElementById(`${widgetId}-chat-log`);
    const messageElement = document.createElement('p');
    messageElement.className = sender === "AI" ? 'ai-msg' : 'user-msg';
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatLogElement.appendChild(messageElement);
    chatLogElement.scrollTop = chatLogElement.scrollHeight;
}


document.getElementById("message-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});