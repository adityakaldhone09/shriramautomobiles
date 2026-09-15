# Dataset Guide

All raw CSV datasets are organized under `data/`:

```
data/
├── vehicles/
│   ├── vehicle_models.csv        # Comprehensive vehicle models, types, engine classes
│   ├── vehicle_brands.csv        # OEM brand master details
│   └── bike_details_source.csv   # Source bike technical specifications
│
├── parts/
│   ├── service_parts_catalog.csv # Spare parts catalog, SKUs, pricing, stock levels
│   └── vehicle_part_compatibility.csv # Vehicle-to-part compatibility mappings
│
├── services/
│   ├── service_packages.csv      # Standard service packages and pricing
│   └── service_symptom_map.csv   # Vehicle symptoms and troubleshooting mapping
│
├── helmets/
│   ├── helmet_brands.csv         # Helmet manufacturers (Vega, Steelbird, Studds, Axor)
│   ├── helmet_types.csv          # Helmet shell types
│   ├── helmet_products.csv       # Helmet products and base pricing
│   ├── helmet_variants.csv       # Color and finish variants
│   ├── helmet_sizes.csv          # Size charts (S, M, L, XL)
│   ├── helmet_size_mappings.csv  # Variant SKUs per size
│   ├── helmet_certifications.csv # ISI, DOT, ECE safety certifications
│   ├── helmet_sources.csv        # Distributor sourcing details
│   └── helmet_inventory.csv      # Stock by retail store and wholesale godown
│
├── seeds/                        # Automated database seed snapshots
└── processed/                    # Processed / transformed export datasets
```
