import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["QDRANT_HOST"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from common.database import Base, get_db, engine

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test function."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def override_db(db_session):
    """Fixture to override get_db dependency in FastAPI apps."""
    def _get_db_override():
        try:
            yield db_session
        finally:
            pass
    return _get_db_override
