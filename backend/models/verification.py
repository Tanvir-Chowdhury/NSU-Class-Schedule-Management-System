from sqlalchemy import Column, String, DateTime
from core.database import Base
from sqlalchemy.sql import func

class VerificationCode(Base):
    __tablename__ = "verification_codes"

    email = Column(String, primary_key=True, index=True)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
