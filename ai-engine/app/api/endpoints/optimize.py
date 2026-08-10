from fastapi import APIRouter
from app.schemas.models import OptimizationRequest
from app.services.vrp_service import solve_vrp_multi_objective

router = APIRouter()

@router.post("/optimize-route")
def optimize_route_endpoint(payload: OptimizationRequest):
    return solve_vrp_multi_objective(payload)
