from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import predict, spoilage, optimize

app = FastAPI(
    title="KrishiFlow AI & VRP Logistics Optimization Engine",
    description="Python FastAPI engine powering Agmarknet price prediction, exponential perishability calculation, and Google OR-Tools multi-objective VRP solver.",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(predict.router, tags=["Price AI"])
app.include_router(spoilage.router, tags=["Spoilage Math"])
app.include_router(optimize.router, tags=["VRP Logistics"])

@app.get("/health")
def health_check():
    from app.services.forecast_model import model_info

    return {
        "status": "online",
        "engine": "FastAPI KrishiFlow AI Engine",
        # Honest inventory: rule-based / arithmetic services, plus one trained
        # model whose availability is reported live (see /model-info).
        "services": [
            "Static price table + rule-based context scorer (weather + demand/supply)",
            "XGBoost 7-period mandi price forecast (Maharashtra, 5 crops)",
            "Exponential (Q10) spoilage math",
            "Haversine market-ranking VRP",
        ],
        "priceModel": model_info(),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
