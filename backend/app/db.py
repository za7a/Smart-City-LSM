import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/smartcity"), pool_pre_ping=True)
