import { Router, type IRouter } from "express";
import { ListServicesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const services = [
  { id: "general-service", name: "General Service", description: "Complete inspection and routine maintenance.", estimatedDuration: "2–3 hours", startingPrice: "From ₹699", icon: "wrench" },
  { id: "engine-repair", name: "Engine Repair", description: "Diagnosis and repair of engine-related problems.", estimatedDuration: "1–2 days", startingPrice: "From ₹1,499", icon: "gauge" },
  { id: "oil-change", name: "Oil Change", description: "Engine oil replacement and inspection.", estimatedDuration: "30–45 min", startingPrice: "From ₹399", icon: "droplets" },
  { id: "brake-service", name: "Brake Service", description: "Brake inspection, adjustment, and replacement.", estimatedDuration: "1–2 hours", startingPrice: "From ₹299", icon: "disc" },
  { id: "clutch-repair", name: "Clutch Repair", description: "Clutch inspection and repair.", estimatedDuration: "3–5 hours", startingPrice: "From ₹899", icon: "settings" },
  { id: "battery-replacement", name: "Battery Replacement", description: "Battery testing and replacement.", estimatedDuration: "30–45 min", startingPrice: "From ₹1,299", icon: "battery" },
  { id: "tyre-service", name: "Tyre Service", description: "Tyre inspection, replacement, and repair.", estimatedDuration: "1–2 hours", startingPrice: "From ₹199", icon: "circle" },
  { id: "chain-sprocket", name: "Chain & Sprocket", description: "Cleaning, adjustment, replacement, and maintenance.", estimatedDuration: "2–3 hours", startingPrice: "From ₹799", icon: "link" },
  { id: "electrical-repair", name: "Electrical Repair", description: "Lights, indicators, wiring, horn, and troubleshooting.", estimatedDuration: "1–3 hours", startingPrice: "From ₹299", icon: "zap" },
  { id: "suspension-repair", name: "Suspension Repair", description: "Fork and shock absorber inspection and repair.", estimatedDuration: "3–5 hours", startingPrice: "From ₹999", icon: "move" },
  { id: "accident-repair", name: "Accident Repair", description: "Repair and replacement of damaged components.", estimatedDuration: "2–7 days", startingPrice: "Inspection first", icon: "shield" },
  { id: "periodic-maintenance", name: "Periodic Maintenance", description: "Regular maintenance based on vehicle usage.", estimatedDuration: "2–4 hours", startingPrice: "From ₹899", icon: "calendar" },
];

router.get("/services", (_req, res) => {
  res.json(ListServicesResponse.parse(services));
});

export default router;