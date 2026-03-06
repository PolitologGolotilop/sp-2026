from tortoise import Model
from tortoise.fields import CharField, IntField

class WorkshopType(Model):
    id = IntField(primary_key = True)
    name = CharField(max_length = 100, null = False)

    class Meta: # type: ignore
        table = "workshop_type"