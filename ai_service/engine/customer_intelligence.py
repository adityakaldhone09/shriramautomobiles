"""
Shriram Automobiles - AI Intelligence Engine
Module 5: Customer Intelligence & Retention Analytics
Segments customers, predicts churn risks, estimates CLV, and identifies periodic service due dates.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CustomerProfileInput(BaseModel):
    customer_id: int
    name: str
    phone: Optional[str] = None
    total_bookings: int = Field(default=0, ge=0)
    completed_bookings: int = Field(default=0, ge=0)
    total_spend: float = Field(default=0.0, ge=0.0)
    days_since_last_visit: Optional[int] = Field(None, ge=0)
    vehicles_count: int = Field(default=1, ge=0)

class CustomerSegmentItem(BaseModel):
    customer_id: int
    name: str
    phone: Optional[str]
    segment: str  # VIP | LOYAL_COMMUTER | REGULAR | AT_RISK | INACTIVE | NEW
    churn_risk_score: float  # 0.0 to 1.0
    churn_risk_label: str  # HIGH | MEDIUM | LOW
    estimated_clv: float  # Customer Lifetime Value in INR
    avg_ticket_size: float
    recommended_outreach: str
    outreach_priority: str  # URGENT | HIGH | NORMAL | LOW

class CustomerIntelligenceResponse(BaseModel):
    total_customers_analyzed: int
    vip_count: int
    at_risk_count: int
    inactive_count: int
    new_count: int
    avg_customer_lifetime_value: float
    customer_segments: List[CustomerSegmentItem]
    insights: List[str]

def analyze_customer_intelligence(customers: List[CustomerProfileInput]) -> CustomerIntelligenceResponse:
    results: List[CustomerSegmentItem] = []
    vip_c = 0
    at_risk_c = 0
    inactive_c = 0
    new_c = 0
    total_clv = 0.0

    for c in customers:
        spend = c.total_spend
        bookings = c.total_bookings
        completed = c.completed_bookings
        days_since = c.days_since_last_visit if c.days_since_last_visit is not None else 60
        avg_ticket = round(spend / max(1, completed), 2)

        # 1. Churn Risk Calculation
        # In Sangola, 2-wheelers typically require servicing every 90-120 days.
        if days_since < 75:
            churn_score = round(min(0.25, days_since / 300.0), 2)
            churn_label = "LOW"
        elif days_since < 135:
            churn_score = round(0.30 + (days_since - 75) / 150.0, 2)
            churn_label = "MEDIUM"
        elif days_since < 210:
            churn_score = round(0.65 + (days_since - 135) / 250.0, 2)
            churn_label = "HIGH"
        else:
            churn_score = min(0.98, round(0.85 + (days_since - 210) / 500.0, 2))
            churn_label = "HIGH"

        # 2. Customer Segmentation
        if bookings <= 1 and days_since < 60:
            segment = "NEW"
            new_c += 1
            outreach = "Send welcome satisfaction follow-up and next service schedule reminder"
            priority = "NORMAL"
            expected_years = 2.0
        elif spend >= 8000 or completed >= 5:
            segment = "VIP"
            vip_c += 1
            if churn_label == "HIGH":
                outreach = "URGENT: VIP retention call from Workshop Manager with complimentary inspection offer"
                priority = "URGENT"
            else:
                outreach = "Priority bay booking privileges and exclusive spare parts discount alerts"
                priority = "NORMAL"
            expected_years = 4.0
        elif churn_label == "HIGH":
            if days_since > 210:
                segment = "INACTIVE"
                inactive_c += 1
                outreach = "Win-back campaign with seasonal monsoon/summer tune-up voucher"
                priority = "LOW"
                expected_years = 0.5
            else:
                segment = "AT_RISK"
                at_risk_c += 1
                outreach = "WhatsApp service reminder: Vehicle due for periodic maintenance and safety check"
                priority = "HIGH"
                expected_years = 1.5
        elif completed >= 2:
            segment = "REGULAR"
            outreach = "Standard periodic maintenance reminder at 90-day mark"
            priority = "NORMAL"
            expected_years = 2.5
        else:
            segment = "REGULAR"
            outreach = "Periodic service check-in"
            priority = "NORMAL"
            expected_years = 1.5

        # 3. Customer Lifetime Value (CLV)
        # Annualized spend estimate based on visit cadence * expected active retention years
        annual_visits = max(1.5, 365.0 / max(60, days_since))
        annual_spend = avg_ticket * annual_visits
        clv = round(annual_spend * expected_years, 2)
        total_clv += clv

        results.append(
            CustomerSegmentItem(
                customer_id=c.customer_id,
                name=c.name,
                phone=c.phone,
                segment=segment,
                churn_risk_score=churn_score,
                churn_risk_label=churn_label,
                estimated_clv=clv,
                avg_ticket_size=avg_ticket,
                recommended_outreach=outreach,
                outreach_priority=priority,
            )
        )

    # Sort results: High churn risk and VIPs first
    prio_order = {"URGENT": 0, "HIGH": 1, "NORMAL": 2, "LOW": 3}
    results.sort(key=lambda x: (prio_order.get(x.outreach_priority, 4), -x.churn_risk_score))

    avg_clv = round(total_clv / max(1, len(results)), 2)

    insights = [
        f"Identified {vip_c} high-value VIP customers contributing significant workshop throughput.",
        f"{at_risk_c} customers are currently in the 'AT_RISK' churn window (>120 days since last service).",
        f"{inactive_c} inactive customers require targeted win-back campaign outreach.",
        f"Average projected Customer Lifetime Value across Sangola client base is Rs. {avg_clv:,.2f}.",
    ]

    return CustomerIntelligenceResponse(
        total_customers_analyzed=len(results),
        vip_count=vip_c,
        at_risk_count=at_risk_c,
        inactive_count=inactive_c,
        new_count=new_c,
        avg_customer_lifetime_value=avg_clv,
        customer_segments=results,
        insights=insights,
    )
