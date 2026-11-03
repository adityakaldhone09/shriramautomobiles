"""
Shriram Automobiles - AI Intelligence Engine
Module 4: Inventory Demand Forecasting
Computes baseline demand projections, exponential smoothing, reorder points, and stockout risks.
"""

from typing import List, Optional, Dict, Any
import numpy as np
from pydantic import BaseModel, Field

class PartDemandInput(BaseModel):
    part_id: int
    sku: str
    name: str
    current_stock: int = Field(..., ge=0)
    minimum_stock_level: int = Field(default=5, ge=0)
    lead_time_days: int = Field(default=7, ge=1)
    # Historical monthly or weekly consumption counts (most recent last)
    historical_consumption: List[float] = Field(default_factory=list)

class ForecastResultItem(BaseModel):
    part_id: int
    sku: str
    name: str
    current_stock: int
    daily_consumption_rate: float
    projected_30d_demand: float
    projected_60d_demand: float
    reorder_point: int
    recommended_reorder_qty: int
    days_until_stockout: int
    stockout_risk: str  # CRITICAL | HIGH | MODERATE | LOW
    excess_stock_risk: bool
    forecast_model: str
    mae: float
    wape: float

class InventoryForecastResponse(BaseModel):
    total_parts_analyzed: int
    critical_stockout_items: int
    high_stockout_items: int
    excess_inventory_items: int
    forecasts: List[ForecastResultItem]
    methodology: str

def exponential_smoothing(series: List[float], alpha: float = 0.3) -> List[float]:
    """Single Exponential Smoothing forecast."""
    if not series:
        return [0.0]
    result = [series[0]]
    for t in range(1, len(series)):
        val = alpha * series[t] + (1 - alpha) * result[-1]
        result.append(val)
    return result

def calculate_forecast_errors(actual: List[float], predicted: List[float]) -> tuple[float, float]:
    """Compute MAE and WAPE."""
    if len(actual) < 2 or len(predicted) < 2:
        return 0.0, 0.0
    # Align lengths
    min_len = min(len(actual), len(predicted))
    act = np.array(actual[:min_len], dtype=float)
    pred = np.array(predicted[:min_len], dtype=float)

    abs_errors = np.abs(act - pred)
    mae = float(np.mean(abs_errors))
    sum_act = float(np.sum(act))
    wape = float((np.sum(abs_errors) / sum_act) * 100.0) if sum_act > 0 else 0.0
    return round(mae, 2), round(wape, 2)

def forecast_inventory(parts: List[PartDemandInput]) -> InventoryForecastResponse:
    results: List[ForecastResultItem] = []
    critical_count = 0
    high_count = 0
    excess_count = 0

    for p in parts:
        history = p.historical_consumption
        if not history:
            # Fallback when zero history provided: assume minimal conservative baseline
            history = [max(1.0, float(p.minimum_stock_level) / 2.0)] * 3

        # Compute moving average & exponential smoothing
        smoothed = exponential_smoothing(history, alpha=0.35)
        mae, wape = calculate_forecast_errors(history, smoothed)

        # Baseline monthly projected demand from smoothed series
        monthly_demand = max(0.5, smoothed[-1])
        daily_rate = round(monthly_demand / 30.0, 2)

        proj_30d = round(monthly_demand, 1)
        proj_60d = round(monthly_demand * 2.0, 1)

        # Reorder Point (ROP) = (Daily Demand * Lead Time) + Safety Stock
        lead_time = p.lead_time_days
        safety_stock = p.minimum_stock_level
        rop = int(np.ceil((daily_rate * lead_time) + safety_stock))

        # Days until stockout
        current = p.current_stock
        days_stockout = int(current / daily_rate) if daily_rate > 0 else 999

        # Stockout Risk Categorization
        if days_stockout <= lead_time:
            risk = "CRITICAL"
            critical_count += 1
        elif days_stockout <= lead_time * 2:
            risk = "HIGH"
            high_count += 1
        elif days_stockout <= lead_time * 4:
            risk = "MODERATE"
        else:
            risk = "LOW"

        # Excess Stock Risk (holds > 180 days of demand)
        is_excess = days_stockout > 180 and current > 20
        if is_excess:
            excess_count += 1

        # Recommended Reorder Qty (Target = 45 days of supply)
        target_stock = int(np.ceil(daily_rate * 45)) + safety_stock
        recommended_reorder = max(0, target_stock - current) if current <= rop else 0

        results.append(
            ForecastResultItem(
                part_id=p.part_id,
                sku=p.sku,
                name=p.name,
                current_stock=current,
                daily_consumption_rate=daily_rate,
                projected_30d_demand=proj_30d,
                projected_60d_demand=proj_60d,
                reorder_point=rop,
                recommended_reorder_qty=recommended_reorder,
                days_until_stockout=days_stockout,
                stockout_risk=risk,
                excess_stock_risk=is_excess,
                forecast_model="Exponential Smoothing (alpha=0.35)",
                mae=mae,
                wape=wape,
            )
        )

    # Sort results: CRITICAL risk first, then HIGH, then ascending days until stockout
    risk_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
    results.sort(key=lambda x: (risk_order.get(x.stockout_risk, 4), x.days_until_stockout))

    return InventoryForecastResponse(
        total_parts_analyzed=len(results),
        critical_stockout_items=critical_count,
        high_stockout_items=high_count,
        excess_inventory_items=excess_count,
        forecasts=results,
        methodology="Adaptive Exponential Smoothing with Lead-Time Safety Buffering and WAPE evaluation.",
    )
