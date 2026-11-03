"""
Shriram Automobiles - AI Intelligence Engine
Module 1: AI Vehicle Maintenance Recommendation
Strictly based on manufacturer maintenance intervals and verified two-wheeler engineering rules.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class MaintenanceRequest(BaseModel):
    brand: str = Field(..., description="Vehicle brand (e.g. Hero, Honda, Bajaj, TVS, Yamaha, Royal Enfield)")
    model: str = Field(..., description="Vehicle model name")
    year: Optional[int] = Field(None, description="Manufacturing year")
    mileage: int = Field(..., ge=0, description="Current odometer reading in kilometers")
    previous_service_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    parts_replaced: Optional[List[str]] = Field(default_factory=list)
    customer_reported_problem: Optional[str] = Field(None, description="Reported symptom or issue description")

class MaintenanceRecommendationResponse(BaseModel):
    brand: str
    model: str
    mileage: int
    recommended_inspections: List[str]
    upcoming_maintenance: List[str]
    relevant_service_categories: List[str]
    possible_replacements: List[Dict[str, Any]]
    maintenance_priority: str  # URGENT | HIGH | MEDIUM | ROUTINE
    reasoning: str
    disclaimer: str

def get_maintenance_recommendations(req: MaintenanceRequest) -> MaintenanceRecommendationResponse:
    brand_norm = req.brand.strip().lower()
    mileage = req.mileage
    problem_text = (req.customer_reported_problem or "").lower()

    inspections: List[str] = []
    upcoming: List[str] = []
    categories: List[str] = []
    replacements: List[Dict[str, Any]] = []
    reasons: List[str] = []
    priority = "ROUTINE"

    # 1. Base Odometer Maintenance Intervals (Manufacturer Standard for Two-Wheelers in India)
    if mileage < 3000:
        inspections.extend([
            "Engine oil level and viscosity inspection",
            "Drive chain slack and lubrication check",
            "Front and rear brake lever play and shoe check",
            "Tire pressure and tread pattern inspection",
        ])
        upcoming.append("First minor periodic service (3,000 km oil change & carburetor/EFI tune)")
        categories.append("GENERAL_SERVICE")
        reasons.append(f"Vehicle at {mileage} km is within standard initial running-in interval.")
    elif mileage < 7000:
        inspections.extend([
            "Engine oil drain and flush inspection",
            "Air filter cleanliness check",
            "Spark plug gap and electrode condition",
            "Brake liner wear check",
            "Battery terminal voltage and electrolyte check",
        ])
        upcoming.append("Secondary periodic service (6,000 km oil renewal & spark plug clean)")
        categories.extend(["GENERAL_SERVICE", "OIL_CHANGE", "BRAKE_SERVICE"])
        replacements.append({"item": "4T 10W-30 / 20W-40 Synthetic Blend Engine Oil", "reason": "Recommended 3,000 - 5,000 km oil drain interval"})
        reasons.append(f"Vehicle reached {mileage} km: scheduled periodic oil renewal and intake inspection.")
    elif mileage < 15000:
        inspections.extend([
            "Engine oil and oil strainer screen cleaning",
            "Air filter replacement inspection (paper/sponge element)",
            "Drive chain link stretch and sprocket teeth profile wear",
            "Front disc brake pad thickness (minimum 2.0mm limit)",
            "Rear drum brake shoe wear indicator check",
            "Clutch cable free play and actuation smoothness",
        ])
        upcoming.append("Major periodic service (10,000 - 12,000 km comprehensive inspection)")
        categories.extend(["GENERAL_SERVICE", "BRAKE_SERVICE", "CHAIN_SPROCKET"])
        replacements.append({"item": "Air Filter Element", "reason": "Air filter standard 10,000 km replacement threshold"})
        replacements.append({"item": "Spark Plug (Resistor Type)", "reason": "Spark plug electrode erosion threshold (10,000 km)"})
        reasons.append(f"Odometer at {mileage} km requires critical consumable replacements to prevent fuel efficiency loss.")
        priority = "MEDIUM"
    elif mileage < 25000:
        inspections.extend([
            "Drive chain and front/rear sprocket wear inspection",
            "Front telescopic fork oil leak and seal degradation",
            "Wheel hub bearing play check",
            "Carburetor ultrasonic cleaning / EFI throttle body clean",
            "Steering handle cone-set bearing slack",
        ])
        upcoming.append("Mid-life drivetrain and suspension overhaul (15,000 - 20,000 km)")
        categories.extend(["CHAIN_SPROCKET", "SUSPENSION", "ENGINE"])
        replacements.append({"item": "Drive Chain & Sprocket Kit", "reason": "Standard wear life for high-stress Indian commuter chains (15,000 - 20,000 km)"})
        replacements.append({"item": "Front Fork Oil & Dust Seals", "reason": "Suspension damping deterioration at 20,000 km"})
        reasons.append(f"Vehicle odometer ({mileage} km) has reached the standard drive chain & fork maintenance window.")
        priority = "HIGH"
    else:
        inspections.extend([
            "Complete engine compression test and tappet clearance measurement",
            "Cylinder head decarb and valve seat leakage check",
            "Clutch plate friction lining thickness and clutch spring tension",
            "Front & rear wheel bearing renewal check",
            "Full electrical harness and stator coil output voltage",
        ])
        upcoming.append("Major engine and drivetrain longevity maintenance (>25,000 km)")
        categories.extend(["ENGINE", "CLUTCH", "ELECTRICAL", "BRAKE_SERVICE"])
        replacements.append({"item": "Clutch Friction Plate Assembly", "reason": "Commuter stop-and-go clutch plate wear threshold"})
        replacements.append({"item": "Wheel Hub Bearings (Front & Rear)", "reason": "Preventive bearing replacement for road safety"})
        reasons.append(f"Vehicle mileage ({mileage} km) warrants comprehensive high-mileage mechanical health diagnostics.")
        priority = "HIGH"

    # 2. Customer Reported Problem Symptom Mapping
    if "brake" in problem_text or "stopping" in problem_text or "lever" in problem_text:
        inspections.insert(0, "URGENT: Brake master cylinder, caliper piston, and brake pad/shoe inspection")
        categories.insert(0, "BRAKE_SERVICE")
        replacements.insert(0, {"item": "Brake Shoe / Brake Pad Kit", "reason": "Customer reported brake performance degradation"})
        priority = "URGENT"
        reasons.append("Reported symptom indicates safety-critical braking system compromise.")
    elif "pickup" in problem_text or "pulling" in problem_text or "acceleration" in problem_text or "power" in problem_text:
        inspections.insert(0, "Clutch slippage check, carburetor jet / injector clogging, spark intensity")
        categories.insert(0, "ENGINE")
        replacements.append({"item": "Spark Plug / Clutch Plates", "reason": "Low pickup resolution"})
        priority = "HIGH"
        reasons.append("Reported symptom indicates powertrain transmission or fuel-air combustion failure.")
    elif "noise" in problem_text or "rattle" in problem_text or "vibration" in problem_text:
        inspections.insert(0, "Engine tappet gap, timing chain tensioner, and drive chain slack inspection")
        categories.insert(0, "ENGINE")
        priority = "HIGH"
        reasons.append("Mechanical noise diagnosis required to prevent progressive internal engine wear.")
    elif "starting" in problem_text or "self" in problem_text or "kick" in problem_text:
        inspections.insert(0, "Battery terminal voltage test, starter relay check, spark plug spark test")
        categories.insert(0, "ELECTRICAL")
        priority = "HIGH"
        reasons.append("Starting system diagnosis: electrical and ignition circuit testing.")

    # Deduplicate categories and inspections while preserving order
    dedup_inspections = list(dict.fromkeys(inspections))
    dedup_categories = list(dict.fromkeys(categories))

    return MaintenanceRecommendationResponse(
        brand=req.brand,
        model=req.model,
        mileage=req.mileage,
        recommended_inspections=dedup_inspections,
        upcoming_maintenance=upcoming,
        relevant_service_categories=dedup_categories,
        possible_replacements=replacements,
        maintenance_priority=priority,
        reasoning="; ".join(reasons),
        disclaimer="Probabilistic recommendation based on OEM schedule and reported conditions. Must be physically verified by a certified mechanic before disassembly.",
    )

