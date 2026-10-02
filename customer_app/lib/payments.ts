
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiPost } from "./api-client";
import type { CreateRideRequest } from "./ride-request";

// Rust prices the request, initialises the Korapay charge (the secret key
// stays on the server) and returns the checkout page. Korapay redirects to
// redirect_url when done, which closes the browser session.
type KorapayCheckout = {
  checkout_url: string;
  reference: string;
};

export async function payWithKorapay(
  request: Omit<CreateRideRequest, "payment_reference">,
): Promise<
  | { status: "paid"; reference: string }
  | { status: "cancelled" }
  | { status: "error"; error: string }
> {
  // Set once Rust has created the awaiting_payment order for this checkout
  let reference: string | null = null;

  try {
    const redirect_url = Linking.createURL("payment-complete");
    const checkout = await apiPost<KorapayCheckout>(
      "/payments/korapay/initialize",
      { ...request, redirect_url },
    );
    if (!checkout) throw new Error("Payment couldn't be started. Please try again.");
    reference = checkout.reference;

    const result = await WebBrowser.openAuthSessionAsync(
      checkout.checkout_url,
      redirect_url,
    );
    if (result.type !== "success") {
      // The customer may have paid and closed the browser before the
      // redirect, so let Rust check the charge before cancelling
      return (await cancelUnpaidOrder(reference)) === "paid"
        ? { status: "paid", reference }
        : { status: "cancelled" };
    }

    // Rust verifies the charge against this reference before the order
    // moves on to pending
    return { status: "paid", reference };
  } catch (err: any) {
    console.error("❌ Korapay checkout failed:", err);
    if (reference) await cancelUnpaidOrder(reference);
    return { status: "error", error: err?.message ?? "Payment failed" };
  }
}

// Rust asks Korapay about the charge: paid → the order carries on as
// normal; otherwise the awaiting_payment order is marked cancelled.
async function cancelUnpaidOrder(
  reference: string,
): Promise<"paid" | "cancelled"> {
  try {
    const result = await apiPost<{ status: "paid" | "cancelled" }>(
      "/payments/korapay/cancel",
      { reference },
    );
    return result?.status === "paid" ? "paid" : "cancelled";
  } catch (err) {
    // Rust's sweep of stale awaiting_payment orders picks this one up
    console.error("❌ Couldn't cancel unpaid order:", err);
    return "cancelled";
  }
}

// Cancelling after payment. Rust decides what's refunded: all of it while
// no rider has accepted, nothing once one has; after pickup it also opens a
// return (app_returned) so the rider brings the package back. App orders
// are named by their Korapay reference, which exists even when ride-request
// failed before returning an order id. Telegram orders pay differently and
// never cancel through here.
export type CancelOrderResult = {
  // naira; 0 when no refund is due, null when Rust's reply didn't say
  refund_amount: number | null;
};

export async function cancelPaidOrder(
  paymentReference: string,
): Promise<{ data: CancelOrderResult | null; error: string | null }> {
  try {
    const data = await apiPost<CancelOrderResult>("/orders/cancel", {
      payment_reference: paymentReference,
    });
    // A 2xx means the cancel went through even if the body was empty
    return { data: { refund_amount: data?.refund_amount ?? null }, error: null };
  } catch (err: any) {
    console.error("❌ Couldn't cancel order:", err);
    return { data: null, error: err?.message ?? "Couldn't cancel the order" };
  }
}
