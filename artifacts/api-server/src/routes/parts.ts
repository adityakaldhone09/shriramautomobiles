import { Router, type IRouter } from "express";
import { ListPartsQueryParams, ListPartsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const parts = [
  { id: "brake-pads", name: "Ceramic Brake Pads", category: "Braking System", brand: "Honda", vehicleTypes: ["Motorcycle", "Scooter"], description: "Reliable stopping power with low-dust compound.", availability: "In stock" },
  { id: "chain-kit", name: "Heavy Duty Chain Kit", category: "Transmission", brand: "Bajaj", vehicleTypes: ["Motorcycle"], description: "Chain and sprocket set for everyday riders.", availability: "In stock" },
  { id: "spark-plug", name: "Iridium Spark Plug", category: "Electrical Parts", brand: "NGK", vehicleTypes: ["Motorcycle", "Scooter", "Electric Scooter"], description: "Long-life plug for a smoother ignition.", availability: "Available to order" },
  { id: "air-filter", name: "Genuine Air Filter", category: "Engine Parts", brand: "TVS", vehicleTypes: ["Motorcycle", "Scooter"], description: "Clean airflow for dependable engine performance.", availability: "In stock" },
  { id: "scooter-tyre", name: "Tubeless City Tyre", category: "Tyres & Wheels", brand: "Yamaha", vehicleTypes: ["Scooter"], description: "Comfortable grip for daily city commutes.", availability: "Available to order" },
  { id: "battery", name: "Maintenance-Free Battery", category: "Electrical Parts", brand: "Hero MotoCorp", vehicleTypes: ["Motorcycle", "Scooter"], description: "Dependable starting power with a 24-month warranty.", availability: "In stock" },
  { id: "clutch-plates", name: "Clutch Plate Set", category: "Transmission", brand: "Royal Enfield", vehicleTypes: ["Motorcycle"], description: "Smooth engagement for confident shifting.", availability: "Available to order" },
  { id: "shock-absorber", name: "Rear Shock Absorber", category: "Suspension", brand: "Suzuki", vehicleTypes: ["Motorcycle", "Scooter"], description: "Restore comfort and stability on rough roads.", availability: "In stock" },
];

router.get("/parts", (req, res) => {
  const query = ListPartsQueryParams.parse(req.query);
  const search = query.search?.toLowerCase();
  const filtered = parts.filter((part) =>
    (!search || `${part.name} ${part.description} ${part.category}`.toLowerCase().includes(search)) &&
    (!query.brand || part.brand === query.brand) &&
    (!query.vehicleType || part.vehicleTypes.includes(query.vehicleType)) &&
    (!query.category || part.category === query.category),
  );
  res.json(ListPartsResponse.parse(filtered));
});

export default router;