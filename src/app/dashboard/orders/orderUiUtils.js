export function getOrderStatusColorClass(status) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    "out-for-delivery": "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function getOrderPaymentStatusColorClass(status) {
  const colors = {
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}
