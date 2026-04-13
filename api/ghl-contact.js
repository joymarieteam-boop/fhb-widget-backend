export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, identity, answer } = req.body || {};

    const API_KEY = process.env.GHL_API_KEY;
    const LOCATION_ID = process.env.GHL_LOCATION_ID;

    if (!API_KEY || !LOCATION_ID) {
      return res.status(500).json({ error: "Missing server environment variables." });
    }

    if (type === "identity") {
      if (!identity?.fullName || !identity?.email || !identity?.phone) {
        return res.status(400).json({ error: "Missing required identity fields." });
      }

      const [firstName, ...rest] = String(identity.fullName).trim().split(/\s+/);
      const lastName = rest.join(" ");

      const payload = {
        locationId: LOCATION_ID,
        firstName,
        lastName,
        name: identity.fullName,
        email: identity.email,
        phone: identity.phone,
        tags: ["fhb-widget-started"]
      };

      const ghlRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Version": "2021-07-28"
        },
        body: JSON.stringify(payload)
      });

      const data = await ghlRes.json().catch(() => ({}));

      if (!ghlRes.ok) {
        return res.status(400).json({
          error: data?.message || data?.error || "GHL identity upsert failed.",
          details: data
        });
      }

      const returnedContactId =
        data?.contact?.id ||
        data?.id ||
        data?.contactId ||
        null;

      return res.status(200).json({
        success: true,
        contactId: returnedContactId,
        data
      });
    }

    if (type === "answer") {
      if (!answer?.contactId) {
        return res.status(400).json({ error: "Missing contactId." });
      }

      if (!answer?.fieldName || !String(answer?.value || "").trim()) {
        return res.status(400).json({ error: "Missing answer field or value." });
      }

      const fieldMap = {
        move_reason: process.env.GHL_CF_MOVE_REASON,
        timeline: process.env.GHL_CF_TIMELINE,
        comfort_price_range: process.env.GHL_CF_COMFORT_PRICE_RANGE,
        financing_status: process.env.GHL_CF_FINANCING_STATUS,
        decision_readiness: process.env.GHL_CF_DECISION_READINESS
      };

      const mappedField = fieldMap[answer.fieldName];

      if (!mappedField) {
        return res.status(400).json({ error: `Missing custom field mapping for ${answer.fieldName}` });
      }

      const updatePayload = {
        customFields: [
          {
            key: mappedField,
            field_value: String(answer.value).trim()
          }
        ]
      };

      const ghlRes = await fetch(`https://services.leadconnectorhq.com/contacts/${answer.contactId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Version": "2021-07-28"
        },
        body: JSON.stringify(updatePayload)
      });

      const data = await ghlRes.json().catch(() => ({}));

      if (!ghlRes.ok) {
        return res.status(400).json({
          error: data?.message || data?.error || "GHL answer update failed.",
          details: data
        });
      }

      return res.status(200).json({
        success: true,
        data
      });
    }

    return res.status(400).json({ error: "Invalid request type." });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Server error."
    });
  }
}
