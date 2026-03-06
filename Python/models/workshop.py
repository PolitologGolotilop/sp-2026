from tortoise import Model
from tortoise.fields import CharField, ForeignKeyField, IntField
from models.workshop_type import WorkshopType
from models_data import ProductRelatedWorkshopGetData, WorkshopData

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
        return WorkshopData(name=self.name, id=self.id, stuff_count=self.stuff_count, type=(await self.ws_type).name)
    
    async def to_related_data(self, time)->ProductRelatedWorkshopGetData:
        return ProductRelatedWorkshopGetData(data = await self.to_data(), time=time)