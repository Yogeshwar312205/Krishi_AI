/**
 * The one handle on Socket.io that the REST side is allowed to hold.
 *
 * A position report arrives as an authenticated PATCH from the cab (see
 * fleetController.reportLocation), gets written to the vehicle, and only then
 * goes out to the watchers. Broadcasting from the controller rather than from a
 * socket event is what makes tracking trustworthy: the socket layer has no
 * authentication at all, so a client that could emit its own
 * `vehicle:location_changed` could move somebody else's truck across a farmer's
 * map. The REST route already proves ownership before it writes.
 *
 * Silent no-op before init, so nothing has to know whether sockets came up.
 */
let io = null;

const setIo = (instance) => { io = instance; };

const broadcast = (event, payload) => {
  if (io) io.emit(event, payload);
};

module.exports = { setIo, broadcast };
