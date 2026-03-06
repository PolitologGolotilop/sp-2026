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
    

class WorkshopData(TypedDict):
    id:int
    name:str
    stuff_count:float
    type:str

class Id(TypedDict):
    id:int

class WorkshopsGetList(TypedDict):
    workshops:List['ProductRelatedWorkshopGetData']

class WorkshopsPostList(TypedDict):
    workshops:List['ProductRelatedWorkshopPostData']

class ProductSelfData(TypedDict):
    name:str
    min_price:int
    article:str

class ProductGetData(ProductSelfData, Id, WorkshopsGetList):
    production_type:ProductTypeData
    material_type:MaterialTypeData

class ProductPostData(ProductSelfData, WorkshopsPostList):
    production_type:int
    material_type:int

class ProductPatchData(ProductPostData, Id):
    pass

class ProductRelatedWorkshopGetData(TypedDict):
    data:WorkshopData
    time:float

class ProductRelatedWorkshopPostData(TypedDict):
    id:int
    time:float
