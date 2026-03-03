from dataclasses import dataclass
import logging
from typing import List, TypedDict
from tortoise.models import Model
from tortoise.fields import CharField, IntField, ForeignKeyField

class Product(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)

    class Meta: # type: ignore
        table = "products"

    async def to_data(self)->'ProductData':
        self_links = await WorkshopAndProduct.filter(product=self.id)
        self_ws_ids = [link.id for link in self_links]

        workshops = await Workshop.all()
        self_workshops:List[WorkshopData] = [ws.to_data() for ws in workshops if ws.id in self_ws_ids]

        return ProductData(id = self.id, name = self.name, workshops = self_workshops)

class Workshop(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)
    address = CharField(max_length = 255, null=False)

    class Meta: # type: ignore
        table = "workshops"
    
    def to_data(self)->'WorkshopData':
        return WorkshopData(name=self.name, id=self.id, address=self.address)

class WorkshopAndProduct(Model):
    id = IntField(primary_key = True)
    product = ForeignKeyField(Product, related_name="Product.id")
    ws = ForeignKeyField(Workshop, related_name="Workshop.id")

    class Meta: # type: ignore
        table = "workshopsAndProducts"

@dataclass
class ProductData(TypedDict):
    id:int
    name:str
    workshops:List['WorkshopData']

@dataclass
class WorkshopData(TypedDict):
    id:int
    name:str
    address:str
