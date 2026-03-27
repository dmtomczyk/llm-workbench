from fastapi import APIRouter

from app.api.routes import audit, auth, automations, chat, connectors, health, import_recipes, imports, openapi_specs, plugins, providers, settings, templates, workbench, workflows

api_router = APIRouter()
api_router.include_router(health.router, tags=['health'])
api_router.include_router(auth.router, tags=['auth'])
api_router.include_router(settings.router, tags=['settings'])
api_router.include_router(plugins.router, tags=['plugins'])
api_router.include_router(providers.router, tags=['providers'])
api_router.include_router(chat.router, tags=['chat'])
api_router.include_router(imports.router, tags=['imports'])
api_router.include_router(import_recipes.router, tags=['import-recipes'])
api_router.include_router(templates.router, tags=['templates'])
api_router.include_router(workbench.router, tags=['workbench'])
api_router.include_router(workflows.router, tags=['workflows'])
api_router.include_router(automations.router, tags=['automations'])
api_router.include_router(openapi_specs.router, tags=['openapi'])
api_router.include_router(connectors.router, tags=['connectors'])
api_router.include_router(audit.router, tags=['audit'])
