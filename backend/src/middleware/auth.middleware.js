export const validateDeviceId = (req, res, next) => {
  const deviceId = req.headers["x-device-id"];

  if (!deviceId) {
    return res.status(401).json({ error: "Unauthorized: Missing device ID" });
  }

  // Basic validation: ensure it's not too short or too long
  if (deviceId.length < 10 || deviceId.length > 255) {
    return res.status(400).json({ error: "Invalid device ID format" });
  }

  // For future: this can be easily upgraded to JWT verification
  // req.user = { id: deviceId };

  next();
};
