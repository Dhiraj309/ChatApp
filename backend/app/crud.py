from sqlalchemy.orm import Session
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def get_user_by_email(
        db: Session,
        email: str
):
    return db.query(User).filter(User.email == email).first()

def create_user(
        db: Session,
        email: str,
        passw: str
):
    hashed_passw = pwd_context.hash(passw)
    user = User(email=email, passw=hashed_passw)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def verify_pass(plain_pass, hash_pass):
    return pwd_context.verify(
        plain_pass,
        hash_pass
    )