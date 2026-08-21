const PickupRequest = require('../models/PickupRequest');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

/**
 * Farmer pickup requests — the demand side of the dispatch problem.
 *
 * Everything here is persisted and owner-scoped. There is no seeded fallback:
 * a fleet owner looking at an empty queue must be looking at an empty queue,
 * not at sample rows they might dispatch a real truck against.
 */

const hasCoords = (c) => Array.isArray(c) && c.length === 2
  && Number.isFinite(c[0]) && Number.isFinite(c[1]);

const publicRequest = (doc) => ({
  id: String(doc._id),
  farmerName: doc.farmerName,
  farmerPhone: doc.farmerPhone,
  cropType: doc.cropType,
  quantityKg: doc.quantityKg,
  origin: doc.origin,
  destination: doc.destination,
  agreedRatePerKg: doc.agreedRatePerKg,
  pickupDate: doc.pickupDate,
  window: doc.window,
  status: doc.status,
  assignedAt: doc.assignedAt,
  dispatch: doc.dispatch,
  timeline: doc.timeline,
  createdAt: doc.createdAt,
  vehicle: doc.assignedVehicle && doc.assignedVehicle.vehicleNo
    ? {
        id: String(doc.assignedVehicle._id),
        vehicleNo: doc.assignedVehicle.vehicleNo,
        vehicleType: doc.assignedVehicle.vehicleType,
        driverName: doc.assignedVehicle.driverName,
        driverPhone: doc.assignedVehicle.driverPhone,
        isRefrigerated: doc.assignedVehicle.isRefrigerated,
        coordinates: doc.assignedVehicle.location?.coordinates || null,
        locationUpdatedAt: doc.assignedVehicle.locationUpdatedAt,
      }
    : null,
});

