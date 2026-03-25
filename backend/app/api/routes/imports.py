from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.imports.service import ImportService

router = APIRouter()


@router.post('/imports/files')
async def upload_file(dataset_name: str | None = Form(default=None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await ImportService(db).create_import(file, dataset_name=dataset_name)


@router.get('/imports')
def list_imports(db: Session = Depends(get_db)):
    return ImportService(db).list_imports()


@router.get('/imports/{import_id}')
def get_import(import_id: str, db: Session = Depends(get_db)):
    return ImportService(db).get_import(import_id)


@router.get('/datasets')
def list_datasets(db: Session = Depends(get_db)):
    return ImportService(db).list_datasets()


@router.get('/datasets/{dataset_id}')
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    return ImportService(db).get_dataset(dataset_id)


@router.get('/datasets/{dataset_id}/preview')
def preview_dataset(dataset_id: str, db: Session = Depends(get_db)):
    return ImportService(db).preview_dataset(dataset_id)


@router.post('/datasets/{dataset_id}/normalize')
def normalize_dataset(dataset_id: str, db: Session = Depends(get_db)):
    return ImportService(db).normalize_dataset(dataset_id)
