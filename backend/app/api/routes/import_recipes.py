from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.imports.recipes_service import ImportRecipeService
from app.imports.schemas import ImportRecipeCreate, ImportRecipePreviewRequest, ImportRecipePreviewResponse, ImportRecipeRead, ImportRecipeRunResponse, ImportRecipeUpdate, ImportRunRead, ImportRunsResponse

router = APIRouter()


@router.get('/import-recipes', response_model=list[ImportRecipeRead])
def list_import_recipes(db: Session = Depends(get_db)):
    return ImportRecipeService(db).list_recipes()


@router.post('/import-recipes', response_model=ImportRecipeRead)
def create_import_recipe(payload: ImportRecipeCreate, db: Session = Depends(get_db)):
    return ImportRecipeService(db).create_recipe(payload)


@router.get('/import-recipes/{recipe_id}', response_model=ImportRecipeRead)
def get_import_recipe(recipe_id: str, db: Session = Depends(get_db)):
    return ImportRecipeService(db).get_recipe(recipe_id)


@router.patch('/import-recipes/{recipe_id}', response_model=ImportRecipeRead)
def update_import_recipe(recipe_id: str, payload: ImportRecipeUpdate, db: Session = Depends(get_db)):
    return ImportRecipeService(db).update_recipe(recipe_id, payload)


@router.delete('/import-recipes/{recipe_id}')
def delete_import_recipe(recipe_id: str, db: Session = Depends(get_db)):
    return ImportRecipeService(db).delete_recipe(recipe_id)


@router.post('/import-recipes/preview', response_model=ImportRecipePreviewResponse)
async def preview_import_recipe(payload: ImportRecipePreviewRequest, db: Session = Depends(get_db)):
    return await ImportRecipeService(db).preview_recipe(payload)


@router.post('/import-recipes/{recipe_id}/run', response_model=ImportRecipeRunResponse)
async def run_import_recipe(recipe_id: str, file: UploadFile | None = File(default=None), db: Session = Depends(get_db)):
    return await ImportRecipeService(db).run_recipe(recipe_id, file)


@router.get('/import-recipes/{recipe_id}/runs', response_model=ImportRunsResponse)
def list_import_recipe_runs(recipe_id: str, db: Session = Depends(get_db)):
    return ImportRecipeService(db).list_runs(recipe_id)


@router.get('/import-runs/{run_id}', response_model=ImportRunRead)
def get_import_run(run_id: str, db: Session = Depends(get_db)):
    return ImportRecipeService(db).get_run(run_id)
