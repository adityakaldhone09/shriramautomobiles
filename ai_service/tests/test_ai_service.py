"""
Unit tests for Shriram Automobiles AI Engine Microservice
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert len(data["modules"]) == 5

def test_module1_maintenance_recommendation():
    payload = {
        "brand": "Hero",
        "model": "Splendor Plus",
        "mileage": 12500,
        "customer_reported_problem": "Brake is making screeching noise and lever feels spongy",
    }
    res = client.post("/api/v1/recommend/maintenance", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["brand"] == "Hero"
    assert data["mileage"] == 12500
    assert data["maintenance_priority"] == "URGENT"
    assert "BRAKE_SERVICE" in data["relevant_service_categories"]
    assert len(data["recommended_inspections"]) > 0
    assert len(data["possible_replacements"]) > 0
    assert "Must be physically verified" in data["disclaimer"]

def test_module2_parts_recommendation():
    payload = {
        "model_slug": "honda-activa-110",
        "service_category": "OIL_CHANGE",
    }
    res = client.post("/api/v1/recommend/parts", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["model_slug"] == "honda-activa-110"
    assert data["total_recommendations"] > 0
    for part in data["recommended_parts"]:
        assert part["is_verified_compatible"] is True

def test_module3_predictive_maintenance():
    payload = {
        "model": "Bajaj Pulsar 150",
        "current_mileage": 14200,
        "last_service_mileage": 10500,
        "avg_monthly_km": 700,
    }
    res = client.post("/api/v1/predict/maintenance", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["current_mileage"] == 14200
    assert 0 <= data["overall_health_score"] <= 100
    assert data["predicted_maintenance_window_days"] > 0
    assert len(data["component_assessments"]) == 6
    assert data["confidence_score"] > 0.0
    assert "Probabilistic engineering wear model" in data["disclaimer"]

def test_module4_inventory_forecast():
    payload = [
        {
            "part_id": 1,
            "sku": "PART-ENG-OIL-10W30",
            "name": "Engine Oil 4T 10W-30 (1L)",
            "current_stock": 4,
            "minimum_stock_level": 10,
            "lead_time_days": 5,
            "historical_consumption": [25, 28, 30, 32],
        },
        {
            "part_id": 2,
            "sku": "PART-AIR-FLT-COMM",
            "name": "Air Filter Commuter",
            "current_stock": 100,
            "minimum_stock_level": 8,
            "lead_time_days": 7,
            "historical_consumption": [5, 4, 6, 5],
        },
    ]
    res = client.post("/api/v1/forecast/inventory", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_parts_analyzed"] == 2
    # Part 1 has low stock (4) vs high consumption (30/mo) -> CRITICAL
    assert data["forecasts"][0]["stockout_risk"] in ["CRITICAL", "HIGH"]
    assert data["forecasts"][0]["recommended_reorder_qty"] > 0

def test_module5_customer_intelligence():
    payload = [
        {
            "customer_id": 101,
            "name": "Ramesh Pawar",
            "phone": "9876543210",
            "total_bookings": 6,
            "completed_bookings": 6,
            "total_spend": 12500,
            "days_since_last_visit": 45,
            "vehicles_count": 2,
        },
        {
            "customer_id": 102,
            "name": "Suresh Deshmukh",
            "phone": "9876543211",
            "total_bookings": 2,
            "completed_bookings": 2,
            "total_spend": 1800,
            "days_since_last_visit": 190,
            "vehicles_count": 1,
        },
    ]
    res = client.post("/api/v1/intelligence/customers", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_customers_analyzed"] == 2
    assert data["vip_count"] >= 1
    assert data["customer_segments"][0]["estimated_clv"] > 0