// POST /api/requests — a farmer raises one
const createRequest = async (req, res) => {
  try {
    const {
      cropType, quantityKg, origin, destination,
      agreedRatePerKg, pickupDate, window,
    } = req.body || {};

    if (!cropType || !Number(quantityKg)) {
      return res.status(400).json({ success: false, message: 'Crop and quantity are required.' });
    }
    // A request without both coordinates cannot be ranked, and we will not
    // invent one. Refuse at the door rather than store something undispatchable.
    if (!origin?.label || !hasCoords(origin?.coordinates)) {
      return res.status(400).json({ success: false, message: 'Farm location is required.' });
    }
    if (!destination?.label || !hasCoords(destination?.coordinates)) {
      return res.status(400).json({ success: false, message: 'Mandi location is required.' });
    }

    const doc = await PickupRequest.create({
      farmer: req.user._id,
      farmerName: req.user.name,
      farmerPhone: req.user.phone || '',
      cropType,
      quantityKg: Number(quantityKg),
      origin,
      destination,
      agreedRatePerKg: agreedRatePerKg ?? null,
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
      window: window || {},
      status: 'pending',
      timeline: [{ status: 'pending', note: 'Request raised' }],
    });

    return res.status(201).json({ success: true, request: publicRequest(doc) });
  } catch (error) {
    logger.error(`Create pickup request failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not raise the request. Try again shortly.' });
  }
};

// GET /api/requests/mine — the farmer's own
const myRequests = async (req, res) => {
  try {
    const docs = await PickupRequest.find({ farmer: req.user._id })
      .populate('assignedVehicle')
      .sort({ createdAt: -1 });
    return res.json({ success: true, count: docs.length, requests: docs.map(publicRequest) });
  } catch (error) {
    logger.error(`My requests failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load your requests.' });
  }
};

/*
 * GET /api/requests/queue — what a fleet owner may act on.
 *
 * Every pending request in the system, plus the ones this owner has already
 * taken. Pending requests are deliberately NOT scoped to one owner: the whole
 * point is that several fleets can compete for the same lot, and the first to
 * approve gets it.
 */
const dispatchQueue = async (req, res) => {
  try {
    const [pending, mine] = await Promise.all([
      PickupRequest.find({ status: 'pending' }).sort({ createdAt: -1 }),
      PickupRequest.find({ assignedOwner: req.user._id, status: { $ne: 'pending' } })
        .populate('assignedVehicle')
        .sort({ assignedAt: -1 }),
    ]);
    return res.json({
      success: true,
      pending: pending.map(publicRequest),
      assigned: mine.map(publicRequest),
    });
  } catch (error) {
    logger.error(`Dispatch queue failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load the queue.' });
  }
};

/*
 * POST /api/requests/:id/assign — the fleet owner approves a suggestion.
 *
 * The route written is the exact sequence the suggestion card displayed
 * (`proposedRoute`), never a recomputation: recomputing here would let the
 * committed route drift from the one the owner actually approved.
 *
 * `currentLoadKg` is NOT increased. It is what is on the deck before the route
 * runs; the new lot is represented by the pickup stop's +loadDeltaKg. Adding it
 * in both places counts the same weight twice and pushes the truck past a
 * capacity the engine had just certified.
 */
const assignRequest = async (req, res) => {
  try {
    const { vehicleId, proposedRoute, dispatch } = req.body || {};

    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: req.user._id });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'That vehicle is not in your fleet.' });
    }

    // Only claim a request nobody else has taken. Two owners approving the same
    // lot at the same moment must not both get it.
    const request = await PickupRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        status: 'assigned',
        assignedVehicle: vehicle._id,
        assignedOwner: req.user._id,
        assignedAt: new Date(),
        dispatch: dispatch || {},
        $push: { timeline: { status: 'assigned', note: `Assigned to ${vehicle.vehicleNo}` } },
      },
      { new: true }
    ).populate('assignedVehicle');

    if (!request) {
      return res.status(409).json({ success: false, message: 'Another fleet has already taken this request.' });
    }

    if (Array.isArray(proposedRoute) && proposedRoute.length) {
      vehicle.currentRoute = proposedRoute.map((stop) => ({
        kind: stop.kind,
        label: stop.label,
        coordinates: stop.coordinates,
        loadDeltaKg: stop.loadDeltaKg || 0,
        requestId: stop.requestId && String(stop.requestId).match(/^[0-9a-f]{24}$/i)
          ? stop.requestId
          : null,
      }));
    }
    if (vehicle.status === 'Idle') vehicle.status = 'Loading';
    await vehicle.save();

    return res.json({ success: true, request: publicRequest(request) });
  } catch (error) {
    logger.error(`Assign request failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not assign the request.' });
  }
};

const NEXT_STATUS = ['collected', 'in_transit', 'delivered', 'cancelled'];

// POST /api/requests/:id/status — the fleet owner moves a job along
const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!NEXT_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: 'Unknown status.' });
    }

    const request = await PickupRequest.findOneAndUpdate(
      { _id: req.params.id, assignedOwner: req.user._id },
      { status, $push: { timeline: { status, note: note || '' } } },
      { new: true }
    ).populate('assignedVehicle');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Not one of your jobs.' });
    }

    /*
     * A delivered lot frees the truck: drop its stops and let it be dispatched
     * again. If that empties the route back to the depot the vehicle is idle —
     * leaving it 'Loading' with nothing to load reads, on the fleet screen, as
     * a truck that is busy when it is standing free.
     */
    if (status === 'delivered' || status === 'cancelled') {
      const vehicle = await Vehicle.findOne({
        _id: request.assignedVehicle?._id, owner: req.user._id,
      });
      if (vehicle) {
        vehicle.currentRoute = vehicle.currentRoute.filter(
          (stop) => String(stop.requestId) !== String(request._id)
        );
        const stillWorking = vehicle.currentRoute.some((stop) => stop.kind !== 'depot');
        if (!stillWorking && vehicle.status !== 'Unavailable') vehicle.status = 'Idle';
        await vehicle.save();
      }
    }

    return res.json({ success: true, request: publicRequest(request) });
  } catch (error) {
    logger.error(`Update request status failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not update the job.' });
  }
};

// POST /api/requests/:id/cancel — the farmer withdraws one nobody has taken
const cancelRequest = async (req, res) => {
  try {
    const request = await PickupRequest.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id, status: 'pending' },
      { status: 'cancelled', $push: { timeline: { status: 'cancelled', note: 'Withdrawn by farmer' } } },
      { new: true }
    );
    if (!request) {
      return res.status(409).json({ success: false, message: 'Too late — a fleet has already taken this.' });
    }
    return res.json({ success: true, request: publicRequest(request) });
  } catch (error) {
    logger.error(`Cancel request failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not cancel the request.' });
  }
};

module.exports = {
  createRequest, myRequests, dispatchQueue, assignRequest, updateStatus, cancelRequest, publicRequest,
};
