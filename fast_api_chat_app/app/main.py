import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import db
import websocket_manager
import widgets
from db import get_db
import asyncio

app = FastAPI()
app.mount("/frontend", StaticFiles(directory="../frontend"), name="frontend") 

@app.get("/")
async def get():
    with open("../frontend/index.html", "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)




@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, session: Session = Depends(get_db)):
    await websocket_manager.manager.connect(websocket, room_id)
    user = None  
    try:
        while True:
            json_data = await websocket.receive_text()
            data = json.loads(json_data)
            message_type = data.get('type')

            if message_type == 'chat_message':
                username = data.get('username')
                content = data.get('content')

                if not username:
                    await websocket_manager.manager.send_personal_message("Username is required for chat messages.", websocket)
                    continue
                if user is None or user.username != username:  
                    user_exists = session.query(db.User).filter(db.User.username == username).first()
                    if not user_exists:
                        user = db.User(username=username)
                        session.add(user)
                        session.commit()
                    else:
                        user = user_exists

                message_db = db.Message(content=content, room_id=room_id, author=user)
                session.add(message_db)
                session.commit()

                formatted_message = {"type": "chat_message", "username": username, "content": content}
                await websocket_manager.manager.broadcast(json.dumps(formatted_message), room_id)
            elif message_type == 'widget_request':
                widget_type = data.get('widget_type')
                widget_params = data.get('widget_params', {})

                if widget_type == 'price_widget':
                    ticker = widget_params.get('ticker')
                    if ticker:
                        async def price_stream_handler(current_websocket, current_ticker):
                            async for price in widgets.fetch_binance_price(current_ticker):
                                if price is not None:
                                    price_message = {"type": "widget_data", "widget_type": "price_widget", "ticker": current_ticker, "price": price}
                                    await websocket_manager.manager.send_personal_message(json.dumps(price_message), current_websocket)
                                else:
                                    error_message = {"type": "widget_error", "widget_type": "price_widget", "ticker": current_ticker, "error": "Could not retrieve price data."}
                                    await websocket_manager.manager.send_personal_message(json.dumps(error_message), current_websocket)
                                    break
                            print(f"Price stream for {current_ticker} ended.")
                        asyncio.create_task(price_stream_handler(websocket, ticker))
                elif widget_type == 'weather_widget':
                    city = widget_params.get('city')
                    if city:
                        async def weather_handler(current_websocket, current_city):
                            weather_info = await widgets.fetch_weather(current_city)
                            weather_message = {"type": "widget_data", "widget_type": "weather_widget",
                                               "city": current_city, "weather": weather_info}
                            await websocket_manager.manager.send_personal_message(json.dumps(weather_message), current_websocket)
                        asyncio.create_task(weather_handler(websocket, city))
    except WebSocketDisconnect:
        websocket_manager.manager.disconnect(websocket, room_id)
        print(f"Client disconnected from room {room_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_manager.manager.disconnect(websocket, room_id) 


@app.post("/users/", response_model=None) 
async def create_user(username: str, session: Session = Depends(get_db)):
    db_user = db.User(username=username)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return {"message": "User created"}

@app.post("/chatrooms/", response_model=None)
async def create_chatroom(name: str, session: Session = Depends(get_db)):
    db_chatroom = db.ChatRoom(name=name)
    session.add(db_chatroom)
    session.commit()
    session.refresh(db_chatroom)
    return {"message": "Chatroom created"}

@app.get("/chatrooms/")
async def read_chatrooms(session: Session = Depends(get_db)):
    chatrooms = session.query(db.ChatRoom).all()
    return chatrooms


