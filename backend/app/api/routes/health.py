from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()


@router.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok'}


@router.get('/version')
async def version() -> dict[str, str]:
    settings = get_settings()
    return {'version': '0.1.0', 'name': settings.app.name, 'short_name': settings.app.short_name}


@router.get('/about')
async def about() -> dict[str, object]:
    settings = get_settings()
    return {
        'name': settings.app.name,
        'short_name': settings.app.short_name,
        'acronym_expansion': settings.app.acronym_expansion,
        'tagline': settings.app.tagline,
        'description': settings.app.description,
        'version': '0.1.0',
        'environment': settings.app.env,
        'timezone': settings.app.timezone,
        'seededProviders': ['demo-mock', 'ollama-local'],
        'seededFeatures': ['chat', 'workbench', 'imports', 'connectors', 'audit'],
    }
