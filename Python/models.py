from dataclasses import dataclass
import logging
from typing import List, TypedDict
from tortoise.models import Model
from tortoise.fields import CharField, IntField, ForeignKeyField, ReverseRelation, ManyToManyField

class Product(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)
    workshops = ManyToManyField(
        to = 'models.Workshop',
        related_name="products",
        through="workshopsAndProducts",
        forward_key="ws_id",
        backward_key="product_id"
    )

    class Meta: # type: ignore
        table = "products"

    async def to_data(self)->'ProductData':
        return ProductData(id = self.id, name = self.name, workshops = [ws.to_data() for ws in await self.workshops.all()])
    
    @classmethod
    def from_data(cls, data:'ProductData')->'Product':
        return cls(id=data['id'], name = data['name'])

class Workshop(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)
    address = CharField(max_length = 255, null=False)

    class Meta: # type: ignore
        table = "workshops"
    
    def to_data(self)->'WorkshopData':
        return WorkshopData(name=self.name, id=self.id, address=self.address)

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
