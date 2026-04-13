else if (type === "answer") {
  if (!contactId) {
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

  const mappedKey = fieldMap[answer.fieldName];

  if (!mappedKey) {
    return res.status(400).json({
      error: `No mapping for ${answer.fieldName}`
    });
  }

  const updatePayload = {
    customFields: [
      {
        key: mappedKey,
        value: String(answer.value).trim() // ⚠️ IMPORTANT: value NOT field_value
      }
    ]
  };

  console.log("Updating contact:", contactId);
  console.log("Payload:", updatePayload);

  const ghlRes = await fetch(
    `https://services.leadconnectorhq.com/contacts/${contactId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: "2021-07-28"
      },
      body: JSON.stringify(updatePayload)
    }
  );

  const data = await ghlRes.json().catch(() => ({}));

  console.log("GHL response:", data);

  if (!ghlRes.ok) {
    return res.status(400).json({
      error: "Failed updating contact",
      details: data
    });
  }

  return res.status(200).json({
    success: true
  });
}
