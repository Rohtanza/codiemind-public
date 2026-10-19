const { getIt } = require("@/di/container");

function createOrderHandler() {
  const orders = getIt.get("OrderRepository");
  const mailer = getIt.get("Mailer");
  return async (req, res) => {
    const order = await orders.create(req.body);
    await mailer.send(order.email, "Order received");
    res.json(order);
  };
}

module.exports = { createOrderHandler };
