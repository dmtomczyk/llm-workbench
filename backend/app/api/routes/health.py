from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()


@router.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok'}


@router.get('/version')
async def version() -> dict[str, str]:
    return {'version': '0.1.0', 'name': get_settings().app.name}
