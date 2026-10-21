export default function deviceAuth(req, res, next) {
  const deviceId = req.get('x-device-id');

  // Basic format validation, not full authentication.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!deviceId || !uuidPattern.test(deviceId)) {
    return res.status(401).json({
      message: 'Valid device ID required'
    });
  }

  req.deviceId = deviceId;
  next();
}
