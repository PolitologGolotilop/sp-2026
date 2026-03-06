import json
from typing import List
import webbrowser
from fastapi import FastAPI, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from tortoise.contrib.fastapi import register_tortoise
from tortoise import transactions
from tortoise.exceptions import DoesNotExist
import uvicorn
import logging
import sys
from threading import Thread
from models.material_type import MaterialType
from models.product import Product, WS2P
from models.product_type import ProductType
from models.workshop import Workshop
from models_data import ProductGetData, ProductPatchData, ProductPostData, ProductRelatedWorkshopPostData


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
    modules={'models': [
    'models.material_type',
    'models.product_type', 
    'models.product',
    'models.workshop_type',
    'models.workshop'
]}
)

app.mount("/www", StaticFiles(directory="www", check_dir=True))

templates = Jinja2Templates(directory="www/html")

def handled_error(msg:str)->JSONResponse:
    logging.error(f"⛔{msg}")
    return JSONResponse(msg, status_code=500)

@app.get("/", response_class=HTMLResponse)
async def index(request:Request)->HTMLResponse:
    return templates.TemplateResponse(request, "index.html")

@app.get("/product_types", response_class=JSONResponse)
async def get_product_types()->JSONResponse:
    db_types = await ProductType.all()

    return JSONResponse(json.dumps([type.to_data() for type in db_types]))

@app.get("/material_types", response_class=JSONResponse)
async def get_material_types()->JSONResponse:
    db_types = await MaterialType.all()

    return JSONResponse(json.dumps([type.to_data() for type in db_types]))

@app.get(PRODUCTS_API_PATH, response_class=JSONResponse)
async def get_products()->JSONResponse:
    try:
        db_products = await Product.all()
        data_list:List[ProductGetData] = []

        for product in db_products:
            data = await product.to_data()
            data_list.append(data)

        return JSONResponse(json.dumps(data_list))
    except Exception as e:
        logging.info(f"⛔Ошибка при получении списка продукции - {e}")
        return JSONResponse(status_code=500, content={"info":e})

@app.delete(f"{PRODUCTS_API_PATH}/{{id}}", response_class=JSONResponse)
async def delete_product(id:int)->JSONResponse:
    try:
        product = await Product.get(id=id)
    except DoesNotExist:
        return handled_error(f"Продукт с id {id} не представлен в базе данных")
    
    await product.delete()

    return JSONResponse({"status":"ok"})

async def drop_product_ws_links(product:Product):
    await WS2P.filter(product=product).delete()

async def create_product_ws_links(product:Product, links:List[ProductRelatedWorkshopPostData]):
    workshops = await Workshop.filter(id__in=[i["id"] for i in links])
    
    for ws in workshops:
        related_ws = next((i for i in links if i["id"]==ws.id))

        await WS2P.create(product = product, ws = ws, time_hours=related_ws["time"])

@transactions.atomic()
async def post_transaction(product:ProductPostData)->str:
    created = await Product.create(
        **(await Product.insert_dict(product))
    )

    await create_product_ws_links(created, product["workshops"])

    return json.dumps(await created.to_data())

@transactions.atomic()
async def patch_transaction(product:ProductPatchData)->str:
    await Product.filter(id=product["id"]).update(
        **(await Product.insert_dict(product))
    )

    updated = await Product.get(id = product["id"])

    await drop_product_ws_links(updated)

    await create_product_ws_links(updated, product["workshops"])

    return json.dumps(await updated.to_data())

@app.post(PRODUCTS_API_PATH, response_class=JSONResponse)
async def post_product(product:ProductPostData = Body(...))->JSONResponse:
    try:
        return JSONResponse(await post_transaction(product))
    except Exception as e:
        return handled_error(f"Ошибка при добавлении продукта: {e.with_traceback(None)}")

@app.patch(PRODUCTS_API_PATH, response_class=JSONResponse)
async def patch_product(product:ProductPatchData):
    try:
        return JSONResponse(await patch_transaction(product))
    except Exception as e:
        return handled_error(f"Ошибка при обновлении продукта: {e.with_traceback(None)}")

@app.get("/workshops", response_class=JSONResponse)
async def get_workshops()->JSONResponse:
    db_workshops = await Workshop.all()

    return JSONResponse(json.dumps([await ws.to_data() for ws in db_workshops]))

def open_browser():
    webbrowser.open("http://localhost:8000")

def launch(host:str = "127.0.0.1", port:int = 8000):
    Thread(target=open_browser).start()

    logging.info(f"Запуск приложения. Хост: {host} Порт:{port}")
    uvicorn.run(app, host = host, port = port)

if __name__=="__main__":
    launch()