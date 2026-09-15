# API Reference

The Shriram Automobiles API server exposes RESTful endpoints rooted at `/api`:

### 1. Authentication (`/api/auth`)
- `POST /register`: Register a new customer account.
- `POST /login`: Authenticate via phone or email and password.
- `POST /logout`: Clear active session cookie.
- `POST /refresh`: Refresh session token.
- `POST /forgot-password`: Send password reset token.
- `POST /reset-password`: Complete password reset with valid token.
- `GET /me`: Retrieve authenticated user profile.

### 2. Vehicles (`/api/vehicles`)
- `GET /brands`: List supported two-wheeler manufacturers.
- `GET /models`: List vehicle models (filter by `brandId`).
- `GET /my`: List current customer's registered vehicles.
- `POST /my`: Register a new bike in customer garage.

### 3. Parts Catalog (`/api/parts`)
- `GET /`: Search and list spare parts (filter by brand, category, search).
- `GET /categories`: List all spare part categories.
- `GET /compatible/:vehicleId`: List parts compatible with specific vehicle model.
- `GET /:id`: Get specific spare part details.

### 4. Service Booking & Intelligence (`/api/services`, `/api/bookings`, `/api/intelligence`)
- `GET /services`: List catalog services and packages.
- `GET /intelligence/symptoms`: List diagnostic vehicle symptoms.
- `GET /intelligence/recommendations`: AI-driven service & part recommendations based on symptoms.
- `POST /bookings`: Book a service appointment slot.
- `GET /bookings`: List booking requests.
- `GET /bookings/:id`: Retrieve booking details.

### 5. Shopping Cart & Orders (`/api/cart`, `/api/orders`)
- `GET /cart`: Retrieve user shopping cart.
- `POST /cart/items`: Add part to cart.
- `PATCH /cart/items/:id`: Update item quantity.
- `DELETE /cart/items/:id`: Remove item from cart.
- `POST /orders`: Place order (in-store pickup or local delivery).
- `GET /orders`: View customer order history.

### 6. Helmets (`/api/helmets`)
- `GET /brands`: List helmet brands.
- `GET /types`: List helmet types (Full Face, Open Face, etc.).
- `GET /`: List helmet products.
- `GET /:id`: Get helmet details and color/size variants.
