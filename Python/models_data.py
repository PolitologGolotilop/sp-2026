from typing import List, TypedDict


class ProductTypeData(TypedDict):
    id:int
    type:str
    ratio:float

class MaterialTypeData(TypedDict):
    id:int
    type:str
    loss_persent:float

class WorkshopTypeData(TypedDict):
    id:int
    name:str
    
class ProductData(TypedDict):
    id:int
    name:str
    workshops:List['WorkshopData']
    production_type:ProductTypeData
    material_type:MaterialTypeData
    min_price:int
    article:str
    production_time:float

class WorkshopData(TypedDict):
    id:int
    name:str
    stuff_count:float
    material_type:str
