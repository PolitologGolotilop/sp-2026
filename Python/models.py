import logging
from tortoise.models import Model
from tortoise.fields import CharField, IntField, ForeignKeyField, ReverseRelation, FloatField

from models_data import ProductData, WorkshopData, ProductTypeData, MaterialTypeData

class ProductType(Model):
    id = IntField(primary_key = True)
    p_type = CharField(max_length = 50, null=False)
    ratio = FloatField()

    class Meta: # type: ignore
        table = "production_type"
    
    def to_data(self)->ProductTypeData:
        return ProductTypeData(id=self.id, type=self.p_type, ratio=self.ratio)

class MaterialType(Model):
    id = IntField(primary_key = True)
    m_type = CharField(max_length = 50, null=False)
    loss_persent = FloatField()

    class Meta: # type: ignore
        table = "material_type"

    def to_data(self)->MaterialTypeData:
        return MaterialTypeData(id=self.id, type=self.m_type, loss_persent=self.loss_persent)

class WorkshopType(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 100, null = False)

    class Meta: # type: ignore
        table = "workshop_type"

class Product(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)
    ws2p = ReverseRelation["WS2P"]
    p_type = ForeignKeyField(
        to = ProductType,
        related_name="products",
        source_field="p_type"
    )
    m_type = ForeignKeyField(
        to = MaterialType,
        related_name="products",
        source_field="m_type"
    )
    min_partner_price = IntField()
    article = CharField(max_length=50)

    class Meta: # type: ignore
        table = "products"

    async def to_data(self)->'ProductData':
        await self.fetch_related("ws2p__ws")

        return ProductData(
            id = self.id, 
            name = self.name, 
            workshops = [await link.ws.to_data() for link in self.ws2p], # type: ignore
            production_type=(await self.p_type).to_data(), 
            material_type=(await self.m_type).to_data(),
            min_price = self.min_partner_price,
            article=self.article,
            production_time = sum([link.time_hours for link in self.ws2p]) # type: ignore
        )
         
    
    @classmethod
    def from_data(cls, data:'ProductData')->'Product':
        return cls(id=data['id'], name = data['name'])

class Workshop(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)
    stuff_count = IntField()
    ws_type = ForeignKeyField(
        to = WorkshopType,
        related_name="workshops",
        source_field = "ws_type"
    )

    class Meta: # type: ignore
        table = "workshops"
    
    async def to_data(self)->'WorkshopData':
        return WorkshopData(name=self.name, id=self.id, stuff_count=self.stuff_count, material_type=(await self.ws_type).name)

class WS2P(Model):
    id = IntField(primary_key = True)
    product = ForeignKeyField(Product, related_name="ws2p")
    ws = ForeignKeyField(Workshop, related_name="ws2p")
    time_hours = FloatField()

    class Meta: # type: ignore
        table = "workshopsAndProducts"