const API_URL = import.meta.env.VITE_API_URL;

const getDeviceId = () =>
  localStorage.getItem("device_id") ??
  (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
    return id;
  })();

const headers = () => ({
  "Content-Type": "application/json",
  "x-device-id": getDeviceId(),
});

export const fetchReceipts = () =>
  fetch(`${API_URL}/api/receipts`, { headers: headers() }).then((r) =>
    r.json(),
  );

export const fetchReceiptById = (id) =>
  fetch(`${API_URL}/api/receipts/${id}`, { headers: headers() }).then((r) =>
    r.json(),
  );

export const createReceipt = (data) =>
  fetch(`${API_URL}/api/receipts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateReceipt = (id, data) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteReceipt = (id) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "DELETE",
    headers: headers(),
  }).then((r) => r.json());
