from pydantic import BaseModel
from typing import List


class StockDataInputSchema(BaseModel):
    Date: str
    Open: float
    High: float
    Low: float
    Close: float
    Volume: int


class StockDataInputListSchema(BaseModel):
    data: List[StockDataInputSchema]
