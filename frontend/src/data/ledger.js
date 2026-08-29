/**
 * Realized economics for a finished haul, and the running totals a farmer,
 * fleet owner or buyer sees when they look back at what actually happened.
 *
 * Nothing here fetches. It derives from the PickupRequest records already
 * loaded by useMyRequests / fetchDispatchQueue / fetchBuyerInbound — same rule
 * as the live mandi ranking: the numbers are recomputed from what the server
 * sent, never stored a second time where the two copies could drift.
 */

/** Statuses that take a request off the live board — it is history now. */
export const DONE_STATUSES = ['delivered', 'cancelled'];

export const isDelivered = (request) => request?.status === 'delivered';
export const isFinished = (request) => DONE_STATUSES.includes(request?.status);

/**
 * When the lot actually landed, read from the timeline both sides share.
 * Falls back to the assignment time, then the raise time, then null — so a
 * record with a thin timeline still dates itself rather than showing nothing.
 */
export const deliveredAt = (request) => {
  const entry = request?.timeline?.find((e) => e.status === 'delivered');
  return entry?.at || request?.assignedAt || request?.createdAt || null;
};

/**
 * What the trip was worth to the farmer: the agreed rate on the lot, less the
 * freight the fleet owner actually charged to slot it into a route.
 *
 * `gross` is null when no rate was ever recorded — an honest blank beats a
 * zero that reads as "you earned nothing".
 */
export const tripEconomics = (request) => {
  const rate = request?.agreedRatePerKg;
  const qty = request?.quantityKg || 0;
  const gross = rate != null ? rate * qty : null;
  const freight = request?.dispatch?.addedFreightCost || 0;
  const takeHome = gross != null ? gross - freight : null;
  return { gross, freight, takeHome, hasRate: gross != null };
};

/** Farmer: fold every delivered request into one season strip. */
export const farmerSeasonTotals = (requests = []) =>
  requests.filter(isDelivered).reduce(
    (acc, r) => {
      const { gross, freight, takeHome } = tripEconomics(r);
      acc.trips += 1;
      acc.kg += r.quantityKg || 0;
      acc.gross += gross || 0;
      acc.freight += freight || 0;
      acc.takeHome += takeHome || 0;
      return acc;
    },
    { trips: 0, kg: 0, gross: 0, freight: 0, takeHome: 0 }
  );

/** Fleet owner: what the completed jobs added up to. */
export const fleetJobTotals = (jobs = []) =>
  jobs.filter(isDelivered).reduce(
    (acc, j) => {
      acc.jobs += 1;
      acc.kg += j.quantityKg || 0;
      acc.addedKm += j.dispatch?.insertionCostKm || 0;
      acc.freightEarned += j.dispatch?.addedFreightCost || 0;
      return acc;
    },
    { jobs: 0, kg: 0, addedKm: 0, freightEarned: 0 }
  );

/** Buyer: the produce that has actually arrived, and what it cost. */
export const buyerProcurementTotals = (shipments = []) =>
  shipments.filter(isDelivered).reduce(
    (acc, s) => {
      acc.lots += 1;
      acc.kg += s.quantityKg || 0;
      acc.spend += s.agreedRatePerKg != null ? s.agreedRatePerKg * (s.quantityKg || 0) : 0;
      return acc;
    },
    { lots: 0, kg: 0, spend: 0 }
  );
