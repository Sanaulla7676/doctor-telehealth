# Cashfree Payments Integration

## Required Render environment variables

```env
CASHFREE_ENVIRONMENT=sandbox
CASHFREE_API_BASE=https://sandbox.cashfree.com/pg
CASHFREE_CLIENT_ID=your_cashfree_sandbox_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_sandbox_client_secret
PUBLIC_SITE_URL=https://www.drvarshabandi.com
BACKEND_PUBLIC_URL=https://doctor-telehealth.onrender.com
```

For production, change `CASHFREE_ENVIRONMENT` to `production` and use the production Cashfree API base and production credentials.

## Flow

1. Patient submits an appointment.
2. Backend stores the appointment as `Unpaid`.
3. Frontend creates a Cashfree order through `/api/payments/create-order`.
4. Cashfree Checkout opens using the returned `paymentSessionId`.
5. Cashfree webhook and the authenticated verification endpoint confirm successful payment and matching amount.
6. The backend updates `appointments.payment_status` to `Paid` and emits `appointment_updated` through Socket.IO.
7. Doctor `Confirm` is rejected by the API until `payment_status = Paid`.
8. Doctor `Join Video` is rejected until the appointment is confirmed and payment is verified.

Do not put Cashfree client secrets in frontend code. The browser only receives the payment session ID.
