import json
import webbrowser
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from tortoise.contrib.fastapi import register_tortoise
from tortoise.queryset import QuerySet
import uvicorn
import logging
import sys
import asyncio
from models import Product, Workshop
from threading import Thread


if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8') # type: ignore
    sys.stdout.reconfigure(encoding='utf-8') # type: ignore


logging.basicConfig(
    level=logging.DEBUG,
    format='%(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Явно указываем обновленный stdout
    ]
)

DB_URL = 'postgres://postgres:123@localhost:5432/SP2026'

app = FastAPI()

register_tortoise(
    app,
    db_url=DB_URL,
    modules={'models': ['models']}
)

app.mount("/www", StaticFiles(directory="www", check_dir=True))

templates = Jinja2Templates(directory="www/html")

@app.get("/", response_class=HTMLResponse)
async def index(request:Request)->HTMLResponse:
    return templates.TemplateResponse(request, "index.html")

@app.get("/products", response_class=JSONResponse)
async def get_products(request:Request)->JSONResponse:
    db_products = await Product.all()

    return JSONResponse(json.dumps([await product.to_data() for product in db_products]))

@app.get("/workshops", response_class=JSONResponse)
async def get_workshops(request:Request)->JSONResponse:
    db_workshops = await Workshop.all()

    return JSONResponse(json.dumps([ws.to_data() for ws in db_workshops]))

def open_browser():
    webbrowser.open("http://localhost:8000")

def launch(host:str = "127.0.0.1", port:int = 8000):
    Thread(target=open_browser).start()

    logging.info(f"Запуск приложения. Хост: {host} Порт:{port}")
    uvicorn.run(app, host = host, port = port)

if __name__=="__main__":
    launch()