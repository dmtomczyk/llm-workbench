from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.schemas import AuditEventRead
from app.audit.service import AuditService
from app.db.session import get_db

router = APIRouter()


@router.get('/audit', response_model=list[AuditEventRead])
def list_audit(db: Session = Depends(get_db)):
    return AuditService(db).list()


@router.get('/audit/{audit_id}', response_model=AuditEventRead)
def get_audit(audit_id: str, db: Session = Depends(get_db)):
    row = AuditService(db).get(audit_id)
    if row is None:
        raise HTTPException(status_code=404, detail='Audit event not found')
    return row
