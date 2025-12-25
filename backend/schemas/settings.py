from pydantic import BaseModel

class SettingBase(BaseModel):
    key: str
    value: str

class SettingCreate(SettingBase):
    pass

class SettingUpdate(BaseModel):
    value: str

class Setting(SettingBase):
    id: int

    class Config:
        from_attributes = True
