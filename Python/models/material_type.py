from tortoise import Model
from tortoise.fields import CharField, IntField, FloatField

from models_data import MaterialTypeData


class MaterialType(Model):
    id = IntField(primary_key = True)
    m_type = CharField(max_length = 50, null=False)
    loss_persent = FloatField()

    class Meta: # type: ignore
        table = "material_type"

    def to_data(self)->MaterialTypeData:
        return MaterialTypeData(id=self.id, type=self.m_type, loss_persent=self.loss_persent)
    
    @classmethod
    def from_data(cls, data:MaterialTypeData)->'MaterialType':
        return cls(id = data["id"], m_type = data["type"], loss_persent = data["loss_persent"])