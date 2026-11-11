const refundStatusMap: Record<string, string> = {
  completed: "已完成",
  procesado: "已完成",
  refunded: "已完成",
  requested: "处理中",
  pending: "处理中",
  pendiente: "处理中",
  failed: "失败",
  rechazado: "已拒绝",
  canceled: "已取消",
  cancelado: "已取消",
};

const returnStatusMap: Record<string, string> = {
  "solicitud de devolución": "退货申请",
  "en revisión": "审核中",
  aprobada: "已批准",
  rechazada: "已拒绝",
  recibida: "已收到",
  cerrada: "已关闭",
};

const messageStatusMap: Record<string, string> = {
  nuevo: "新消息",
  "en proceso": "处理中",
  resuelto: "已解决",
};

const orderStatusMap: Record<string, string> = {
  pendiente: "待处理",
  procesando: "处理中",
  enviado: "已发货",
  entregado: "已送达",
  cancelado: "已取消",
};

const paymentStatusMap: Record<string, string> = {
  pagado: "已支付",
  pendiente: "待支付",
};

const stockStatusMap: Record<string, string> = {
  agotado: "已售罄",
  "pocas unidades": "库存不足",
  "en stock": "有库存",
};

function lookup(map: Record<string, string>, status: string | null | undefined, fallback: string) {
  if (!status) return fallback;
  const normalized = status.trim().toLowerCase();
  return map[normalized] ?? status;
}

export function refundStatusLabel(status: string | null | undefined): string {
  return lookup(refundStatusMap, status, "待处理");
}

export function returnStatusLabel(status: string | null | undefined): string {
  return lookup(returnStatusMap, status, "审核中");
}

export function messageStatusLabel(status: string | null | undefined): string {
  return lookup(messageStatusMap, status, "新消息");
}

export function orderStatusLabel(status: string | null | undefined): string {
  return lookup(orderStatusMap, status, "待处理");
}

export function paymentStatusLabel(status: string | null | undefined): string {
  return lookup(paymentStatusMap, status, "待支付");
}

export function stockStatusLabel(status: string | null | undefined): string {
  return lookup(stockStatusMap, status, "-");
}
