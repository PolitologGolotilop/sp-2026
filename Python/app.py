import json
from typing import List
import webbrowser
from fastapi import FastAPI, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from tortoise.contrib.fastapi import register_tortoise
from tortoise import transactions
import uvicorn
import logging
import sys
from models import Product, ProductData, Workshop, WorkshopData
from threading import Thread


if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8') # type: ignore
    sys.stdout.reconfigure(encoding='utf-8') # type: ignore


logging.basicConfig(
    level=logging.DEBUG,
    format='%(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

DB_URL = 'postgres://postgres:123@localhost:5432/SP2026'
PRODUCTS_API_PATH = "/products"

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

@app.get(PRODUCTS_API_PATH, response_class=JSONResponse)
async def get_products(request:Request)->JSONResponse:
    db_products = await Product.all()
    data_list:List[ProductData] = []

    for product in db_products:
        data = await product.to_data()
        data_list.append(data)

    return JSONResponse(json.dumps(data_list))

@app.delete(PRODUCTS_API_PATH, response_class=JSONResponse)
async def delete_product(request:Request, product:str = Body(...))->JSONResponse:
    await Product.from_data(json.loads(product)).delete()

    return JSONResponse({"status":"ok"})

@app.post(PRODUCTS_API_PATH, response_class=JSONResponse)
async def add_product(request:Request, name:str = Body(...), workshops_ids:List[int] = Body(...))->JSONResponse:
    product = await Product.create(name = name)

    workshops = await Workshop.filter(id__in=await product.workshops.all())

    for ws in workshops_ids:
        await product.workshops.add(ws)
    
    return JSONResponse(json.dumps(await product.to_data()))

@transactions.atomic()
async def update_product_transaction(id:int, name:str, workshop_ids:List[int])->str:
    updated = await Product.get(id=await Product.filter(id=id).update(name=name))

    await updated.workshops.clear()

    workshops = await Workshop.filter(id__in=workshop_ids)
    
    for ws in workshops:
        await updated.workshops.add(ws)

    return json.dumps(await updated.to_data())


@app.patch(PRODUCTS_API_PATH, response_class=JSONResponse)
async def update_product_in_db(request:Request, id:int = Body(...), product:dict = Body(...))->JSONResponse:
    try:
        return JSONResponse(await update_product_transaction(id, product["name"], product["workshops_ids"]))
    except Exception as e:
        error_msg = f"Ошибка во время выполнения транзакции: {e.with_traceback(None)}"
        logging.error(error_msg)
        return JSONResponse(error_msg, status_code=500)

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