import asyncio
import json
import websockets
import httpx  # Import httpx

async def fetch_binance_price(ticker: str):
    uri = f"wss://fstream.binance.com/stream?streams={ticker.lower()}@markPrice"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to Binance websocket. Listening for markPrice messages...")
            while True:
                data = await websocket.recv()
                data_json = json.loads(data)
                # Expected structure: {"stream": "...", "data": {"e": "markPriceUpdate", "P": "price", ...}}
                if 'data' in data_json and 'P' in data_json['data']:
                    mark_price = data_json['data']['P']
                    yield mark_price
    except Exception as e:
        print(f"Error fetching Binance price for {ticker}: {e}")
        yield None  # Indicate error in price stream

async def fetch_weather(city: str):
    api_key = "1acf62fdf2e85b6b9cc5920110d35486"  # This is my actual key please don't use 
    base_url = "https://api.openweathermap.org/data/2.5/weather"  
    params = {
        'q': city,
        'appid': api_key,
        'units': 'metric'  # metric = c, imperical = f
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(base_url, params=params)
            response.raise_for_status()  # bad response = error
            weather_data = response.json()
            if weather_data and weather_data.get('weather'):
                description = weather_data['weather'][0]['description']
                temperature = weather_data['main']['temp']
                return f"Weather in {city}: {description}, Temperature: {temperature}°C"
            else:
                return f"Could not retrieve weather data for {city}."
        except httpx.HTTPError as e:
            print(f"Error fetching weather for {city}: {e}")
            return f"Error fetching weather for {city}."

async def simple_ai_response(prompt: str):
    prompt = prompt.lower()    #LOCK IN AND REPLACE THIS B4 EXHIBITION
    if "hello" in prompt or "hi" in prompt:
        return "Hello there! How can I help you today?"
    elif "weather" in prompt:
        return "To get weather, use W@city_name (e.g., W@London)."
    elif "price" in prompt or "ticker" in prompt:
        return "To get a price widget, use T@TICKER (e.g., T@BTCUSDT)."
    elif "how are you" in prompt:
        return "I'm doing well, thanks for asking!"
    else:
        return "I'm a simple AI, I understand basic greetings, weather, and price requests. Try asking me something else!"
