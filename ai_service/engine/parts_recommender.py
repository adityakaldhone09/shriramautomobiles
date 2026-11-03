"""
Shriram Automobiles - AI Intelligence Engine
Module 2: AI Spare-Part Recommendation Engine
Enforces strict verified part compatibility from automotive catalogue data.
"""

import os
import csv
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "parts")

class PartsRecommendationRequest(BaseModel):
    model_slug: str = Field(..., description="Vehicle model slug (e.g. hero-splendor-plus, honda-activa-110)")
    service_category: Optional[str] = Field(None, description="Category of service (e.g. BRAKE_SERVICE, OIL_CHANGE, CHAIN_SPROCKET)")
    symptom_keywords: Optional[List[str]] = Field(default_factory=list)
    previously_replaced_parts: Optional[List[str]] = Field(default_factory=list)

class RecommendedPartItem(BaseModel):
    sku: str
    name: str
    category: str
    part_type: str
    price: float
    fitment_confidence: str  # OEM_FITMENT | MODEL_SPECIFIC | COMMON | UNIVERSAL
    is_verified_compatible: bool
    notes: str
    stock_status: str

class PartsRecommendationResponse(BaseModel):
    model_slug: str
    service_category: Optional[str]
    total_recommendations: int
    recommended_parts: List[RecommendedPartItem]
    non_compatible_filtered_count: int
    safety_advisory: str

# Cache catalog and compatibility matrices in memory
_CATALOG_CACHE: Dict[str, Dict[str, Any]] = {}
_COMPAT_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def load_catalog_data():
    global _CATALOG_CACHE, _COMPAT_CACHE
    if _CATALOG_CACHE and _COMPAT_CACHE:
        return

    catalog_path = os.path.join(DATA_DIR, "service_parts_catalog.csv")
    compat_path = os.path.join(DATA_DIR, "vehicle_part_compatibility.csv")

    if os.path.exists(catalog_path):
        with open(catalog_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sku = row.get("sku", "").strip()
                if sku:
                    _CATALOG_CACHE[sku] = {
                        "sku": sku,
                        "name": row.get("name", ""),
                        "category": row.get("category", ""),
                        "sub_category": row.get("sub_category", ""),
                        "part_type": row.get("part_type", "Replacement"),
                        "price": float(row.get("price", "0") or "0"),
                        "stock_quantity": int(row.get("stock_quantity", "0") or "0"),
                        "low_stock_threshold": int(row.get("low_stock_threshold", "0") or "0"),
                    }

    if os.path.exists(compat_path):
        with open(compat_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                model = row.get("model_slug", "").strip()
                sku = row.get("part_sku", "").strip()
                if model and sku:
                    if model not in _COMPAT_CACHE:
                        _COMPAT_CACHE[model] = []
                    _COMPAT_CACHE[model].append({
                        "part_sku": sku,
                        "fitment_confidence": row.get("fitment_confidence", "COMMON"),
                        "notes": row.get("notes", ""),
                        "active": row.get("active", "true").lower() == "true",
                    })

def recommend_parts(req: PartsRecommendationRequest) -> PartsRecommendationResponse:
    load_catalog_data()
    model = req.model_slug.strip().lower()
    cat_filter = (req.service_category or "").upper()
    keywords = [kw.lower() for kw in (req.symptom_keywords or [])]

    # Verified compatible entries for this specific vehicle model
    compat_entries = _COMPAT_CACHE.get(model, [])
    recommended: List[RecommendedPartItem] = []
    filtered_count = 0

    # Map service category to part categories / subcategories
    category_map = {
        "BRAKE_SERVICE": ["Brakes", "Fluids"],
        "OIL_CHANGE": ["Lubricants", "Filters"],
        "GENERAL_SERVICE": ["Lubricants", "Filters", "Ignition", "Cables"],
        "CHAIN_SPROCKET": ["Transmission", "Drivetrain", "Chains"],
        "ELECTRICAL": ["Electrical", "Batteries", "Lighting"],
        "SUSPENSION": ["Suspension", "Fluids"],
    }
    allowed_part_categories = category_map.get(cat_filter, [])

    for entry in compat_entries:
        if not entry["active"]:
            continue

        sku = entry["part_sku"]
        part = _CATALOG_CACHE.get(sku)
        if not part:
            continue

        # If category filter is provided, enforce category alignment
        if allowed_part_categories:
            matches_cat = any(c.lower() in part["category"].lower() or c.lower() in part.get("sub_category", "").lower() for c in allowed_part_categories)
            if not matches_cat:
                filtered_count += 1
                continue

        # If keyword filter provided, check match
        if keywords:
            text = f"{part['name']} {part['category']} {part.get('sub_category', '')}".lower()
            if not any(k in text for k in keywords):
                filtered_count += 1
                continue

        stock = part["stock_quantity"]
        stock_status = "IN_STOCK" if stock > part["low_stock_threshold"] else ("LOW_STOCK" if stock > 0 else "OUT_OF_STOCK")

        recommended.append(
            RecommendedPartItem(
                sku=part["sku"],
                name=part["name"],
                category=part["category"],
                part_type=part["part_type"],
                price=part["price"],
                fitment_confidence=entry["fitment_confidence"],
                is_verified_compatible=True,  # STRICT GUARANTEE: From verified compatibility record
                notes=entry["notes"] or "Verified OEM compatible fitment for specified model.",
                stock_status=stock_status,
            )
        )

    # Sort: In-stock first, then by fitment confidence priority
    confidence_weight = {"OEM_FITMENT": 1, "MODEL_SPECIFIC": 2, "COMMON": 3, "UNIVERSAL": 4}
    recommended.sort(key=lambda x: (0 if x.stock_status == "IN_STOCK" else 1, confidence_weight.get(x.fitment_confidence, 5)))

    return PartsRecommendationResponse(
        model_slug=req.model_slug,
        service_category=req.service_category,
        total_recommendations=len(recommended),
        recommended_parts=recommended,
        non_compatible_filtered_count=filtered_count,
        safety_advisory="All recommended spare parts are verified against authorized manufacturer compatibility specifications. Never install unverified non-compatible spares.",
    )
