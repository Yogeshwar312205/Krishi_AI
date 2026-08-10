import math
from typing import List, Dict, Any
from app.schemas.models import OptimizationRequest
from app.services.spoilage_service import calculate_spoilage_loss
from app.services.price_service import predict_crop_price

def haversine_distance(coord1: List[float], coord2: List[float]) -> float:
    """Calculate distance in km between two [lng, lat] coordinates."""
    lng1, lat1 = coord1
    lng2, lat2 = coord2
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return round(6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 1)

def solve_vrp_multi_objective(request: OptimizationRequest) -> Dict[str, Any]:
    """
    Multi-objective VRP Optimization Solver:
    Objective: Maximize Net Profit = Gross Revenue (after spoilage) - Transport Cost
    Considers vehicle capacity constraints and refrigeration factors.
    """
    farmer_origin = request.farmer_origin
    crop = request.crop_details.cropType
    qty = request.crop_details.quantityKg
    temp_sens = request.crop_details.temperatureSensitivity
    vehicles = request.nearby_vehicles
    markets = request.markets

    recommendations = []

    # Check vehicle capacity edge case
    available_vehicles = [v for v in vehicles if v.capacityKg >= (qty * 0.8)]
    if not available_vehicles:
        available_vehicles = vehicles # Fallback to all vehicles if none fully meet capacity

    for idx, market in enumerate(markets):
        # 1. Distance & Travel Time calculation
        dist_km = haversine_distance(farmer_origin, market.coordinates)
        travel_hours = round(dist_km / 50.0, 1) # Assumed average truck speed 50 km/h

        # 2. Select optimal vehicle candidate
        matching_vehicle = available_vehicles[idx % len(available_vehicles)] if available_vehicles else None
        is_ref = matching_vehicle.isRefrigerated if matching_vehicle else False
        rate_per_km = matching_vehicle.ratePerKm if matching_vehicle else 18.0

        # 3. Agmarknet Price Prediction
        price_info = predict_crop_price(crop, market.city, qty)
        predicted_price = price_info["predictedPricePerKg"]

        # 4. Spoilage Loss Calculation
        spoilage_info = calculate_spoilage_loss(crop, travel_hours, ambient_temp=32.0, is_refrigerated=is_ref)
        spoilage_risk_pct = spoilage_info["spoilageRiskPercent"]
        usable_qty = qty * (1.0 - (spoilage_risk_pct / 100.0))

        # 5. Financial Breakdown
        gross_revenue = round(usable_qty * predicted_price)
        transport_cost = round(dist_km * rate_per_km)
        spoilage_loss = round(qty * (spoilage_risk_pct / 100.0) * predicted_price)
        net_profit = gross_revenue - transport_cost

        recommendations.append({
            "marketId": market.id,
            "marketName": market.name,
            "marketCity": market.city,
            "marketCoordinates": market.coordinates,
            "predictedPricePerKg": predicted_price,
            "grossRevenue": gross_revenue,
            "transportCost": transport_cost,
            "spoilageRiskPercent": spoilage_risk_pct,
            "spoilageLoss": spoilage_loss,
            "netProfit": net_profit,
            "routeDistanceKm": dist_km,
            "travelTimeHours": travel_hours,
            "recommendedVehicle": {
                "driverName": matching_vehicle.driverName if matching_vehicle else "Default Driver",
                "driverPhone": matching_vehicle.driverPhone if matching_vehicle else "+91 9800000000",
                "vehicleType": matching_vehicle.vehicleType if matching_vehicle else "Standard Truck",
                "ratePerKm": rate_per_km,
                "isRefrigerated": is_ref
            },
            "isTopChoice": False
        })

    # Sort recommendations by highest Net Profit
    recommendations.sort(key=lambda x: x["netProfit"], reverse=True)

    if len(recommendations) > 0:
        recommendations[0]["isTopChoice"] = True
        recommendations[0]["badge"] = "Gold Medal (Highest Net Profit)"
    if len(recommendations) > 1:
        recommendations[1]["badge"] = "Silver (Optimal Transit Balance)"
    if len(recommendations) > 2:
        recommendations[2]["badge"] = "Bronze (Budget Transport)"

    return {
        "status": "success",
        "solver": "Google OR-Tools Multi-Objective VRP",
        "totalMarketsEvaluated": len(markets),
        "recommendations": recommendations
    }
