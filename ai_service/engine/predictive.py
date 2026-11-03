"""
Shriram Automobiles - AI Intelligence Engine
Module 3: Predictive Maintenance & Mileage Threshold Engine
Calculates two-wheeler component wear rates, estimated maintenance windows, and failure probability scores.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PredictiveMaintenanceRequest(BaseModel):
    model: str = Field(..., description="Vehicle model")
    current_mileage: int = Field(..., ge=0, description="Current odometer reading")
    last_service_mileage: Optional[int] = Field(None, ge=0, description="Odometer reading at last recorded service")
    last_service_date: Optional[str] = Field(None, description="ISO date of last service (YYYY-MM-DD)")
    avg_monthly_km: Optional[int] = Field(600, ge=50, description="Estimated monthly riding distance (defaults to 600 km/mo)")

class ComponentWearAssessment(BaseModel):
    component: str
    threshold_km: int
    km_since_last_renewal: int
    wear_percentage: float
    wear_status: str  # NORMAL | MONITOR | ACTION_DUE | CRITICAL
    failure_probability: float
    recommended_action: str

class PredictiveMaintenanceResponse(BaseModel):
    model: str
    current_mileage: int
    overall_health_score: float  # 0 to 100
    predicted_maintenance_window_days: int
    estimated_service_due_date: str
    component_assessments: List[ComponentWearAssessment]
    primary_wear_drivers: List[str]
    confidence_score: float  # 0.0 to 1.0
    reasoning: str
    disclaimer: str

# Engineering thresholds for 2-wheeler components in Maharashtra road conditions
COMPONENT_THRESHOLDS = [
    {
        "component": "Engine Lubricating Oil",
        "threshold_km": 3500,
        "critical_limit": 4500,
        "action": "Drain and replace 4T engine oil with oil filter cleanup",
    },
    {
        "component": "Air Intake Filter",
        "threshold_km": 10000,
        "critical_limit": 12000,
        "action": "Replace air filter element to prevent fuel economy loss and cylinder bore wear",
    },
    {
        "component": "Spark Plug (Ignition)",
        "threshold_km": 12000,
        "critical_limit": 15000,
        "action": "Clean, regap or replace spark plug electrode",
    },
    {
        "component": "Front & Rear Brake Linings",
        "threshold_km": 8000,
        "critical_limit": 10000,
        "action": "Inspect brake pad/shoe friction material thickness and adjust lever play",
    },
    {
        "component": "Drive Chain & Sprocket Assembly",
        "threshold_km": 18000,
        "critical_limit": 22000,
        "action": "Measure drive chain elongation; replace complete chain-sprocket kit if worn",
    },
    {
        "component": "Front Fork Suspension Seals & Oil",
        "threshold_km": 20000,
        "critical_limit": 25000,
        "action": "Inspect stanchion oil seal weeping and refresh hydraulic fork oil",
    },
]

def assess_predictive_maintenance(req: PredictiveMaintenanceRequest) -> PredictiveMaintenanceResponse:
    current_km = req.current_mileage
    last_km = req.last_service_mileage if req.last_service_mileage is not None else max(0, current_km - 2500)
    delta_km = max(0, current_km - last_km)
    monthly_km = req.avg_monthly_km or 600
    daily_km = max(1.0, monthly_km / 30.0)

    assessments: List[ComponentWearAssessment] = []
    wear_percentages: List[float] = []
    urgent_drivers: List[str] = []

    for comp in COMPONENT_THRESHOLDS:
        # Determine effective distance traveled on this component
        # If component replacement history exists, we calculate modulo or threshold
        comp_dist = delta_km % comp["threshold_km"] if delta_km > comp["threshold_km"] else delta_km
        # Also account for total lifetime if no previous service record
        if req.last_service_mileage is None:
            comp_dist = current_km % comp["threshold_km"]

        ratio = comp_dist / float(comp["threshold_km"])
        wear_pct = min(100.0, round(ratio * 100.0, 1))
        wear_percentages.append(wear_pct)

        # Failure probability logistic wear curve estimation
        if wear_pct < 60.0:
            status = "NORMAL"
            prob = round(ratio * 0.15, 2)
        elif wear_pct < 85.0:
            status = "MONITOR"
            prob = round(0.15 + (ratio - 0.6) * 0.5, 2)
        elif wear_pct < 100.0:
            status = "ACTION_DUE"
            prob = round(0.50 + (ratio - 0.85) * 1.5, 2)
            urgent_drivers.append(comp["component"])
        else:
            status = "CRITICAL"
            prob = min(0.95, round(0.80 + (comp_dist - comp["threshold_km"]) / float(comp["critical_limit"]) * 0.15, 2))
            urgent_drivers.append(comp["component"])

        assessments.append(
            ComponentWearAssessment(
                component=comp["component"],
                threshold_km=comp["threshold_km"],
                km_since_last_renewal=int(comp_dist),
                wear_percentage=wear_pct,
                wear_status=status,
                failure_probability=min(0.98, max(0.01, prob)),
                recommended_action=comp["action"],
            )
        )

    # Calculate overall health score (100 - average wear of components)
    avg_wear = sum(wear_percentages) / len(wear_percentages)
    health_score = max(10.0, round(100.0 - avg_wear, 1))

    # Predicted days until next service due based on the most worn component
    max_wear = max(wear_percentages)
    remaining_km_to_service = max(100, int((1.0 - (max_wear / 100.0)) * 3000))
    days_to_service = max(1, int(remaining_km_to_service / daily_km))

    now = datetime.now(timezone.utc)
    due_date = (now + timedelta(days=days_to_service)).strftime("%Y-%m-%d")

    # Dynamic confidence score based on data availability
    confidence = 0.85 if req.last_service_mileage is not None else 0.65

    reasoning = (
        f"Vehicle evaluated at {current_km} km with estimated daily usage of {daily_km:.1f} km/day. "
        + (f"Primary wear observed on: {', '.join(urgent_drivers)}. " if urgent_drivers else "All components within safe operational margins. ")
        + f"Maintenance projected in ~{days_to_service} days."
    )

    return PredictiveMaintenanceResponse(
        model=req.model,
        current_mileage=current_km,
        overall_health_score=health_score,
        predicted_maintenance_window_days=days_to_service,
        estimated_service_due_date=due_date,
        component_assessments=assessments,
        primary_wear_drivers=urgent_drivers,
        confidence_score=confidence,
        reasoning=reasoning,
        disclaimer="Probabilistic engineering wear model for preventive scheduling. Not a substitute for mechanical teardown and physical measurement.",
    )
