from tortoise import Model
from tortoise.fields import CharField, IntField, FloatField
from models_data import ProductTypeData

class ProductType(Model):
    id = IntField(primary_key = True)
    p_type = CharField(max_length = 50, null=False)
    ratio = FloatField()

    class Meta: # type: ignore
        table = "production_type"
    
    def to_data(self)->ProductTypeData:
        return ProductTypeData(id=self.id, type=self.p_type, ratio=self.ratio)
    
    @classmethod
    def from_data(cls, data:ProductTypeData)->'ProductType':
        return cls(id = data["id"], p_type = data["type"], ratio = data["ratio"])
    