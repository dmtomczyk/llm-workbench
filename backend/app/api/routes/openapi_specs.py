from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.openapi.schemas import OpenAPISpecImportRequest, OpenAPISpecRead
from app.openapi.service import OpenAPIService

router = APIRouter()


@router.post('/openapi/specs/import', response_model=OpenAPISpecRead)
async def import_spec(payload: OpenAPISpecImportRequest, db: Session = Depends(get_db)):
    return await OpenAPIService(db).import_spec(payload)


@router.get('/openapi/specs', response_model=list[OpenAPISpecRead])
def list_specs(db: Session = Depends(get_db)):
    return OpenAPIService(db).list_specs()


@router.get('/openapi/specs/{spec_id}', response_model=OpenAPISpecRead)
def get_spec(spec_id: str, db: Session = Depends(get_db)):
    return OpenAPIService(db).get_spec(spec_id)


@router.get('/openapi/specs/{spec_id}/operations')
def get_operations(spec_id: str, db: Session = Depends(get_db)):
    return OpenAPIService(db).get_operations(spec_id)
