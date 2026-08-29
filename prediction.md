# Price prediction in KrishiFlow

## What the product shows

The **Price → Coming days** graph combines recent Maharashtra Agmarknet modal-price history with a seven-reporting-period forecast when the trained model is available. Past observations are solid; future values are dashed. The graph explicitly shows the model's final estimate when it is used.

The graph is **Maharashtra-wide**: its input history is the daily average across reporting Maharashtra mandis. It is not a forecast for the highest-paying mandi shown in the price header, nor a guaranteed future rate.

## Trained price model

| Item | Detail |
| --- | --- |
| Algorithm | XGBoost regressor (gradient-boosted trees) |
| Target | Modal mandi price, about 7 reporting periods ahead |
| Training data | Agmarknet daily mandi-price archive, 2023-06-06 through 2025-06-06 |
| Geography | Maharashtra only |
| Unit | The model predicts ₹/quintal internally; API and UI display ₹/kg |
| Trained crops | **Onion, Potato, Rice, Tomato, Wheat** |
| Inputs | Crop, optional market/district, recent price lags, 7/14-period rolling statistics, current min/max price range, and calendar fields |

`ai-engine/app/models/mandi_price_model.ubj` is the runtime model artifact. Its JSON metadata records the feature order and encoders. The original notebook and pickle are retained with the model files; the portable UBJ artifact is preferred to avoid pickle/version loading errors.

## How the chart is built

1. The backend fetches up to 21 recent Agmarknet daily observations for the selected crop and averages each reporting date across Maharashtra markets.
2. The AI engine evaluates the latest history and returns one safe 7-period-ahead model point.
3. The UI draws the last seven observations and joins the latest observation to that model point. Intermediate dashed values are a straight interpolation, **not seven separate daily model predictions**.
4. The uncertainty band widens by distance into the forecast. It is a display uncertainty band, not a calibrated prediction interval.

Refreshing the Prices screen now refreshes both the live-rate board and the model forecast, so the graph is not left on its prior client-side cache entry.

## When a model forecast is not shown

The UI deliberately falls back to a trend based on recent Agmarknet history if any of these are true:

- The selected crop is outside the five trained crops.
- There is no usable recent price history.
- The model artifact fails its load-time health check or the AI engine is unavailable.
- The model's implied seven-period change exceeds ±35%. This output is withheld rather than clamped, because it is likely outside the range the model learned.

The forecast note identifies whether the dashed line is model output or this fallback trend. The fallback should not be interpreted as ML output.

## Rule-based sell/hold guidance

The sell-or-wait card is separate from the trained price model. It is a transparent rule-based scorer using available weather and price momentum. It has hand-tuned crop-weather profiles for **Tomato, Onion, Potato, Rice, Wheat, Mango, Banana, Grapes, Soyabean, and Maize**. Other crops use a documented general weather profile.

The rule-based score may be blended with the trained model for the `/predict-price` point-price endpoint only when the model is healthy and has a valid prediction. The Coming days graph itself uses the model forecast endpoint and otherwise shows the labelled history trend.

## Combined suggestion and Gemini explanation

`GET /api/prices/sell-advice` returns the rule-based result, the trained forecast result, and a deterministic combined recommendation. A model move of at least 5% can soften `SELL_SOON` to `HOLD` when it predicts a rise, or soften `HOLD`/`HOLD_STRONG` to `SELL_SOON` when it predicts a fall. `SELL_NOW` is never overridden because crop-quality risk remains urgent.

When `GEMINI_API_KEY` is configured in `backend/.env`, Gemini receives only this computed fact set and produces a short explanation. The compact two-shot prompt requires JSON, limits reasons to three, prohibits new facts and prices, and prohibits changing the deterministic recommendation. If Gemini is unavailable (for example, quota is exhausted), a visibly labelled deterministic explanation is assembled from the same displayed rule/model inputs; it is not presented as Gemini output.

## Important limits

- Agmarknet reporting can be sparse and rates can vary widely by mandi, grade, variety, and day.
- The model has only Maharashtra coverage and five trained commodities; it should not be generalized to other crops or states.
- This is decision support, not a sale quote, price guarantee, or a substitute for confirming a buyer's offered rate.
- Model availability and crop coverage are returned by `/model-info`; `/api/prices/model-forecast` returns the chart series and clearly reports a reason when no model forecast can be published.
