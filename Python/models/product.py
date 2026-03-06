from models.workshop import Workshop
from models.material_type import MaterialType
from models.product_type import ProductType
from models_data import ProductGetData, ProductPatchData, ProductPostData
from tortoise import Model
from tortoise.fields import CharField, FloatField, ForeignKeyField, IntField, ReverseRelation

class Product(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 255, null=False)
    ws2p = ReverseRelation['WS2P']
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

    async def to_data(self)->ProductGetData:
        await self.fetch_related("ws2p__ws")

        return ProductGetData(
            id = self.id, 
            name = self.name, 
            workshops = [await link.ws.to_related_data(link.time_hours) for link in self.ws2p], # type: ignore
            production_type=(await self.p_type).to_data(), 
            material_type=(await self.m_type).to_data(),
            min_price = self.min_partner_price,
            article=self.article
        )
    
    @classmethod
    async def from_data(cls, data:ProductPatchData)->'Product':
        return cls(id=data['id'], 
                   name = data['name'], 
                   min_partner_price = data["min_price"], 
                   article = data["article"], 
                   p_type = await ProductType.get(id = data["production_type"]), 
                   m_type = await MaterialType.get(id = data["material_type"]))
    
    @classmethod
    async def insert_dict(cls, data:ProductPostData)->dict:
        product_type = await ProductType.get(id=data["production_type"])
        material_type = await MaterialType.get(id=data["material_type"])

        product_dict = {
            "name": data["name"],
            "article": data["article"],
            "p_type": product_type,
            "m_type": material_type,
            "min_partner_price": data["min_price"]
        }

        return product_dict

class WS2P(Model):
    id = IntField(primary_key = True)
    product = ForeignKeyField(Product, related_name="ws2p")
    ws = ForeignKeyField(Workshop, related_name="ws2p")
    time_hours = FloatField()

    class Meta: # type: ignore
        table = "workshopsAndProducts"