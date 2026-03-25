from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.templates.schemas import TemplateCreate, TemplateRead, TemplateUpdate
from app.templates.service import TemplateService

router = APIRouter()


@router.get('/templates', response_model=list[TemplateRead])
def list_templates(db: Session = Depends(get_db)):
    return TemplateService(db).list()


@router.post('/templates', response_model=TemplateRead)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db)):
    return TemplateService(db).create(payload)


@router.get('/templates/{template_id}', response_model=TemplateRead)
def get_template(template_id: str, db: Session = Depends(get_db)):
    return TemplateService(db).get(template_id)


@router.patch('/templates/{template_id}', response_model=TemplateRead)
def update_template(template_id: str, payload: TemplateUpdate, db: Session = Depends(get_db)):
    return TemplateService(db).update(template_id, payload)


@router.delete('/templates/{template_id}')
def delete_template(template_id: str, db: Session = Depends(get_db)):
    return TemplateService(db).delete(template_id)
