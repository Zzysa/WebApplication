const { validationResult } = require("express-validator");

let prisma;
if (process.env.NODE_ENV === 'test') {
  const { PrismaClient } = require("../prisma/generated/test-client");
  prisma = new PrismaClient();
} else {
  const { PrismaClient } = require("../prisma/generated/prisma");
  prisma = new PrismaClient();
}

const processPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { orderId, amount, method } = req.body;

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const mockTransactionId = `txn_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const gatewayResponse = JSON.stringify({ 
      gateway: "mock_payment_gateway", 
      status: "success" 
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: orderId,
        amount: amount,
        method: method,
        status: "completed",
        transactionId: mockTransactionId,
        gatewayResponse: gatewayResponse,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "completed",
        transactionId: mockTransactionId,
        status: "processing",
      },
    });

    const responsePayment = {
      ...payment,
      gatewayResponse: JSON.parse(payment.gatewayResponse || '{}')
    };

    res.status(201).json(responsePayment);
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  processPayment,
};