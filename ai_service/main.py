"""
Shriram Automobiles - AI Intelligence Engine Microservice
FastAPI Application serving Two-Wheeler Automotive ML & Predictive Engines.
"""

import os
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from engine.maintenance import (
    MaintenanceRequest,
    MaintenanceRecommendationResponse,
    get_maintenance_recommendations,
)
from engine.parts_recommender import (
    PartsRecommendationRequest,
    PartsRecommendationResponse,
    recommend_parts,
)
from engine.predictive import (
    PredictiveMaintenanceRequest,
    PredictiveMaintenanceResponse,
    assess_predictive_maintenance,
)
from engine.forecasting import (
    PartDemandInput,
    InventoryForecastResponse,
    forecast_inventory,
)
from engine.customer_intelligence import (
    CustomerProfileInput,
    CustomerIntelligenceResponse,
    analyze_customer_intelligence,
)

app = FastAPI(
    title="Shriram Automobiles AI Engine",
    description="Automotive Intelligence, Spare-Part Recommendation, Predictive Maintenance & Inventory Demand Forecasting Microservice",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "shriram-ai-engine",
        "version": "1.0.0",
        "modules": [
            "Module 1: Vehicle Maintenance Recommendation",
            "Module 2: AI Spare-Part Recommendation",
            "Module 3: Predictive Maintenance",
            "Module 4: Inventory Demand Forecasting",
            "Module 5: Customer Intelligence",
        ],
    }

@app.post("/api/v1/recommend/maintenance", response_model=MaintenanceRecommendationResponse)
def endpoint_recommend_maintenance(req: MaintenanceRequest):
    try:
        return get_maintenance_recommendations(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate maintenance recommendations: {str(e)}")

@app.post("/api/v1/recommend/parts", response_model=PartsRecommendationResponse)
def endpoint_recommend_parts(req: PartsRecommendationRequest):
    try:
        return recommend_parts(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recommend spare parts: {str(e)}")

@app.post("/api/v1/predict/maintenance", response_model=PredictiveMaintenanceResponse)
def endpoint_predict_maintenance(req: PredictiveMaintenanceRequest):
    try:
        return assess_predictive_maintenance(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate predictive maintenance: {str(e)}")

@app.post("/api/v1/forecast/inventory", response_model=InventoryForecastResponse)
def endpoint_forecast_inventory(parts: List[PartDemandInput]):
    try:
        return forecast_inventory(parts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate inventory demand forecast: {str(e)}")

@app.post("/api/v1/intelligence/customers", response_model=CustomerIntelligenceResponse)
def endpoint_customer_intelligence(customers: List[CustomerProfileInput]):
    try:
        return analyze_customer_intelligence(customers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate customer intelligence: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", os.environ.get("AI_SERVICE_PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
